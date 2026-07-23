import type { SubscriptionTier } from '../subscription/schema.js';
import { meetsTierMinimum } from '../subscription/expiry.js';
import { computeCompletionPercent } from '../session/progress.js';

/** Flow Part 3 — "Access dripped content" is ✗ on trial, ✓ from Basic. */
export const DRIP_ACCESS_MIN_TIER: SubscriptionTier = 'basic';

export function canAccessDrippedContent(tier: SubscriptionTier | null | undefined): boolean {
  if (!tier) return false;
  return meetsTierMinimum(tier, DRIP_ACCESS_MIN_TIER);
}

/** One drip_progress row for the viewer's purchase (STORY-10.3). */
export type DripProgressRow = {
  moduleId: string;
  scheduledUnlockAt: string | null;
  unlockedAt: string | null;
  completedAt: string | null;
};

/**
 * AC-3 — locked modules show either an unlock date (drip lock) or the
 * tier requirement when the viewer has no drip access at all (trial).
 */
export type ModuleLockState =
  | { kind: 'unlocked' }
  | { kind: 'locked_until'; unlockAt: string | null }
  | { kind: 'tier_required'; requiredTier: SubscriptionTier };

export function resolveModuleLockState(
  row: Pick<DripProgressRow, 'unlockedAt' | 'scheduledUnlockAt'>,
  options: { hasDripAccess: boolean },
): ModuleLockState {
  if (!options.hasDripAccess) {
    return { kind: 'tier_required', requiredTier: DRIP_ACCESS_MIN_TIER };
  }
  if (row.unlockedAt) {
    return { kind: 'unlocked' };
  }
  return { kind: 'locked_until', unlockAt: row.scheduledUnlockAt };
}

export type PackageDripModuleView = {
  moduleId: string;
  moduleIndex: number;
  lock: ModuleLockState;
  completed: boolean;
  completedAt: string | null;
};

export type PackageDripProgressView = {
  totalModules: number;
  unlockedModules: number;
  completedModules: number;
  /** AC-2 — completed modules vs total (0–100). */
  completionPercent: number;
  /** AC-1 — earliest still-locked scheduled unlock, or null when fully unlocked. */
  nextUnlockAt: string | null;
  allUnlocked: boolean;
  allCompleted: boolean;
  modules: PackageDripModuleView[];
};

function sortByScheduleThenId(a: DripProgressRow, b: DripProgressRow): number {
  const at = a.scheduledUnlockAt ? new Date(a.scheduledUnlockAt).getTime() : 0;
  const bt = b.scheduledUnlockAt ? new Date(b.scheduledUnlockAt).getTime() : 0;
  if (at !== bt) return at - bt;
  return a.moduleId.localeCompare(b.moduleId);
}

/**
 * Build the owned-package drip view (STORY-10.3 AC-1..AC-3) from the
 * viewer's drip_progress rows. Modules order by scheduled unlock time.
 */
export function buildPackageDripProgressView(
  rows: readonly DripProgressRow[],
  options: { hasDripAccess: boolean },
): PackageDripProgressView {
  const ordered = [...rows].sort(sortByScheduleThenId);

  const modules: PackageDripModuleView[] = ordered.map((row, index) => ({
    moduleId: row.moduleId,
    moduleIndex: index,
    lock: resolveModuleLockState(row, options),
    completed: Boolean(row.completedAt),
    completedAt: row.completedAt,
  }));

  const totalModules = modules.length;
  const unlockedModules = modules.filter((m) => m.lock.kind === 'unlocked').length;
  const completedModules = modules.filter((m) => m.completed).length;

  let nextUnlockAt: string | null = null;
  for (const module of modules) {
    if (module.lock.kind === 'locked_until' && module.lock.unlockAt) {
      nextUnlockAt = module.lock.unlockAt;
      break;
    }
  }

  return {
    totalModules,
    unlockedModules,
    completedModules,
    completionPercent: computeCompletionPercent(completedModules, totalModules),
    nextUnlockAt,
    allUnlocked: totalModules > 0 && unlockedModules === totalModules,
    allCompleted: totalModules > 0 && completedModules === totalModules,
    modules,
  };
}

/** Raw per-player drip rows for a team purchase (coach view, AC-4). */
export type TeamMemberDripRow = {
  profileId: string;
  displayName: string | null;
  moduleId: string;
  unlockedAt: string | null;
  completedAt: string | null;
};

export type TeamMemberPackageCompletion = {
  profileId: string;
  displayName: string | null;
  totalModules: number;
  completedModules: number;
  completionPercent: number;
};

/**
 * AC-4 — aggregate team-purchase drip rows into per-player completion
 * summaries for the purchasing coach, sorted by name then id.
 */
export function summarizeTeamPackageCompletions(
  rows: readonly TeamMemberDripRow[],
): TeamMemberPackageCompletion[] {
  const byProfile = new Map<string, TeamMemberPackageCompletion>();

  for (const row of rows) {
    let entry = byProfile.get(row.profileId);
    if (!entry) {
      entry = {
        profileId: row.profileId,
        displayName: row.displayName,
        totalModules: 0,
        completedModules: 0,
        completionPercent: 0,
      };
      byProfile.set(row.profileId, entry);
    }
    if (!entry.displayName && row.displayName) {
      entry.displayName = row.displayName;
    }
    entry.totalModules += 1;
    if (row.completedAt) {
      entry.completedModules += 1;
    }
  }

  const summaries = Array.from(byProfile.values());
  for (const summary of summaries) {
    summary.completionPercent = computeCompletionPercent(
      summary.completedModules,
      summary.totalModules,
    );
  }

  return summaries.sort((a, b) => {
    const an = a.displayName ?? '';
    const bn = b.displayName ?? '';
    if (an !== bn) return an.localeCompare(bn);
    return a.profileId.localeCompare(b.profileId);
  });
}

/** Human label for a locked module row (unlock date or tier requirement). */
export function moduleLockLabel(lock: ModuleLockState): string | null {
  if (lock.kind === 'unlocked') return null;
  if (lock.kind === 'tier_required') {
    const tier = lock.requiredTier;
    return `Requires ${tier.charAt(0).toUpperCase()}${tier.slice(1)} plan`;
  }
  if (!lock.unlockAt) return 'Locked';
  const date = new Date(lock.unlockAt);
  if (Number.isNaN(date.getTime())) return 'Locked';
  return `Unlocks ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}
