// STORY-10.3 — Drip progress and completion tracking.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildPackageDripProgressView,
  canAccessDrippedContent,
  computeCompletionPercent,
  moduleLockLabel,
  resolveModuleLockState,
  summarizeTeamPackageCompletions,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const MIGRATION = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260723160000_drip_progress_completion.sql',
);
const OWNED_PROGRESS_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'marketplace',
  'ui',
  'OwnedPackageProgress.jsx',
);
const TEAM_COMPLETION_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'marketplace',
  'ui',
  'TeamPackageCompletion.jsx',
);
const STORE_SCREEN = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'marketplace',
  'ui',
  'StoreScreen.jsx',
);
const PLAYER_CONTENT_SCREEN = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'content',
  'ui',
  'PlayerContentScreen.jsx',
);
const DRIP_PORT = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'marketplace-drip-repository.ts',
);
const SUPABASE_DRIP_ADAPTER = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-marketplace-drip-repository.ts',
);

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

/** Purchase on 2026-07-01, weekly cadence: mod-1 unlocked, others pending. */
const ROWS = [
  {
    moduleId: 'mod-lessons-1-4',
    scheduledUnlockAt: '2026-07-01T12:00:00.000Z',
    unlockedAt: '2026-07-01T12:00:00.000Z',
    completedAt: '2026-07-02T09:00:00.000Z',
  },
  {
    moduleId: 'mod-lessons-5-8',
    scheduledUnlockAt: '2026-07-08T12:00:00.000Z',
    unlockedAt: '2026-07-08T12:00:00.000Z',
    completedAt: null,
  },
  {
    moduleId: 'mod-lessons-9-12',
    scheduledUnlockAt: '2026-07-15T12:00:00.000Z',
    unlockedAt: null,
    completedAt: null,
  },
  {
    moduleId: 'mod-lessons-13-16',
    scheduledUnlockAt: '2026-07-22T12:00:00.000Z',
    unlockedAt: null,
    completedAt: null,
  },
];

describe('STORY_10_3 AC1 — Drip schedule and next unlock date visible on package detail', () => {
  it('test_STORY_10_3_AC1_drip_schedule_and_next_unlock_on_detail', () => {
    const view = buildPackageDripProgressView(ROWS, { hasDripAccess: true });

    // Next unlock = earliest still-locked module's scheduled time.
    expect(view.nextUnlockAt).toBe('2026-07-15T12:00:00.000Z');
    expect(view.allUnlocked).toBe(false);

    // Fully unlocked purchase has no next unlock.
    const unlockedAll = buildPackageDripProgressView(
      ROWS.map((row) => ({ ...row, unlockedAt: row.scheduledUnlockAt })),
      { hasDripAccess: true },
    );
    expect(unlockedAll.nextUnlockAt).toBeNull();
    expect(unlockedAll.allUnlocked).toBe(true);

    // Owned package detail renders schedule + next unlock on both screens.
    const ui = read(OWNED_PROGRESS_UI);
    expect(ui).toMatch(/package-drip-schedule/);
    expect(ui).toMatch(/package-next-unlock/);
    expect(ui).toMatch(/dripLabel/);

    expect(read(STORE_SCREEN)).toMatch(/OwnedPackageProgress/);
    expect(read(PLAYER_CONTENT_SCREEN)).toMatch(/OwnedPackageProgress/);
  });
});

describe('STORY_10_3 AC2 — Progress bar reflects completed lessons vs total', () => {
  it('test_STORY_10_3_AC2_progress_bar_completed_vs_total', () => {
    const view = buildPackageDripProgressView(ROWS, { hasDripAccess: true });

    expect(view.totalModules).toBe(4);
    expect(view.completedModules).toBe(1);
    expect(view.completionPercent).toBe(computeCompletionPercent(1, 4));
    expect(view.completionPercent).toBe(25);

    const done = buildPackageDripProgressView(
      ROWS.map((row) => ({
        ...row,
        unlockedAt: row.scheduledUnlockAt,
        completedAt: '2026-07-30T00:00:00.000Z',
      })),
      { hasDripAccess: true },
    );
    expect(done.completionPercent).toBe(100);
    expect(done.allCompleted).toBe(true);

    // Marking done goes through the owner-only completion RPC.
    expect(existsSync(MIGRATION)).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/mark_drip_module_completed/);
    expect(sql).toMatch(/unlocked_at is not null/);
    expect(sql).toMatch(/drip_module_locked/);

    const ui = read(OWNED_PROGRESS_UI);
    expect(ui).toMatch(/package-progress-bar/);
    expect(ui).toMatch(/completionPercent/);
    expect(ui).toMatch(/markModuleCompleted/);
  });
});

describe('STORY_10_3 AC3 — Locked modules show unlock date or tier requirement', () => {
  it('test_STORY_10_3_AC3_locked_modules_show_unlock_or_tier', () => {
    // Paid tiers access drip; trial does not (Part 3: dripped content ✗ trial).
    expect(canAccessDrippedContent('basic')).toBe(true);
    expect(canAccessDrippedContent('pro')).toBe(true);
    expect(canAccessDrippedContent('trial')).toBe(false);

    const lockedRow = { unlockedAt: null, scheduledUnlockAt: '2026-07-15T12:00:00.000Z' };

    const dripLock = resolveModuleLockState(lockedRow, { hasDripAccess: true });
    expect(dripLock).toEqual({ kind: 'locked_until', unlockAt: '2026-07-15T12:00:00.000Z' });
    expect(moduleLockLabel(dripLock)).toMatch(/^Unlocks /);

    const tierLock = resolveModuleLockState(lockedRow, { hasDripAccess: false });
    expect(tierLock).toEqual({ kind: 'tier_required', requiredTier: 'basic' });
    expect(moduleLockLabel(tierLock)).toBe('Requires Basic plan');

    const unlocked = resolveModuleLockState(
      { unlockedAt: '2026-07-08T12:00:00.000Z', scheduledUnlockAt: '2026-07-08T12:00:00.000Z' },
      { hasDripAccess: true },
    );
    expect(unlocked.kind).toBe('unlocked');
    expect(moduleLockLabel(unlocked)).toBeNull();

    const ui = read(OWNED_PROGRESS_UI);
    expect(ui).toMatch(/module-lock-label/);
    expect(ui).toMatch(/moduleLockLabel/);
  });
});

describe('STORY_10_3 AC4 — Completion data available to coach for team purchases', () => {
  it('test_STORY_10_3_AC4_coach_team_purchase_completion', () => {
    const summaries = summarizeTeamPackageCompletions([
      { profileId: 'p1', displayName: 'Ava', moduleId: 'm1', unlockedAt: 'x', completedAt: 'x' },
      { profileId: 'p1', displayName: 'Ava', moduleId: 'm2', unlockedAt: 'x', completedAt: null },
      { profileId: 'p2', displayName: 'Ben', moduleId: 'm1', unlockedAt: 'x', completedAt: 'x' },
      { profileId: 'p2', displayName: 'Ben', moduleId: 'm2', unlockedAt: 'x', completedAt: 'x' },
    ]);

    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toMatchObject({
      profileId: 'p1',
      displayName: 'Ava',
      totalModules: 2,
      completedModules: 1,
      completionPercent: 50,
    });
    expect(summaries[1]).toMatchObject({ profileId: 'p2', completionPercent: 100 });

    // Migration: team purchases seed roster players, buyer can read + summarize.
    const sql = read(MIGRATION);
    expect(sql).toMatch(/unique \(purchase_id, profile_id, module_id\)/);
    expect(sql).toMatch(/from public\.rosters r/);
    expect(sql).toMatch(/v_scope = 'team'/);
    expect(sql).toMatch(/drip_progress_team_buyer_select/);
    expect(sql).toMatch(/list_team_purchase_completions/);
    expect(sql).toMatch(/purchase_not_owned/);
    expect(sql).toMatch(/purchase_not_team_scope/);

    // Port + adapter + coach UI expose the summary.
    expect(read(DRIP_PORT)).toMatch(/listTeamPurchaseCompletions/);
    expect(read(SUPABASE_DRIP_ADAPTER)).toMatch(/list_team_purchase_completions/);
    expect(existsSync(TEAM_COMPLETION_UI)).toBe(true);
    expect(read(TEAM_COMPLETION_UI)).toMatch(/team-package-completion/);
    expect(read(STORE_SCREEN)).toMatch(/TeamPackageCompletion/);
    expect(read(STORE_SCREEN)).toMatch(/scope === 'team'/);
  });
});
