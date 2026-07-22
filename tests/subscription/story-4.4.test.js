// STORY-4.4 — Content paywall encounter screens (Flow 10).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  STRIPE_PRODUCT_CATALOG,
  buildCheckoutSessionRequest,
  canActivateTrial,
  paywallCopyForFeature,
  paywallTierOptionsForFeature,
  paywallRequirementPhrase,
  requiredTierForFeature,
  shouldShowPaywallTrialCta,
  unlockedFeaturesForTier,
} from '@coach360/domain';
import {
  buildStripeCheckoutSessionBody,
  createCheckoutSession,
  resolvePriceIdForTier,
} from '../../supabase/functions/create-checkout-session/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const PAYWALL_DOMAIN_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'subscription',
  'paywall.ts',
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
const CHECKOUT_HANDLER_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'create-checkout-session',
  'handler.ts',
);
const CHECKOUT_INDEX_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'create-checkout-session',
  'index.ts',
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
const BILLING_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'billing-repository.ts',
);

describe('STORY_4_4 AC1 — paywall names tier and unlocked features', () => {
  it('test_STORY_4_4_AC1_paywall_names_tier_and_unlocked_features: copy includes required tier + catalog features', () => {
    const aiCopy = paywallCopyForFeature('ai', 'coach');
    expect(aiCopy).not.toBeNull();
    expect(aiCopy.requiredTier).toBe('pro');
    expect(aiCopy.tierLabel).toBe('Pro');
    expect(aiCopy.unlockedFeatures).toEqual(unlockedFeaturesForTier('pro'));
    expect(aiCopy.unlockedFeatures.length).toBeGreaterThan(0);

    const chatCopy = paywallCopyForFeature('chat', 'player');
    expect(chatCopy.requiredTier).toBe('advanced');
    expect(chatCopy.tierLabel).toBe('Advanced');
    expect(chatCopy.unlockedFeatures).toEqual(
      STRIPE_PRODUCT_CATALOG.find((e) => e.tier === 'advanced').features,
    );

    expect(requiredTierForFeature('objectives', 'coach')).toBe('pro');
    expect(requiredTierForFeature('createSession', 'coach')).toBe('advanced');

    // All catalog tiers listed; below-required plans disabled (e.g. Basic for chat).
    const chatPlans = paywallTierOptionsForFeature('chat', 'coach');
    expect(chatPlans.options).toHaveLength(STRIPE_PRODUCT_CATALOG.length);
    expect(chatPlans.options.find((o) => o.tier === 'basic').selectable).toBe(false);
    expect(chatPlans.options.find((o) => o.tier === 'advanced').selectable).toBe(true);
    expect(chatPlans.options.find((o) => o.tier === 'pro').selectable).toBe(true);
    expect(chatPlans.requirementPhrase).toBe('Advanced or above');

    const proPlans = paywallTierOptionsForFeature('ai', 'coach');
    expect(proPlans.options.find((o) => o.tier === 'basic').selectable).toBe(false);
    expect(proPlans.options.find((o) => o.tier === 'advanced').selectable).toBe(false);
    expect(proPlans.options.find((o) => o.tier === 'pro').selectable).toBe(true);
    expect(proPlans.requirementPhrase).toBe('Pro');
    expect(paywallRequirementPhrase('pro')).toBe('Pro');
    expect(paywallRequirementPhrase('advanced')).toBe('Advanced or above');

    expect(existsSync(PAYWALL_DOMAIN_PATH)).toBe(true);
    expect(existsSync(PAYWALL_MODAL_PATH)).toBe(true);
    const modal = readFileSync(PAYWALL_MODAL_PATH, 'utf8');
    expect(modal).toMatch(/paywallTierOptionsForFeature/);
    expect(modal).toMatch(/requirementPhrase/);
    expect(modal).toMatch(/selectable/);
    expect(modal).toMatch(/This requires/);
    expect(modal).toMatch(/Below required|unavailable/);
  });
});

describe('STORY_4_4 AC2 — trial CTA only if unused', () => {
  it('test_STORY_4_4_AC2_trial_cta_only_if_unused: OQ-10.1 always-when-unused', () => {
    expect(shouldShowPaywallTrialCta(null)).toBe(true);
    expect(shouldShowPaywallTrialCta({ trialUsedAt: null })).toBe(true);
    expect(canActivateTrial({ trialUsedAt: null })).toBe(true);

    expect(shouldShowPaywallTrialCta({ trialUsedAt: '2026-01-01T00:00:00.000Z' })).toBe(false);
    expect(canActivateTrial({ trialUsedAt: '2026-01-01T00:00:00.000Z' })).toBe(false);

    expect(existsSync(PAYWALL_MODAL_PATH)).toBe(true);
    const modal = readFileSync(PAYWALL_MODAL_PATH, 'utf8');
    expect(modal).toMatch(/shouldShowPaywallTrialCta/);
    expect(modal).toMatch(/Start free trial/);
    expect(modal).toMatch(/showTrial && onStartTrial/);

    expect(existsSync(APP_PATH)).toBe(true);
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/handlePaywallStartTrial/);
    expect(app).toMatch(/activateTrial/);
  });
});

describe('STORY_4_4 AC3 — dismiss paywall and continue browsing', () => {
  it('test_STORY_4_4_AC3_dismiss_paywall_continues_browsing: OQ-10.2 non-blocking modal', () => {
    expect(existsSync(PAYWALL_MODAL_PATH)).toBe(true);
    const modal = readFileSync(PAYWALL_MODAL_PATH, 'utf8');
    expect(modal).toMatch(/Maybe Later/);
    expect(modal).toMatch(/Browse free content/);
    expect(modal).toMatch(/onClose/);
    expect(modal).toMatch(/onBrowseFree/);
    // Modal overlay — not a full-screen route takeover.
    expect(modal).toMatch(/fixed inset-0/);

    expect(existsSync(APP_PATH)).toBe(true);
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/handlePaywallDismiss/);
    expect(app).toMatch(/function handlePaywallDismiss\(\) \{\s*setPaywall\(null\)/);
    expect(app).toMatch(/handlePaywallBrowseFree/);
    expect(app).toMatch(/setScreen\("marketplace"\)/);
    // Dismiss does not force subscription navigation.
    const dismissSlice = app.slice(app.indexOf('function handlePaywallDismiss'));
    const dismissFn = dismissSlice.slice(0, dismissSlice.indexOf('function handlePaywallBrowseFree'));
    expect(dismissFn).not.toMatch(/go\("subscription"\)|setScreen\("subscription"\)/);
  });
});

describe('STORY_4_4 AC4 — upgrade launches Stripe checkout from paywall', () => {
  it('test_STORY_4_4_AC4_upgrade_launches_stripe_checkout: edge handler + paywall wiring', async () => {
    const req = buildCheckoutSessionRequest({
      tier: 'pro',
      profileId: '00000000-0000-4000-8000-000000000444',
      successUrl: 'https://app.example/?checkout=success',
      cancelUrl: 'https://app.example/?checkout=cancel',
    });
    expect(req.tier).toBe('pro');

    const body = buildStripeCheckoutSessionBody({
      tier: 'pro',
      profileId: req.profileId,
      priceId: 'price_test_pro',
      successUrl: req.successUrl,
      cancelUrl: req.cancelUrl,
    });
    expect(body.mode).toBe('subscription');
    expect(body['line_items[0][price]']).toBe('price_test_pro');
    expect(body['metadata[profile_id]']).toBe(req.profileId);
    expect(body['metadata[tier]']).toBe('pro');
    expect(body['subscription_data[metadata][tier]']).toBe('pro');

    expect(resolvePriceIdForTier('advanced', { STRIPE_PRICE_ADVANCED: 'price_adv' })).toBe(
      'price_adv',
    );

    const createSession = vi.fn(async () => ({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    }));

    const result = await createCheckoutSession({
      input: {
        tier: 'advanced',
        profileId: req.profileId,
        priceId: 'price_test_advanced',
        successUrl: req.successUrl,
        cancelUrl: req.cancelUrl,
      },
      createSession,
    });

    expect(createSession).toHaveBeenCalledOnce();
    expect(result.url).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
    expect(result.tier).toBe('advanced');

    expect(existsSync(CHECKOUT_HANDLER_PATH)).toBe(true);
    expect(existsSync(CHECKOUT_INDEX_PATH)).toBe(true);
    const indexSrc = readFileSync(CHECKOUT_INDEX_PATH, 'utf8');
    expect(indexSrc).toMatch(/createCheckoutSession/);
    expect(indexSrc).toMatch(/api\.stripe\.com\/v1\/checkout\/sessions/);

    expect(existsSync(BILLING_PORT_PATH)).toBe(true);
    expect(readFileSync(BILLING_PORT_PATH, 'utf8')).toMatch(/createCheckoutSession/);
    expect(existsSync(BILLING_REPO_PATH)).toBe(true);
    expect(readFileSync(BILLING_REPO_PATH, 'utf8')).toMatch(
      /functions\.invoke\('create-checkout-session'/,
    );

    expect(existsSync(APP_PATH)).toBe(true);
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/handlePaywallUpgrade/);
    expect(app).toMatch(/createCheckoutSession/);
    expect(app).toMatch(/changeSubscriptionTier/);
    expect(app).toMatch(/window\.location\.assign\(result\.url\)/);
    // Existing Stripe subscriptions update in place; new checkout is still used when needed.
    const upgradeSlice = app.slice(app.indexOf('async function handlePaywallUpgrade'));
    const upgradeFn = upgradeSlice.slice(0, upgradeSlice.indexOf('async function handlePaywallStartTrial'));
    expect(upgradeFn).toMatch(/createCheckoutSession/);
    expect(upgradeFn).toMatch(/subscription && subscription\.stripeSubscriptionId/);
    expect(upgradeFn).toMatch(/repos\.billing\.changeSubscriptionTier/);
    expect(upgradeFn).toMatch(/subscriptionState\.refreshSubscription/);
    expect(upgradeFn).not.toMatch(/go\("subscription"\)/);

    expect(existsSync(PAYWALL_MODAL_PATH)).toBe(true);
    expect(readFileSync(PAYWALL_MODAL_PATH, 'utf8')).toMatch(/onUpgrade/);
  });
});
