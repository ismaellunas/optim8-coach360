import type { SubscriptionTier } from '../subscription/schema.js';
import { meetsTierMinimum } from '../subscription/expiry.js';

/** Default when package omits dripSchedule.intervalDays (weekly). */
export const DEFAULT_DRIP_INTERVAL_DAYS = 7;

/** Flow 14 — first drip unit (e.g. lessons 1–4) unlocks on purchase. */
export const INITIAL_UNLOCK_MODULE_COUNT = 1;

/** platform_settings key for admin global drip cadence per paid tier (STORY-12.3 AC-4). */
export const DRIP_INTERVAL_BY_TIER_SETTING_KEY = 'drip_interval_days_by_tier';

export type DripIntervalByTier = {
  basic: number;
  advanced: number;
  pro: number;
};

/** Defaults equal across tiers — preserves OQ-14.3 until admin differentiates. */
export const DEFAULT_DRIP_INTERVAL_BY_TIER: DripIntervalByTier = {
  basic: DEFAULT_DRIP_INTERVAL_DAYS,
  advanced: DEFAULT_DRIP_INTERVAL_DAYS,
  pro: DEFAULT_DRIP_INTERVAL_DAYS,
};

/**
 * OQ-14.1 — coach Pro configures drip per package (Sanity dripSchedule).
 * Admin global rules are STORY-12.3 (platform_settings drip_interval_days_by_tier).
 */
export function canConfigureDripSchedule(
  role: string | null | undefined,
  tier: SubscriptionTier | null | undefined,
): boolean {
  if (role !== 'coach' || !tier) return false;
  return meetsTierMinimum(tier, 'pro');
}

/** OQ-14.2 — weekly/biweekly/custom via any positive integer days. */
export function normalizeDripIntervalDays(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_DRIP_INTERVAL_DAYS;
  }
  return Math.floor(value);
}

export function normalizeDripIntervalByTier(raw: unknown): DripIntervalByTier {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    basic: normalizeDripIntervalDays(source.basic ?? DEFAULT_DRIP_INTERVAL_BY_TIER.basic),
    advanced: normalizeDripIntervalDays(source.advanced ?? DEFAULT_DRIP_INTERVAL_BY_TIER.advanced),
    pro: normalizeDripIntervalDays(source.pro ?? DEFAULT_DRIP_INTERVAL_BY_TIER.pro),
  };
}

function tierKey(tier: SubscriptionTier | string | null | undefined): keyof DripIntervalByTier | null {
  if (tier === 'basic' || tier === 'advanced' || tier === 'pro') return tier;
  return null;
}

/**
 * Resolve drip cadence for a purchase.
 * 1. Package `dripSchedule.intervalDays` wins when set (OQ-14.1 coach Pro).
 * 2. Else admin global rule for the buyer's paid tier (STORY-12.3 AC-4).
 * 3. Else DEFAULT_DRIP_INTERVAL_DAYS (7).
 *
 * OQ-14.3 — no tier acceleration by default: DEFAULT_DRIP_INTERVAL_BY_TIER keeps
 * all paid tiers equal until an admin deliberately differentiates them.
 */
export function effectiveDripIntervalDays(
  tier: SubscriptionTier | string | null | undefined,
  intervalDays: number | null | undefined,
  globalRules?: DripIntervalByTier | null,
): number {
  if (intervalDays != null && Number.isFinite(Number(intervalDays)) && Number(intervalDays) >= 1) {
    return normalizeDripIntervalDays(intervalDays);
  }
  const key = tierKey(tier);
  if (key && globalRules) {
    return normalizeDripIntervalDays(globalRules[key]);
  }
  return DEFAULT_DRIP_INTERVAL_DAYS;
}

export type DripModuleUnlockPlan = {
  moduleId: string;
  moduleIndex: number;
  /** ISO timestamp when this module becomes available. */
  unlockAt: string;
  unlocksImmediately: boolean;
};

/**
 * Build unlock timeline for a purchase.
 * Module index 0 unlocks at purchase; later modules at purchasedAt + n * intervalDays.
 */
export function buildDripUnlockSchedule(options: {
  moduleIds: readonly string[];
  purchasedAt: Date | string;
  intervalDays: number | null | undefined;
  tier?: SubscriptionTier | string | null;
  globalRules?: DripIntervalByTier | null;
  initialUnlockCount?: number;
}): DripModuleUnlockPlan[] {
  const purchasedAt =
    typeof options.purchasedAt === 'string' ? new Date(options.purchasedAt) : options.purchasedAt;
  const intervalDays = effectiveDripIntervalDays(
    options.tier,
    options.intervalDays,
    options.globalRules,
  );
  const initialCount = Math.max(
    1,
    Math.floor(options.initialUnlockCount ?? INITIAL_UNLOCK_MODULE_COUNT),
  );
  const msPerDay = 24 * 60 * 60 * 1000;

  return options.moduleIds.map((moduleId, index) => {
    const unlocksImmediately = index < initialCount;
    const stepsAfterInitial = unlocksImmediately ? 0 : index - initialCount + 1;
    const unlockAt = new Date(purchasedAt.getTime() + stepsAfterInitial * intervalDays * msPerDay);
    return {
      moduleId,
      moduleIndex: index,
      unlockAt: unlockAt.toISOString(),
      unlocksImmediately,
    };
  });
}

/**
 * OQ-14.5 — upgrade mid-drip does not change remaining unlock dates.
 * Returns the same schedule when package interval is set (tier/global ignored).
 */
export function rebuildDripScheduleAfterUpgrade(options: {
  moduleIds: readonly string[];
  purchasedAt: Date | string;
  intervalDays: number | null | undefined;
  previousTier: SubscriptionTier | string | null | undefined;
  newTier: SubscriptionTier | string | null | undefined;
  globalRules?: DripIntervalByTier | null;
}): { before: DripModuleUnlockPlan[]; after: DripModuleUnlockPlan[]; unchanged: boolean } {
  const before = buildDripUnlockSchedule({
    moduleIds: options.moduleIds,
    purchasedAt: options.purchasedAt,
    intervalDays: options.intervalDays,
    ...(options.previousTier !== undefined ? { tier: options.previousTier } : {}),
    ...(options.globalRules !== undefined ? { globalRules: options.globalRules } : {}),
  });
  const after = buildDripUnlockSchedule({
    moduleIds: options.moduleIds,
    purchasedAt: options.purchasedAt,
    intervalDays: options.intervalDays,
    ...(options.newTier !== undefined ? { tier: options.newTier } : {}),
    ...(options.globalRules !== undefined ? { globalRules: options.globalRules } : {}),
  });
  const unchanged =
    before.length === after.length &&
    before.every((row, i) => row.unlockAt === after[i]?.unlockAt && row.moduleId === after[i]?.moduleId);
  return { before, after, unchanged };
}

export type DripUnlockCandidate = {
  purchase_id: string;
  profile_id: string;
  module_id: string;
  scheduled_unlock_at: string;
  sanity_document_id?: string | null;
};

export type DripModuleUnlockedPayload = {
  purchaseId: string;
  profileId: string;
  moduleId: string;
  sanityDocumentId: string | null;
  event: 'drip_module_unlocked';
};

/**
 * Select modules whose scheduled unlock time has arrived and are not yet unlocked.
 * Skips the initial purchase unlock (caller should only pass still-locked rows).
 */
export function selectDueDripUnlocks(options: {
  candidates: readonly DripUnlockCandidate[];
  alreadyUnlockedKeys?: Iterable<string>;
  now?: Date;
}): { unlocked: DripModuleUnlockedPayload[]; skipped: number } {
  const unlockedKeys = new Set(options.alreadyUnlockedKeys ?? []);
  const now = options.now ?? new Date();
  const unlocked: DripModuleUnlockedPayload[] = [];
  let skipped = 0;

  for (const candidate of options.candidates) {
    const key = `${candidate.purchase_id}:${candidate.module_id}`;
    if (unlockedKeys.has(key) || !candidate.scheduled_unlock_at) {
      skipped += 1;
      continue;
    }
    const dueAt = new Date(candidate.scheduled_unlock_at);
    if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() > now.getTime()) {
      skipped += 1;
      continue;
    }
    unlocked.push({
      purchaseId: candidate.purchase_id,
      profileId: candidate.profile_id,
      moduleId: candidate.module_id,
      sanityDocumentId: candidate.sanity_document_id ?? null,
      event: 'drip_module_unlocked',
    });
    unlockedKeys.add(key);
  }

  return { unlocked, skipped };
}
