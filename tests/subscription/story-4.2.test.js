// STORY-4.2 — Free trial activation and countdown.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_TRIAL_WARNING_DAYS_BEFORE,
  TRIAL_DURATION_DAYS,
  TRIAL_WARNING_SETTING_KEY,
  canActivateTrial,
  normalizeTrialWarningDays,
  shouldSendTrialExpiryWarning,
  subscriptionSchema,
  trialDaysRemaining,
  trialGrantsProAccess,
} from '@coach360/domain';
import { ConsoleNotificationRepository } from '../../packages/api/src/adapters/console/console-notification-repository.ts';
import { processTrialExpiryWarnings } from '../../supabase/functions/trial-expiry-warnings/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260713140000_trial_lifecycle.sql',
);
const HANDLER_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'trial-expiry-warnings',
  'handler.ts',
);
const INDEX_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'trial-expiry-warnings',
  'index.ts',
);
const TRIAL_DOMAIN_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'subscription',
  'trial.ts',
);
const CHOICE_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'subscription',
  'ui',
  'SubscriptionChoiceScreen.jsx',
);
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
const TRIAL_BANNER_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'subscription',
  'ui',
  'TrialBanner.jsx',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const ADMIN_SUBS_PATH = path.join(
  REPO_ROOT,
  'apps',
  'admin',
  'src',
  'pages',
  'subscriptions',
  'SubscriptionsPage.tsx',
);
const NOTIFICATION_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'notification-repository.ts',
);
const SUBSCRIPTION_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-subscription-repository.ts',
);

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe('STORY_4_2 AC1 — activate trial once per account', () => {
  it('test_STORY_4_2_AC1_activate_trial_once_per_account: new users eligible; RPC stamps trial_used_at', () => {
    expect(canActivateTrial(null)).toBe(true);
    expect(
      canActivateTrial(
        subscriptionSchema.parse({
          id: '00000000-0000-4000-8000-000000000101',
          profileId: '00000000-0000-4000-8000-000000000102',
          tier: 'basic',
          status: 'active',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
          trialEndsAt: null,
          trialUsedAt: null,
        }),
      ),
    ).toBe(true);

    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/trial_used_at/);
    expect(sql).toMatch(/create or replace function public\.activate_user_trial/);
    expect(sql).toMatch(/trial_already_used/);
    expect(sql).toMatch(/interval '14 days'/);
    expect(TRIAL_DURATION_DAYS).toBe(14);

    expect(existsSync(CHOICE_SCREEN_PATH)).toBe(true);
    const choice = readFileSync(CHOICE_SCREEN_PATH, 'utf8');
    expect(choice).toMatch(/canActivateTrial/);
    expect(choice).toMatch(/Start free trial/);
    expect(choice).toMatch(/One trial per/);

    expect(existsSync(SUBSCRIPTION_REPO_PATH)).toBe(true);
    const repo = readFileSync(SUBSCRIPTION_REPO_PATH, 'utf8');
    expect(repo).toMatch(/activate_user_trial/);
  });
});

describe('STORY_4_2 AC2 — trial status and countdown visible', () => {
  it('test_STORY_4_2_AC2_trial_status_and_countdown_visible: banner and subscription screen show countdown', () => {
    const endsAt = daysFromNow(11);
    expect(trialDaysRemaining(endsAt)).toBeGreaterThan(0);
    expect(trialGrantsProAccess('trial', 'trialing')).toBe(true);

    expect(existsSync(TRIAL_BANNER_PATH)).toBe(true);
    const banner = readFileSync(TRIAL_BANNER_PATH, 'utf8');
    expect(banner).toMatch(/Free Trial -/);
    expect(banner).toMatch(/days left/);
    expect(banner).toMatch(/Full Pro access/);
    expect(banner).toMatch(/Trial active/);

    expect(existsSync(APP_PATH)).toBe(true);
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/features\/subscription\/ui\/TrialBanner/);
    expect(app).toMatch(/<TrialBanner/);
    expect(app).not.toMatch(/function TrialBanner/);

    expect(existsSync(SUBSCRIPTION_SCREEN_PATH)).toBe(true);
    const screen = readFileSync(SUBSCRIPTION_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/days remaining/);
    expect(screen).toMatch(/Trial active/);
    expect(screen).toMatch(/user\.trialDays/);
  });
});

describe('STORY_4_2 AC3 — warning notification before expiry', () => {
  it('test_STORY_4_2_AC3_warning_notification_before_expiry: default 3 days, admin-configurable, enqueue path', () => {
    expect(DEFAULT_TRIAL_WARNING_DAYS_BEFORE).toBe(3);
    expect(TRIAL_WARNING_SETTING_KEY).toBe('trial_warning_days_before');
    expect(normalizeTrialWarningDays(0)).toBe(3);
    expect(normalizeTrialWarningDays(5)).toBe(5);

    const inThreeDays = daysFromNow(3);
    expect(
      shouldSendTrialExpiryWarning({
        trialEndsAt: inThreeDays,
        warningDaysBefore: 3,
      }),
    ).toBe(true);
    expect(
      shouldSendTrialExpiryWarning({
        trialEndsAt: daysFromNow(10),
        warningDaysBefore: 3,
      }),
    ).toBe(false);
    expect(
      shouldSendTrialExpiryWarning({
        trialEndsAt: inThreeDays,
        warningDaysBefore: 3,
        alreadyWarned: true,
      }),
    ).toBe(false);

    expect(existsSync(TRIAL_DOMAIN_PATH)).toBe(true);
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/platform_settings/);
    expect(sql).toMatch(/trial_warning_days_before/);
    expect(sql).toMatch(/get_trial_warning_days/);
    expect(sql).toMatch(/set_trial_warning_days/);
    expect(sql).toMatch(/list_trial_warning_candidates/);
    expect(sql).toMatch(/trial_warning_events/);

    expect(existsSync(HANDLER_PATH)).toBe(true);
    expect(existsSync(INDEX_PATH)).toBe(true);
    const indexSrc = readFileSync(INDEX_PATH, 'utf8');
    expect(indexSrc).toMatch(/processTrialExpiryWarnings/);
    expect(indexSrc).toMatch(/list_trial_warning_candidates/);
    expect(indexSrc).toMatch(/record_trial_warning_sent/);

    const profileId = '00000000-0000-4000-8000-000000000201';
    const result = processTrialExpiryWarnings({
      candidates: [
        { profile_id: profileId, trial_ends_at: inThreeDays },
        { profile_id: '00000000-0000-4000-8000-000000000202', trial_ends_at: daysFromNow(10) },
      ],
      warningDaysBefore: 3,
    });
    expect(result.warningDaysBefore).toBe(3);
    expect(result.sent).toHaveLength(1);
    expect(result.sent[0].event).toBe('trial_expiry_warning');
    expect(result.sent[0].profileId).toBe(profileId);

    expect(existsSync(NOTIFICATION_PORT_PATH)).toBe(true);
    const port = readFileSync(NOTIFICATION_PORT_PATH, 'utf8');
    expect(port).toMatch(/enqueueTrialExpiryWarning/);
    expect(port).toMatch(/trial_expiry_warning/);

    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const notifications = new ConsoleNotificationRepository();
    notifications.enqueueTrialExpiryWarning({
      event: 'trial_expiry_warning',
      profileId,
      trialEndsAt: inThreeDays,
      daysRemaining: 3,
    });
    expect(debug).toHaveBeenCalledWith(
      '[notifications]',
      'trial_expiry_warning',
      expect.objectContaining({ profileId, daysRemaining: 3 }),
    );
    debug.mockRestore();

    expect(existsSync(ADMIN_SUBS_PATH)).toBe(true);
    const admin = readFileSync(ADMIN_SUBS_PATH, 'utf8');
    expect(admin).toMatch(/getTrialWarningDays/);
    expect(admin).toMatch(/setTrialWarningDays/);
    expect(admin).toMatch(/Trial expiry warning/);

    const repo = readFileSync(SUBSCRIPTION_REPO_PATH, 'utf8');
    expect(repo).toMatch(/get_trial_warning_days/);
    expect(repo).toMatch(/set_trial_warning_days/);
  });
});

describe('STORY_4_2 AC4 — cannot re-activate after expiry', () => {
  it('test_STORY_4_2_AC4_cannot_reactivate_after_expiry: used trial blocks activation and UI', () => {
    const used = subscriptionSchema.parse({
      id: '00000000-0000-4000-8000-000000000301',
      profileId: '00000000-0000-4000-8000-000000000302',
      tier: 'basic',
      status: 'active',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      trialEndsAt: daysFromNow(-1),
      trialUsedAt: daysFromNow(-15),
    });
    expect(canActivateTrial(used)).toBe(false);

    const activeTrial = subscriptionSchema.parse({
      id: '00000000-0000-4000-8000-000000000303',
      profileId: '00000000-0000-4000-8000-000000000304',
      tier: 'trial',
      status: 'trialing',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      trialEndsAt: daysFromNow(7),
      trialUsedAt: daysFromNow(-7),
    });
    expect(canActivateTrial(activeTrial)).toBe(false);

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/trial_already_used/);
    expect(sql).toMatch(/existing\.trial_used_at is not null/);

    const choice = readFileSync(CHOICE_SCREEN_PATH, 'utf8');
    expect(choice).toMatch(/Free trial used/);
    expect(choice).toMatch(/cannot be restarted/);
  });
});
