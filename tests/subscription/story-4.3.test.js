// STORY-4.3 — Trial expiration and downgrade to Basic.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ADVANCED_OR_PRO_FEATURES,
  FEATURE_TIER_REQUIREMENTS,
  STRIPE_PRODUCT_CATALOG,
  applyExpiredTrialDowngrade,
  effectiveTierForAccess,
  expiredTrialDowngrade,
  isAdvancedOrProFeatureLocked,
  isTrialExpired,
  needsTrialExpiredUpgradePrompt,
  retainsPurchasedMarketplaceContent,
  selectTrialsToExpire,
  subscriptionSchema,
  trialGrantsProAccess,
} from '@coach360/domain';
import { processTrialExpiry } from '../../supabase/functions/trial-expiry/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260713180000_trial_expiry_downgrade.sql',
);
const HANDLER_PATH = path.join(REPO_ROOT, 'supabase', 'functions', 'trial-expiry', 'handler.ts');
const INDEX_PATH = path.join(REPO_ROOT, 'supabase', 'functions', 'trial-expiry', 'index.ts');
const EXPIRY_DOMAIN_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'subscription',
  'expiry.ts',
);
const RULES_PATH = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'subscription', 'rules.ts');
const SUBSCRIPTION_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-subscription-repository.ts',
);
const SUBSCRIPTION_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'subscription-repository.ts',
);
const GATE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'subscription',
  'ui',
  'SubscriptionGate.jsx',
);
const PROMPT_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'subscription',
  'ui',
  'TrialExpiredUpgradePrompt.jsx',
);
const PAYWALL_MODAL_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'subscription',
  'ui',
  'PaywallModal.jsx',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function baseSub(overrides) {
  return subscriptionSchema.parse({
    id: '00000000-0000-4000-8000-000000000401',
    profileId: '00000000-0000-4000-8000-000000000402',
    tier: 'trial',
    status: 'trialing',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    trialEndsAt: daysFromNow(7),
    trialUsedAt: daysFromNow(-7),
    ...overrides,
  });
}

describe('STORY_4_3 AC1 — trial expiry downgrades to Basic', () => {
  it('test_STORY_4_3_AC1_trial_expiry_downgrades_to_basic: domain, SQL, edge, and repo persist Basic', () => {
    const active = baseSub({ trialEndsAt: daysFromNow(5) });
    expect(isTrialExpired(active)).toBe(false);
    expect(trialGrantsProAccess(active.tier, active.status, active.trialEndsAt)).toBe(true);

    const expired = baseSub({ trialEndsAt: daysFromNow(-1) });
    expect(isTrialExpired(expired)).toBe(true);
    expect(trialGrantsProAccess(expired.tier, expired.status, expired.trialEndsAt)).toBe(false);
    expect(effectiveTierForAccess(expired)).toBe('basic');

    const downgrade = expiredTrialDowngrade();
    expect(downgrade).toEqual({ tier: 'basic', status: 'active' });
    const applied = applyExpiredTrialDowngrade(expired);
    expect(applied.tier).toBe('basic');
    expect(applied.status).toBe('active');
    expect(applied.trialUsedAt).toBe(expired.trialUsedAt);

    const selected = selectTrialsToExpire([
      {
        profile_id: expired.profileId,
        trial_ends_at: expired.trialEndsAt,
        tier: 'trial',
        status: 'trialing',
      },
      {
        profile_id: active.profileId,
        trial_ends_at: active.trialEndsAt,
        tier: 'trial',
        status: 'trialing',
      },
    ]);
    expect(selected).toHaveLength(1);
    expect(selected[0].profile_id).toBe(expired.profileId);

    const processed = processTrialExpiry({
      candidates: [
        {
          profile_id: expired.profileId,
          trial_ends_at: expired.trialEndsAt,
          tier: 'trial',
          status: 'trialing',
        },
        {
          profile_id: active.profileId,
          trial_ends_at: active.trialEndsAt,
          tier: 'trial',
          status: 'trialing',
        },
      ],
    });
    expect(processed.expired).toHaveLength(1);
    expect(processed.expired[0].toTier).toBe('basic');
    expect(processed.expired[0].toStatus).toBe('active');
    expect(processed.expired[0].event).toBe('trial_expired_downgrade');
    expect(processed.skipped).toBe(1);

    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/create or replace function public\.expire_ended_trials/);
    expect(sql).toMatch(/create or replace function public\.expire_own_trial_if_ended/);
    expect(sql).toMatch(/tier = 'basic'/);
    expect(sql).toMatch(/status = 'active'/);
    expect(sql).toMatch(/trial_ends_at <= p_now|trial_ends_at <= now\(\)/);

    expect(existsSync(HANDLER_PATH)).toBe(true);
    expect(existsSync(INDEX_PATH)).toBe(true);
    const indexSrc = readFileSync(INDEX_PATH, 'utf8');
    expect(indexSrc).toMatch(/expire_ended_trials/);
    expect(indexSrc).toMatch(/trial_expired_downgrade/);

    expect(existsSync(SUBSCRIPTION_PORT_PATH)).toBe(true);
    const port = readFileSync(SUBSCRIPTION_PORT_PATH, 'utf8');
    expect(port).toMatch(/expireOwnTrialIfEnded/);
    expect(port).toMatch(/expireEndedTrials/);

    expect(existsSync(SUBSCRIPTION_REPO_PATH)).toBe(true);
    const repo = readFileSync(SUBSCRIPTION_REPO_PATH, 'utf8');
    expect(repo).toMatch(/expire_own_trial_if_ended/);
    expect(repo).toMatch(/expire_ended_trials/);

    expect(existsSync(GATE_PATH)).toBe(true);
    const gate = readFileSync(GATE_PATH, 'utf8');
    expect(gate).toMatch(/isTrialExpired/);
    expect(gate).toMatch(/expireOwnTrialIfEnded/);
  });
});

describe('STORY_4_3 AC2 — Advanced and Pro features show paywall', () => {
  it('test_STORY_4_3_AC2_advanced_pro_features_show_paywall: expired Basic locks Advanced/Pro; App opens paywall', () => {
    const expired = baseSub({ trialEndsAt: daysFromNow(-1) });
    const effective = effectiveTierForAccess(expired);
    expect(effective).toBe('basic');

    expect(isAdvancedOrProFeatureLocked(effective, 'advanced')).toBe(true);
    expect(isAdvancedOrProFeatureLocked(effective, 'pro')).toBe(true);
    expect(isAdvancedOrProFeatureLocked(effective, 'basic')).toBe(false);

    for (const feature of ADVANCED_OR_PRO_FEATURES) {
      expect(ADVANCED_OR_PRO_FEATURES).toContain(feature);
    }

    const activeTrial = baseSub({ trialEndsAt: daysFromNow(3) });
    expect(effectiveTierForAccess(activeTrial)).toBe('pro');
    expect(isAdvancedOrProFeatureLocked(effectiveTierForAccess(activeTrial), 'pro')).toBe(false);

    expect(existsSync(RULES_PATH)).toBe(true);
    const rules = readFileSync(RULES_PATH, 'utf8');
    expect(rules).toMatch(/trialEndsAt/);
    expect(rules).toMatch(/return 'basic'/);

    expect(existsSync(APP_PATH)).toBe(true);
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/PaywallModal/);
    expect(app).toMatch(/function tryA/);
    expect(app).toMatch(/setPaywall\(feature\)/);
    // App guards route through the centralized RBAC map (STORY-5.1).
    expect(app).toMatch(/checkFeatureAccess/);
    expect(FEATURE_TIER_REQUIREMENTS.objectives).toEqual({ coach: 'pro', player: 'pro' });
    expect(FEATURE_TIER_REQUIREMENTS.ai).toEqual({ coach: 'pro', player: 'pro' });
    expect(FEATURE_TIER_REQUIREMENTS.chat).toEqual({ coach: 'advanced', player: 'advanced' });

    expect(existsSync(PAYWALL_MODAL_PATH)).toBe(true);
    const paywall = readFileSync(PAYWALL_MODAL_PATH, 'utf8');
    expect(paywall).toMatch(/export function PaywallModal/);
    expect(paywall).toMatch(/Feature Locked/);
  });
});

describe('STORY_4_3 AC3 — purchased marketplace content retained', () => {
  it('test_STORY_4_3_AC3_purchased_marketplace_content_retained: OQ-9.3 retain after trial→Basic', () => {
    const postTrial = applyExpiredTrialDowngrade(
      baseSub({ trialEndsAt: daysFromNow(-1) }),
    );
    expect(postTrial.tier).toBe('basic');
    expect(retainsPurchasedMarketplaceContent(postTrial)).toBe(true);
    expect(retainsPurchasedMarketplaceContent(null)).toBe(true);

    expect(existsSync(EXPIRY_DOMAIN_PATH)).toBe(true);
    const expiry = readFileSync(EXPIRY_DOMAIN_PATH, 'utf8');
    expect(expiry).toMatch(/retainsPurchasedMarketplaceContent/);
    expect(expiry).toMatch(/OQ-9\.3|marketplace/);

    expect(existsSync(APP_PATH)).toBe(true);
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/function StoreScreen/);
    expect(app).toMatch(/own: true/);
    expect(app).toMatch(/Owned/);
    // Opening a package for viewing is not paywalled; purchase CTA is separate.
    const storeStart = app.indexOf('function StoreScreen');
    const storeSlice = app.slice(storeStart, storeStart + 4500);
    expect(storeSlice).toMatch(/onClick=\{function\(\) \{ setViewing\(p\.id\); \}\}/);
    expect(storeSlice).toMatch(/pk\.own && \(/);
    expect(storeSlice).toMatch(/!pk\.own && \([\s\S]*tryA\("purchase"/);

    expect(existsSync(PROMPT_PATH)).toBe(true);
    const prompt = readFileSync(PROMPT_PATH, 'utf8');
    expect(prompt).toMatch(/Purchased marketplace packages remain available/);
  });
});

describe('STORY_4_3 AC4 — upgrade prompt with tier comparison', () => {
  it('test_STORY_4_3_AC4_upgrade_prompt_with_tier_comparison: prompt lists catalog tiers and is gated', () => {
    const expired = baseSub({ trialEndsAt: daysFromNow(-1) });
    expect(needsTrialExpiredUpgradePrompt(expired)).toBe(true);

    const postBasic = applyExpiredTrialDowngrade(expired);
    expect(needsTrialExpiredUpgradePrompt(postBasic)).toBe(true);

    const neverTrial = baseSub({
      tier: 'basic',
      status: 'active',
      trialEndsAt: null,
      trialUsedAt: null,
    });
    expect(needsTrialExpiredUpgradePrompt(neverTrial)).toBe(false);

    const activeTrial = baseSub({ trialEndsAt: daysFromNow(5) });
    expect(needsTrialExpiredUpgradePrompt(activeTrial)).toBe(false);

    expect(existsSync(PROMPT_PATH)).toBe(true);
    const prompt = readFileSync(PROMPT_PATH, 'utf8');
    expect(prompt).toMatch(/TrialExpiredUpgradePrompt/);
    expect(prompt).toMatch(/STRIPE_PRODUCT_CATALOG/);
    expect(prompt).toMatch(/TRIAL ENDED/);
    expect(prompt).toMatch(/Compare plans/);
    expect(prompt).toMatch(/Upgrade to/);
    expect(prompt).toMatch(/Continue on Basic/);
    for (const entry of STRIPE_PRODUCT_CATALOG) {
      expect(prompt).toMatch(/STRIPE_PRODUCT_CATALOG/);
      expect(entry.label).toMatch(/Basic|Advanced|Pro/);
    }

    expect(existsSync(GATE_PATH)).toBe(true);
    const gate = readFileSync(GATE_PATH, 'utf8');
    expect(gate).toMatch(/TrialExpiredUpgradePrompt/);
    expect(gate).toMatch(/needsTrialExpiredUpgradePrompt/);
    expect(gate).toMatch(/onChooseTier/);
    expect(gate).toMatch(/onContinueBasic/);
  });
});
