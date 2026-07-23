// STORY-10.2 — Drip schedule engine and unlock notifications.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDripUnlockSchedule,
  canConfigureDripSchedule,
  effectiveDripIntervalDays,
  normalizeDripIntervalDays,
  rebuildDripScheduleAfterUpgrade,
  selectDueDripUnlocks,
} from '@coach360/domain';
import { ConsoleNotificationRepository } from '../../packages/api/src/adapters/console/console-notification-repository.ts';
import { processDripUnlocks } from '../../supabase/functions/process-drip-unlocks/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const STAKEHOLDER_Q = path.join(REPO_ROOT, 'docs', 'product', 'stakeholder-questions.md');
const DOMAIN_DRIP = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'marketplace', 'drip.ts');
const NOTIFICATION_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'notification-repository.ts',
);
const MIGRATION = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260723140000_drip_schedule_engine.sql',
);
const WEBHOOK_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'stripe-webhook',
  'index.ts',
);
const PROCESS_HANDLER = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'process-drip-unlocks',
  'handler.ts',
);
const PROCESS_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'process-drip-unlocks',
  'index.ts',
);

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

const MODULES = ['mod-lessons-1-4', 'mod-lessons-5-8', 'mod-lessons-9-12', 'mod-lessons-13-16'];
const PURCHASED_AT = '2026-07-01T12:00:00.000Z';

describe('STORY_10_2 AC1 — Initial modules unlock immediately on purchase', () => {
  it('test_STORY_10_2_AC1_initial_module_unlocks_on_purchase', () => {
    const schedule = buildDripUnlockSchedule({
      moduleIds: MODULES,
      purchasedAt: PURCHASED_AT,
      intervalDays: 7,
    });

    expect(schedule[0].moduleId).toBe('mod-lessons-1-4');
    expect(schedule[0].unlocksImmediately).toBe(true);
    expect(schedule[0].unlockAt).toBe(new Date(PURCHASED_AT).toISOString());
    expect(schedule.slice(1).every((row) => row.unlocksImmediately === false)).toBe(true);

    expect(existsSync(MIGRATION)).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/init_drip_progress_for_purchase/);
    expect(sql).toMatch(/case when v_sched_index = 0 then v_purchased_at else null end/);
    expect(sql).toMatch(/scheduled_unlock_at/);

    const webhook = read(WEBHOOK_INDEX);
    expect(webhook).toMatch(/init_drip_progress_for_purchase/);
    expect(webhook).toMatch(/dripModules/);
  });
});

describe('STORY_10_2 AC2 — Subsequent modules unlock per configured cadence', () => {
  it('test_STORY_10_2_AC2_subsequent_modules_follow_cadence', () => {
    expect(normalizeDripIntervalDays(7)).toBe(7);
    expect(normalizeDripIntervalDays(14)).toBe(14);
    expect(normalizeDripIntervalDays(10)).toBe(10);
    expect(normalizeDripIntervalDays(0)).toBe(7);

    const weekly = buildDripUnlockSchedule({
      moduleIds: MODULES,
      purchasedAt: PURCHASED_AT,
      intervalDays: 7,
    });
    expect(weekly[1].unlockAt).toBe('2026-07-08T12:00:00.000Z');
    expect(weekly[2].unlockAt).toBe('2026-07-15T12:00:00.000Z');

    const biweekly = buildDripUnlockSchedule({
      moduleIds: MODULES,
      purchasedAt: PURCHASED_AT,
      intervalDays: 14,
    });
    expect(biweekly[1].unlockAt).toBe('2026-07-15T12:00:00.000Z');
    expect(biweekly[2].unlockAt).toBe('2026-07-29T12:00:00.000Z');

    const custom = buildDripUnlockSchedule({
      moduleIds: MODULES,
      purchasedAt: PURCHASED_AT,
      intervalDays: 3,
    });
    expect(custom[1].unlockAt).toBe('2026-07-04T12:00:00.000Z');

    const q = read(STAKEHOLDER_Q);
    expect(q).toMatch(/14\.2[\s\S]*?\|\s*\*\*Weekly \/ biweekly \/ custom\*\*/i);

    const sql = read(MIGRATION);
    expect(sql).toMatch(/intervalDays/);
    expect(sql).toMatch(/make_interval\(days => v_sched_index \* v_interval_days\)/);
  });
});

describe('STORY_10_2 AC3 — Push notification when new module available', () => {
  it('test_STORY_10_2_AC3_enqueue_push_on_module_unlock', () => {
    expect(existsSync(PROCESS_HANDLER)).toBe(true);
    expect(existsSync(PROCESS_INDEX)).toBe(true);

    const port = read(NOTIFICATION_PATH);
    expect(port).toMatch(/drip_module_unlocked/);
    expect(port).toMatch(/enqueueDripModuleUnlocked/);

    const processHandler = read(PROCESS_HANDLER);
    expect(processHandler).toMatch(/drip_module_unlocked/);
    expect(processHandler).toMatch(/processDripUnlocks/);

    const processIndex = read(PROCESS_INDEX);
    expect(processIndex).toMatch(/list_due_drip_unlocks/);
    expect(processIndex).toMatch(/apply_drip_module_unlock/);
    expect(processIndex).toMatch(/\[notifications\]/);
    expect(processIndex).toMatch(/row\.event/);

    const due = selectDueDripUnlocks({
      candidates: [
        {
          purchase_id: 'purchase-1',
          profile_id: 'profile-1',
          module_id: 'mod-lessons-5-8',
          scheduled_unlock_at: '2026-07-08T12:00:00.000Z',
          sanity_document_id: 'pkg-1',
        },
        {
          purchase_id: 'purchase-1',
          profile_id: 'profile-1',
          module_id: 'mod-lessons-9-12',
          scheduled_unlock_at: '2026-07-15T12:00:00.000Z',
          sanity_document_id: 'pkg-1',
        },
      ],
      now: new Date('2026-07-08T12:00:00.000Z'),
    });
    expect(due.unlocked).toHaveLength(1);
    expect(due.unlocked[0].event).toBe('drip_module_unlocked');
    expect(due.unlocked[0].moduleId).toBe('mod-lessons-5-8');

    const processed = processDripUnlocks({
      candidates: [
        {
          purchase_id: 'purchase-1',
          profile_id: 'profile-1',
          module_id: 'mod-lessons-5-8',
          scheduled_unlock_at: '2026-07-08T12:00:00.000Z',
          sanity_document_id: 'pkg-1',
        },
      ],
      now: new Date('2026-07-08T12:00:00.000Z'),
    });
    expect(processed.unlocked[0].event).toBe('drip_module_unlocked');

    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const repo = new ConsoleNotificationRepository();
    repo.enqueueDripModuleUnlocked(processed.unlocked[0]);
    expect(debug).toHaveBeenCalledWith(
      '[notifications]',
      'drip_module_unlocked',
      expect.objectContaining({ moduleId: 'mod-lessons-5-8' }),
    );
    debug.mockRestore();
  });
});

describe('STORY_10_2 AC4 — Higher tier does not accelerate drip (OQ-14.3 = no)', () => {
  it('test_STORY_10_2_AC4_no_tier_acceleration_same_cadence', () => {
    const q = read(STAKEHOLDER_Q);
    expect(q).toMatch(/14\.3[\s\S]*?\|\s*\*\*No\.\*\*/i);

    expect(effectiveDripIntervalDays('advanced', 14)).toBe(14);
    expect(effectiveDripIntervalDays('pro', 14)).toBe(14);
    expect(effectiveDripIntervalDays('basic', 7)).toBe(7);

    const advanced = buildDripUnlockSchedule({
      moduleIds: MODULES,
      purchasedAt: PURCHASED_AT,
      intervalDays: 14,
      tier: 'advanced',
    });
    const pro = buildDripUnlockSchedule({
      moduleIds: MODULES,
      purchasedAt: PURCHASED_AT,
      intervalDays: 14,
      tier: 'pro',
    });
    expect(pro.map((r) => r.unlockAt)).toEqual(advanced.map((r) => r.unlockAt));

    const domain = read(DOMAIN_DRIP);
    expect(domain).toMatch(/OQ-14\.3/);
    expect(domain).toMatch(/no tier acceleration/i);

    // OQ-14.1 — coach Pro configures package drip (engine consumes Sanity schedule).
    expect(canConfigureDripSchedule('coach', 'pro')).toBe(true);
    expect(canConfigureDripSchedule('coach', 'advanced')).toBe(false);
    expect(q).toMatch(/14\.1[\s\S]*?\|\s*\*\*Coach per package \(Pro\)\.\*\*/i);
  });
});

describe('STORY_10_2 AC5 — Upgrade mid-drip leaves schedule unchanged (OQ-14.5)', () => {
  it('test_STORY_10_2_AC5_upgrade_mid_drip_no_schedule_change', () => {
    const q = read(STAKEHOLDER_Q);
    expect(q).toMatch(/14\.5[\s\S]*?\|\s*\*\*No\.\*\*/i);

    const result = rebuildDripScheduleAfterUpgrade({
      moduleIds: MODULES,
      purchasedAt: PURCHASED_AT,
      intervalDays: 7,
      previousTier: 'advanced',
      newTier: 'pro',
    });
    expect(result.unchanged).toBe(true);
    expect(result.after.map((r) => r.unlockAt)).toEqual(result.before.map((r) => r.unlockAt));

    const domain = read(DOMAIN_DRIP);
    expect(domain).toMatch(/OQ-14\.5/);
    expect(domain).toMatch(/does not change remaining unlock dates/i);
  });
});
