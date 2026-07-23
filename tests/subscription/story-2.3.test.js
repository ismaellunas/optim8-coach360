// STORY-2.3 — Subscription gate after onboarding.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';
import {
  createMemoryAuthStorage,
  createSupabaseClient,
  SupabaseAppAuthRepository,
  SupabaseSubscriptionRepository,
} from '@coach360/api';
import {
  effectiveTierForAccess,
  legacyDisplayTier,
  needsSubscriptionGate,
  subscriptionSchema,
  trialDaysRemaining,
  trialGrantsProAccess,
} from '@coach360/domain';
import { handleStripeWebhookEvent } from '../../supabase/functions/stripe-webhook/handler.ts';
import { mapAppUserToLegacy } from '../../apps/mobile/src/features/auth/lib/map-app-user.js';
import { readSupabaseTestEnv, REPO_ROOT } from '../helpers/supabase-test-env.js';

if (!globalThis.WebSocket) globalThis.WebSocket = ws;

const supabaseEnv = readSupabaseTestEnv();
const runCloudIntegration = Boolean(
  process.env.SUPABASE_RUN_INTEGRATION === '1' &&
    supabaseEnv?.API_URL &&
    supabaseEnv?.ANON_KEY &&
    supabaseEnv?.SERVICE_ROLE_KEY,
);
const describeCloudIntegration = runCloudIntegration ? describe : describe.skip;

const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const SUBSCRIPTION_GATE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'subscription',
  'ui',
  'SubscriptionGate.jsx',
);
const SUBSCRIPTION_CHOICE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'subscription',
  'ui',
  'SubscriptionChoiceScreen.jsx',
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
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260706120000_subscription_onboarding.sql',
);
const WEBHOOK_HANDLER_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'stripe-webhook',
  'handler.ts',
);

describe('STORY_2_3 AC1 — subscription choice after profile', () => {
  it('test_STORY_2_3_AC1_subscription_choice_after_profile: gate shows trial, tiers, and defer', () => {
    expect(existsSync(APP_PATH)).toBe(true);
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/SubscriptionGate/);
    expect(app).toMatch(/ProfileGate[\s\S]*SubscriptionGate[\s\S]*Coach360App/);

    expect(existsSync(SUBSCRIPTION_GATE_PATH)).toBe(true);
    const gate = readFileSync(SUBSCRIPTION_GATE_PATH, 'utf8');
    expect(gate).toMatch(/needsSubscriptionGate/);
    expect(gate).toMatch(/SubscriptionChoiceScreen/);
    expect(gate).toMatch(/activateTrial/);
    expect(gate).toMatch(/deferToBasic/);

    expect(existsSync(SUBSCRIPTION_CHOICE_PATH)).toBe(true);
    const choice = readFileSync(SUBSCRIPTION_CHOICE_PATH, 'utf8');
    expect(choice).toMatch(/Start free trial/);
    expect(choice).toMatch(/onChoosePaidTier/);
    expect(choice).toMatch(/Choose \{tier\.label\}/);
    expect(choice).toMatch(/Continue with Basic for free/);

    expect(needsSubscriptionGate(null)).toBe(true);
    const existing = subscriptionSchema.parse({
      id: '00000000-0000-4000-8000-000000000001',
      profileId: '00000000-0000-4000-8000-000000000010',
      tier: 'basic',
      status: 'active',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
    });
    expect(needsSubscriptionGate(existing)).toBe(false);
  });
});

describe('STORY_2_3 AC2 — trial grants pro access', () => {
  it('test_STORY_2_3_AC2_trial_grants_pro_access: trialing users get Pro-level access', () => {
    expect(trialGrantsProAccess('trial', 'trialing')).toBe(true);
    expect(trialGrantsProAccess('trial', 'active')).toBe(false);
    expect(trialGrantsProAccess('basic', 'active')).toBe(false);

    const trial = subscriptionSchema.parse({
      id: '00000000-0000-4000-8000-000000000002',
      profileId: '00000000-0000-4000-8000-000000000010',
      tier: 'trial',
      status: 'trialing',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(effectiveTierForAccess(trial)).toBe('pro');
    expect(legacyDisplayTier(trial)).toBe('trial');
    expect(trialDaysRemaining(trial.trialEndsAt)).toBeGreaterThan(0);

    const legacyUser = mapAppUserToLegacy(
      {
        id: trial.profileId,
        email: 'trial@example.com',
        role: 'coach',
        displayName: 'Trial Coach',
        isSuspended: false,
      },
      { subscription: trial },
    );
    expect(legacyUser.tier).toBe('trial');
    expect(legacyUser.trialDays).toBeGreaterThan(0);

    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/activate_user_trial/);
    expect(sql).toMatch(/interval '14 days'/);
  });
});

describe('STORY_2_3 AC3 — defer lands on basic', () => {
  it('test_STORY_2_3_AC3_defer_lands_on_basic: defer path sets basic active tier', () => {
    expect(existsSync(SUBSCRIPTION_REPO_PATH)).toBe(true);
    const repo = readFileSync(SUBSCRIPTION_REPO_PATH, 'utf8');
    expect(repo).toMatch(/deferToBasic/);
    expect(repo).toMatch(/defer_user_to_basic/);

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/defer_user_to_basic/);
    expect(sql).toMatch(/'basic', 'active'/);

    const basic = subscriptionSchema.parse({
      id: '00000000-0000-4000-8000-000000000003',
      profileId: '00000000-0000-4000-8000-000000000011',
      tier: 'basic',
      status: 'active',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
    });

    const legacyUser = mapAppUserToLegacy(
      {
        id: basic.profileId,
        email: 'basic@example.com',
        role: 'player',
        displayName: 'Basic Player',
        isSuspended: false,
      },
      { subscription: basic },
    );
    expect(legacyUser.tier).toBe('basic');
    expect(legacyUser.trialDays).toBe(0);
    expect(effectiveTierForAccess(basic)).toBe('basic');
  });
});

describe('STORY_2_3 AC4 — stripe webhook syncs subscription', () => {
  it('test_STORY_2_3_AC4_stripe_webhook_syncs_subscription: handler maps Stripe event to Supabase upsert', () => {
    expect(existsSync(WEBHOOK_HANDLER_PATH)).toBe(true);

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/sync_subscription_from_stripe/);
    expect(sql).toMatch(/billing_events/);

    const profileId = '00000000-0000-4000-8000-000000000020';
    const result = handleStripeWebhookEvent({
      id: 'evt_test_story_2_3',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_story_2_3',
          customer: 'cus_test_story_2_3',
          status: 'active',
          metadata: {
            profile_id: profileId,
            tier: 'advanced',
          },
          current_period_end: 1_900_000_000,
          trial_end: null,
        },
      },
    });

    expect(result.handled).toBe(true);
    if (!result.handled) {
      throw new Error('expected handled webhook result');
    }
    expect(result.upsert.profile_id).toBe(profileId);
    expect(result.upsert.tier).toBe('advanced');
    expect(result.upsert.status).toBe('active');
    expect(result.upsert.stripe_subscription_id).toBe('sub_test_story_2_3');
    expect(result.upsert.stripe_customer_id).toBe('cus_test_story_2_3');

    // Basil+ payloads put current_period_end on the subscription item.
    const basilResult = handleStripeWebhookEvent({
      id: 'evt_test_story_2_3_basil',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_story_2_3_basil',
          customer: 'cus_test_story_2_3',
          status: 'active',
          metadata: {
            profile_id: profileId,
            tier: 'pro',
          },
          items: {
            data: [{ current_period_end: 1_900_000_000 }],
          },
          trial_end: null,
        },
      },
    });
    expect(basilResult.handled).toBe(true);
    if (!basilResult.handled) {
      throw new Error('expected handled basil webhook result');
    }
    expect(basilResult.upsert.current_period_end).toBe(
      new Date(1_900_000_000 * 1000).toISOString(),
    );
  });
});

describeCloudIntegration('STORY_2_3 — cloud subscription onboarding (optional)', () => {
  let admin;
  let appAuth;
  let subscriptions;
  const createdUserIds = [];

  beforeAll(() => {
    admin = createClient(supabaseEnv.API_URL, supabaseEnv.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const storage = createMemoryAuthStorage();
    const client = createSupabaseClient(
      { url: supabaseEnv.API_URL, anonKey: supabaseEnv.ANON_KEY },
      { storage },
    );
    appAuth = new SupabaseAppAuthRepository(client);
    subscriptions = new SupabaseSubscriptionRepository(client);
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await admin.from('subscriptions').delete().eq('profile_id', userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it('test_STORY_2_3_cloud_trial_and_defer: RPCs persist trial and basic choices', async () => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const trialEmail = `story23.trial.${stamp}@example.com`;
    const trialSignUp = await appAuth.signUp({
      email: trialEmail,
      password: 'story-2.3-pw-123!',
      role: 'coach',
      displayName: 'Story 2.3 Trial',
    });
    expect(trialSignUp.session).not.toBeNull();
    const trialUserId = trialSignUp.session.user.id;
    createdUserIds.push(trialUserId);

    const trialSubscription = await subscriptions.activateTrial(trialUserId);
    expect(trialSubscription.tier).toBe('trial');
    expect(trialSubscription.status).toBe('trialing');
    expect(trialSubscription.trialEndsAt).not.toBeNull();
    expect(effectiveTierForAccess(trialSubscription)).toBe('pro');

    await appAuth.signOut();

    const basicEmail = `story23.basic.${stamp}@example.com`;
    const basicSignUp = await appAuth.signUp({
      email: basicEmail,
      password: 'story-2.3-pw-123!',
      role: 'player',
      displayName: 'Story 2.3 Basic',
    });
    expect(basicSignUp.session).not.toBeNull();
    const basicUserId = basicSignUp.session.user.id;
    createdUserIds.push(basicUserId);

    const basicSubscription = await subscriptions.deferToBasic(basicUserId);
    expect(basicSubscription.tier).toBe('basic');
    expect(basicSubscription.status).toBe('active');
    expect(basicSubscription.trialEndsAt).toBeNull();
  });
});
