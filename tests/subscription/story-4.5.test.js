// STORY-4.5 — Subscription upgrade and downgrade in account settings (Flow 17).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  accountPlanOverview,
  accountUsageSummary,
  applyImmediateUpgrade,
  classifyTierChange,
  downgradeHistoryRetention,
  downgradeRetentionNotice,
  effectiveTierForAccess,
  isHistoryFeatureVisible,
  pendingTierChange,
  scheduleDowngradeAtPeriodEnd,
  subscriptionSchema,
} from '@coach360/domain';
import {
  buildDowngradeSchedulePhasesBody,
  buildStripeSubscriptionUpgradeBody,
  changeSubscriptionTier,
  classifyPaidTierChange,
  resolveSubscriptionBillingPeriod,
} from '../../supabase/functions/change-subscription-tier/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const SUBSCRIPTION_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'subscription',
  'ui',
  'SubscriptionScreen.jsx',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const TIER_CHANGE_HANDLER_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'change-subscription-tier',
  'handler.ts',
);
const TIER_CHANGE_INDEX_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'change-subscription-tier',
  'index.ts',
);
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260715100000_pending_tier_change.sql',
);
const BILLING_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'billing-repository.ts',
);
const BILLING_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-billing-repository.ts',
);

function makeSubscription(overrides = {}) {
  return subscriptionSchema.parse({
    id: '00000000-0000-4000-8000-000000000450',
    profileId: '00000000-0000-4000-8000-000000000451',
    tier: 'pro',
    status: 'active',
    stripeCustomerId: 'cus_test_45',
    stripeSubscriptionId: 'sub_test_45',
    currentPeriodEnd: '2026-08-01T00:00:00.000Z',
    trialEndsAt: null,
    trialUsedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  });
}

describe('STORY_4_5 AC1 — account settings shows current plan, usage summary, billing info', () => {
  it('test_STORY_4_5_AC1_account_settings_shows_plan_usage_billing: overview + usage rows + billing wiring', () => {
    const now = new Date('2026-07-15T00:00:00.000Z');

    // Paid plan: label, price, renewal date.
    const paid = makeSubscription();
    const overview = accountPlanOverview(paid, now);
    expect(overview.tierLabel).toBe('Pro');
    expect(overview.displayPrice).toBe('$49/mo');
    expect(overview.renewsAt).toBe('2026-08-01T00:00:00.000Z');
    expect(overview.isTrial).toBe(false);
    expect(overview.pendingChange).toBeNull();

    const usage = accountUsageSummary(paid, now);
    const usageKeys = usage.map((row) => row.key);
    expect(usageKeys).toContain('access');
    expect(usageKeys).toContain('entitlements');
    expect(usageKeys).toContain('renewal');
    expect(usage.find((row) => row.key === 'access').value).toBe('Pro');

    // Active trial: Pro access, countdown instead of renewal.
    const trial = makeSubscription({
      tier: 'trial',
      status: 'trialing',
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      trialEndsAt: '2026-07-20T00:00:00.000Z',
    });
    const trialOverview = accountPlanOverview(trial, now);
    expect(trialOverview.isTrial).toBe(true);
    expect(trialOverview.trialDaysRemaining).toBe(5);
    const trialUsage = accountUsageSummary(trial, now);
    expect(trialUsage.find((row) => row.key === 'trial').value).toBe('5');

    // Pending downgrade surfaces on the plan card.
    const pending = makeSubscription({
      pendingTier: 'basic',
      pendingTierEffectiveAt: '2026-08-01T00:00:00.000Z',
    });
    const pendingChange = pendingTierChange(pending);
    expect(pendingChange).toEqual({
      tier: 'basic',
      tierLabel: 'Basic',
      effectiveAt: '2026-08-01T00:00:00.000Z',
    });
    expect(accountPlanOverview(pending, now).pendingChange).toEqual(pendingChange);

    // Screen renders all three sections; App wires real subscription + invoices.
    expect(existsSync(SUBSCRIPTION_SCREEN_PATH)).toBe(true);
    const screen = readFileSync(SUBSCRIPTION_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/accountPlanOverview/);
    expect(screen).toMatch(/accountUsageSummary/);
    expect(screen).toMatch(/Usage summary/);
    expect(screen).toMatch(/Current Plan/);
    expect(screen).toMatch(/BillingHistorySection/);
    expect(screen).toMatch(/Billing history/);
    expect(screen).toMatch(/canViewBillingHistory/);
    expect(screen).toMatch(/isSubscriptionPaymentLocked/);
    expect(screen).toMatch(/Payment issue|Locked/);

    expect(existsSync(APP_PATH)).toBe(true);
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/subscription=\{subscriptionState\.subscription\}/);
    expect(app).toMatch(/billingHistory=\{billingHistory\}/);
    expect(app).toMatch(/repos\.billing\s*\n?\s*\.listByProfileId|repos\.billing\.listByProfileId/);
  });
});

describe('STORY_4_5 AC2 — upgrade processes payment and unlocks tier immediately with proration', () => {
  it('test_STORY_4_5_AC2_upgrade_immediate_with_proration: prorated Stripe update + immediate tier apply', async () => {
    expect(classifyTierChange('basic', 'pro')).toBe('upgrade');
    expect(classifyTierChange('trial', 'advanced')).toBe('upgrade');
    expect(classifyPaidTierChange('basic', 'advanced')).toBe('upgrade');

    const body = buildStripeSubscriptionUpgradeBody({
      subscriptionItemId: 'si_test_1',
      priceId: 'price_test_pro',
      tier: 'pro',
      profileId: '00000000-0000-4000-8000-000000000451',
    });
    expect(body.proration_behavior).toBe('always_invoice');
    expect(body['items[0][id]']).toBe('si_test_1');
    expect(body['items[0][price]']).toBe('price_test_pro');
    expect(body['metadata[tier]']).toBe('pro');

    const updateSubscription = vi.fn(async () => ({ id: 'sub_test_45', status: 'active' }));
    const applyUpgrade = vi.fn(async () => {});
    const schedulePendingDowngrade = vi.fn(async () => {});

    const result = await changeSubscriptionTier({
      input: {
        profileId: '00000000-0000-4000-8000-000000000451',
        currentTier: 'basic',
        targetTier: 'pro',
        stripeSubscriptionId: 'sub_test_45',
        subscriptionItemId: 'si_test_1',
        currentPriceId: 'price_test_basic',
        targetPriceId: 'price_test_pro',
        currentPeriodStart: 1753920000,
        currentPeriodEnd: 1756598400,
      },
      stripe: {
        updateSubscription,
        createSchedule: vi.fn(),
        updateSchedule: vi.fn(),
      },
      persist: { applyUpgrade, schedulePendingDowngrade },
    });

    // Payment processed via prorated subscription update, tier live immediately.
    expect(updateSubscription).toHaveBeenCalledOnce();
    expect(updateSubscription.mock.calls[0][1].proration_behavior).toBe('always_invoice');
    expect(applyUpgrade).toHaveBeenCalledWith({
      profileId: '00000000-0000-4000-8000-000000000451',
      tier: 'pro',
    });
    expect(schedulePendingDowngrade).not.toHaveBeenCalled();
    expect(result.kind).toBe('upgraded');
    expect(result.tier).toBe('pro');
    expect(result.pendingTier).toBeNull();

    // Pure snapshot helper: upgrade unlocks the target tier now, no pending state.
    const upgraded = applyImmediateUpgrade(makeSubscription({ tier: 'basic' }), 'pro');
    expect(upgraded.tier).toBe('pro');
    expect(upgraded.status).toBe('active');
    expect(upgraded.pendingTier).toBeNull();
    expect(effectiveTierForAccess(upgraded)).toBe('pro');

    // App account settings uses the tier-change repo path (not mock setUser).
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/handleChangeSubscriptionTier/);
    expect(app).toMatch(/repos\.billing\.changeSubscriptionTier/);
    expect(app).toMatch(/refreshSubscription/);

    const port = readFileSync(BILLING_PORT_PATH, 'utf8');
    expect(port).toMatch(/changeSubscriptionTier/);
    const repo = readFileSync(BILLING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/functions\.invoke\('change-subscription-tier'/);

    const screen = readFileSync(SUBSCRIPTION_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/Applies immediately with prorated billing/);
  });
});

describe('STORY_4_5 AC3 — downgrade scheduled for end of current billing period', () => {
  it('test_STORY_4_5_AC3_downgrade_scheduled_end_of_cycle: pending tier until period end', async () => {
    expect(classifyTierChange('pro', 'basic')).toBe('downgrade');
    expect(classifyPaidTierChange('pro', 'advanced')).toBe('downgrade');

    // Domain rule: pending change lands exactly at the current period end.
    const scheduled = scheduleDowngradeAtPeriodEnd(makeSubscription(), 'basic');
    expect(scheduled).toEqual({
      pendingTier: 'basic',
      pendingTierEffectiveAt: '2026-08-01T00:00:00.000Z',
    });
    expect(() => scheduleDowngradeAtPeriodEnd(makeSubscription({ tier: 'basic' }), 'pro')).toThrow(
      /not_a_downgrade/,
    );
    expect(() =>
      scheduleDowngradeAtPeriodEnd(makeSubscription({ currentPeriodEnd: null }), 'basic'),
    ).toThrow(/downgrade_requires_billing_period/);

    // Stripe schedule phases: current price until period end, then target price.
    const periodStart = 1753920000;
    const periodEnd = 1756598400;

    // Basil+ Stripe payloads put period on the item; root fields may be absent.
    expect(
      resolveSubscriptionBillingPeriod({
        items: {
          data: [{ current_period_start: periodStart, current_period_end: periodEnd }],
        },
      }),
    ).toEqual({ periodStart, periodEnd });
    // Pre-Basil payloads still work via subscription-level fields.
    expect(
      resolveSubscriptionBillingPeriod({
        current_period_start: periodStart,
        current_period_end: periodEnd,
      }),
    ).toEqual({ periodStart, periodEnd });
    expect(resolveSubscriptionBillingPeriod({})).toEqual({ periodStart: 0, periodEnd: 0 });

    const phases = buildDowngradeSchedulePhasesBody({
      currentPriceId: 'price_test_pro',
      targetPriceId: 'price_test_basic',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      targetTier: 'basic',
      profileId: '00000000-0000-4000-8000-000000000451',
    });
    expect(phases['phases[0][items][0][price]']).toBe('price_test_pro');
    expect(phases['phases[0][end_date]']).toBe(String(periodEnd));
    expect(phases['phases[1][items][0][price]']).toBe('price_test_basic');
    expect(phases['phases[1][metadata][tier]']).toBe('basic');

    const createSchedule = vi.fn(async () => ({ id: 'sub_sched_1' }));
    const updateSchedule = vi.fn(async () => ({ id: 'sub_sched_1' }));
    const applyUpgrade = vi.fn(async () => {});
    const schedulePendingDowngrade = vi.fn(async () => {});

    const result = await changeSubscriptionTier({
      input: {
        profileId: '00000000-0000-4000-8000-000000000451',
        currentTier: 'pro',
        targetTier: 'basic',
        stripeSubscriptionId: 'sub_test_45',
        subscriptionItemId: 'si_test_1',
        currentPriceId: 'price_test_pro',
        targetPriceId: 'price_test_basic',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      stripe: { updateSubscription: vi.fn(), createSchedule, updateSchedule },
      persist: { applyUpgrade, schedulePendingDowngrade },
    });

    // Active tier untouched; change recorded as pending for the period end.
    expect(createSchedule).toHaveBeenCalledWith('sub_test_45');
    expect(updateSchedule).toHaveBeenCalledOnce();
    expect(applyUpgrade).not.toHaveBeenCalled();
    expect(schedulePendingDowngrade).toHaveBeenCalledWith({
      profileId: '00000000-0000-4000-8000-000000000451',
      pendingTier: 'basic',
      pendingTierEffectiveAt: new Date(periodEnd * 1000).toISOString(),
    });
    expect(result.kind).toBe('downgrade_scheduled');
    expect(result.tier).toBe('pro');
    expect(result.pendingTier).toBe('basic');
    expect(result.pendingTierEffectiveAt).toBe(new Date(periodEnd * 1000).toISOString());

    // Migration: pending columns + trigger clearing them once the tier lands.
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/pending_tier public\.subscription_tier/);
    expect(sql).toMatch(/pending_tier_effective_at timestamptz/);
    expect(sql).toMatch(/clear_applied_pending_tier/);
    expect(sql).toMatch(/new\.tier = old\.pending_tier/);

    expect(existsSync(TIER_CHANGE_HANDLER_PATH)).toBe(true);
    expect(existsSync(TIER_CHANGE_INDEX_PATH)).toBe(true);
    const indexSrc = readFileSync(TIER_CHANGE_INDEX_PATH, 'utf8');
    expect(indexSrc).toMatch(/subscription_schedules/);
    expect(indexSrc).toMatch(/schedulePendingDowngrade/);
    expect(indexSrc).toMatch(/resolveSubscriptionBillingPeriod/);

    // UI: scheduled downgrade banner + confirm step before scheduling.
    const screen = readFileSync(SUBSCRIPTION_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/Downgrade scheduled/);
    expect(screen).toMatch(/pendingTierChange/);
    expect(screen).toMatch(/Confirm downgrade/);
  });
});

describe('STORY_4_5 AC4 — objective and AI history preserved but hidden until re-upgrade', () => {
  it('test_STORY_4_5_AC4_history_preserved_hidden_until_reupgrade: preserve-hidden retention policy', () => {
    // Retention policy: downgrade never deletes; restored by upgrading again.
    const retention = downgradeHistoryRetention();
    expect(retention.policy).toBe('preserve_hidden');
    expect(retention.deletesData).toBe(false);
    expect(retention.restoredOnUpgrade).toBe(true);

    // Objectives + AI history (Pro features) hidden below Pro, visible at Pro.
    for (const role of ['coach', 'player']) {
      for (const feature of ['objectives', 'ai']) {
        expect(isHistoryFeatureVisible(feature, role, 'basic')).toBe(false);
        expect(isHistoryFeatureVisible(feature, role, 'advanced')).toBe(false);
        expect(isHistoryFeatureVisible(feature, role, 'pro')).toBe(true);
      }
    }

    // Downgrade Pro → Basic hides history; re-upgrade to Pro restores access.
    const downgraded = makeSubscription({ tier: 'basic' });
    expect(isHistoryFeatureVisible('objectives', 'coach', effectiveTierForAccess(downgraded))).toBe(
      false,
    );
    const reUpgraded = applyImmediateUpgrade(downgraded, 'pro');
    expect(isHistoryFeatureVisible('objectives', 'coach', effectiveTierForAccess(reUpgraded))).toBe(
      true,
    );

    // Retention copy shown when confirming a downgrade.
    expect(downgradeRetentionNotice('basic')).toMatch(/preserved but hidden/);
    const screen = readFileSync(SUBSCRIPTION_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/downgradeRetentionNotice/);
    expect(screen).toMatch(/preserved but hidden until you upgrade again/);

    // Downgrade path only updates the subscription row — never deletes user data.
    const handler = readFileSync(TIER_CHANGE_HANDLER_PATH, 'utf8');
    expect(handler).not.toMatch(/\.delete\(|DELETE FROM/i);
    const indexSrc = readFileSync(TIER_CHANGE_INDEX_PATH, 'utf8');
    expect(indexSrc).not.toMatch(/\.delete\(|DELETE FROM/i);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).not.toMatch(/delete from|drop table/i);
  });
});
