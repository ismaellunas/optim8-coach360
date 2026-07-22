// STORY-4.1 — Stripe products, prices, and webhook sync.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  STRIPE_PRODUCT_CATALOG,
  canViewBillingHistory,
  isSubscriptionPaymentLocked,
  lockedStateMessage,
  resolveTierFromStripePriceMetadata,
  subscriptionSchema,
} from '@coach360/domain';
import {
  STRIPE_MONTHLY_CATALOG_TIERS,
  handleStripeWebhookEvent,
  resolveTierFromStripeSubscription,
} from '../../supabase/functions/stripe-webhook/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260709120000_stripe_billing_history.sql',
);
const ONBOARDING_MIGRATION_PATH = path.join(
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
const WEBHOOK_INDEX_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'stripe-webhook',
  'index.ts',
);
const CATALOG_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'subscription',
  'catalog.ts',
);
const BILLING_RULES_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'subscription',
  'billing.ts',
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
const PROFILE_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'profile',
  'ui',
  'ProfileScreen.jsx',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
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
const SUPABASE_CONFIG_PATH = path.join(REPO_ROOT, 'supabase', 'config.toml');

describe('STORY_4_1 AC1 — Stripe products Basic/Advanced/Pro monthly', () => {
  it('test_STORY_4_1_AC1_stripe_products_basic_advanced_pro_monthly: catalog defines three monthly paid tiers', () => {
    expect(existsSync(CATALOG_PATH)).toBe(true);
    expect(STRIPE_PRODUCT_CATALOG).toHaveLength(3);
    expect(STRIPE_MONTHLY_CATALOG_TIERS).toEqual(['basic', 'advanced', 'pro']);

    const tiers = STRIPE_PRODUCT_CATALOG.map((entry) => entry.tier);
    expect(tiers).toEqual(['basic', 'advanced', 'pro']);

    for (const entry of STRIPE_PRODUCT_CATALOG) {
      expect(entry.interval).toBe('month');
      expect(entry.currency).toBe('usd');
      expect(entry.unitAmountCents).toBeGreaterThan(0);
      expect(entry.priceIdEnvKey).toMatch(/^STRIPE_PRICE_/);
      expect(entry.priceMetadataTier).toBe(entry.tier);
      expect(entry.displayPrice).toMatch(/\$\d+\/mo/);
    }

    expect(STRIPE_PRODUCT_CATALOG[0].unitAmountCents).toBe(900);
    expect(STRIPE_PRODUCT_CATALOG[1].unitAmountCents).toBe(2900);
    expect(STRIPE_PRODUCT_CATALOG[2].unitAmountCents).toBe(4900);

    expect(resolveTierFromStripePriceMetadata('advanced')).toBe('advanced');
    expect(resolveTierFromStripePriceMetadata('enterprise')).toBeNull();

    expect(
      resolveTierFromStripeSubscription({
        id: 'sub_price_meta',
        customer: 'cus_1',
        status: 'active',
        items: {
          data: [{ price: { id: 'price_advanced', metadata: { tier: 'advanced' } } }],
        },
      }),
    ).toBe('advanced');

    expect(existsSync(CHOICE_SCREEN_PATH)).toBe(true);
    const choice = readFileSync(CHOICE_SCREEN_PATH, 'utf8');
    expect(choice).toMatch(/STRIPE_PRODUCT_CATALOG/);
  });
});

describe('STORY_4_1 AC1.5 — checkout success and webhook delivery reconcile billing', () => {
  it('test_STORY_4_1_AC1_5_checkout_success_retries_subscription_and_webhook_is_public: client polls after redirect and webhook skips JWT', () => {
    expect(existsSync(SUBSCRIPTION_GATE_PATH)).toBe(true);
    const gate = readFileSync(SUBSCRIPTION_GATE_PATH, 'utf8');
    expect(gate).toMatch(/checkoutStatus !== 'success' && checkoutStatus !== 'cancel'/);
    expect(gate).toMatch(/window\.history\.replaceState/);
    expect(gate).toMatch(/CHECKOUT_SYNC_ATTEMPTS = 5/);
    expect(gate).toMatch(/await loadSubscription\(\)/);

    expect(existsSync(SUPABASE_CONFIG_PATH)).toBe(true);
    const config = readFileSync(SUPABASE_CONFIG_PATH, 'utf8');
    expect(config).toMatch(/\[functions\.stripe-webhook\]/);
    expect(config).toMatch(/verify_jwt = false/);
  });
});

describe('STORY_4_1 AC2 — webhook updates subscription tier and status', () => {
  it('test_STORY_4_1_AC2_webhook_updates_subscription_tier_and_status: handler upserts tier/status for Supabase sync', () => {
    expect(existsSync(WEBHOOK_HANDLER_PATH)).toBe(true);
    expect(existsSync(WEBHOOK_INDEX_PATH)).toBe(true);
    expect(existsSync(ONBOARDING_MIGRATION_PATH)).toBe(true);

    const sql = readFileSync(ONBOARDING_MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/sync_subscription_from_stripe/);
    expect(sql).toMatch(/billing_events/);

    const indexSrc = readFileSync(WEBHOOK_INDEX_PATH, 'utf8');
    expect(indexSrc).toMatch(/sync_subscription_from_stripe/);

    const profileId = '00000000-0000-4000-8000-000000000041';
    const result = handleStripeWebhookEvent({
      id: 'evt_story_4_1_ac2',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_story_4_1_ac2',
          customer: 'cus_story_4_1_ac2',
          status: 'active',
          metadata: {
            profile_id: profileId,
            tier: 'pro',
          },
          items: {
            data: [{ price: { metadata: { tier: 'pro' } } }],
          },
          current_period_end: 1_900_000_000,
          trial_end: null,
        },
      },
    });

    expect(result.handled).toBe(true);
    if (!result.handled || result.kind !== 'subscription_upsert') {
      throw new Error('expected subscription_upsert webhook result');
    }
    expect(result.upsert.profile_id).toBe(profileId);
    expect(result.upsert.tier).toBe('pro');
    expect(result.upsert.status).toBe('active');
    expect(result.upsert.stripe_subscription_id).toBe('sub_story_4_1_ac2');
    expect(result.upsert.stripe_customer_id).toBe('cus_story_4_1_ac2');
  });
});

describe('STORY_4_1 AC3 — failed payment transitions to locked state', () => {
  it('test_STORY_4_1_AC3_failed_payment_transitions_to_locked_state: payment_failed maps to past_due lock', () => {
    expect(existsSync(BILLING_RULES_PATH)).toBe(true);
    expect(existsSync(MIGRATION_PATH)).toBe(true);

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/mark_subscription_past_due_by_customer/);

    expect(isSubscriptionPaymentLocked('past_due')).toBe(true);
    expect(isSubscriptionPaymentLocked('incomplete')).toBe(true);
    expect(isSubscriptionPaymentLocked('active')).toBe(false);
    expect(lockedStateMessage('past_due')).toMatch(/Payment failed/i);

    const profileId = '00000000-0000-4000-8000-000000000042';
    const result = handleStripeWebhookEvent({
      id: 'evt_story_4_1_ac3',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_story_4_1_ac3',
          customer: 'cus_story_4_1_ac3',
          status: 'open',
          metadata: { profile_id: profileId },
        },
      },
    });

    expect(result.handled).toBe(true);
    if (!result.handled || result.kind !== 'payment_failed') {
      throw new Error('expected payment_failed webhook result');
    }
    expect(result.lockedStatus).toBe('past_due');
    expect(result.profileId).toBe(profileId);
    expect(result.stripeCustomerId).toBe('cus_story_4_1_ac3');

    const unpaidSub = handleStripeWebhookEvent({
      id: 'evt_story_4_1_ac3_unpaid',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_unpaid',
          customer: 'cus_unpaid',
          status: 'unpaid',
          metadata: { profile_id: profileId, tier: 'advanced' },
        },
      },
    });
    expect(unpaidSub.handled).toBe(true);
    if (!unpaidSub.handled || unpaidSub.kind !== 'subscription_upsert') {
      throw new Error('expected subscription upsert for unpaid');
    }
    expect(unpaidSub.upsert.status).toBe('past_due');
    expect(isSubscriptionPaymentLocked(unpaidSub.upsert.status)).toBe(true);

    expect(existsSync(SUBSCRIPTION_SCREEN_PATH)).toBe(true);
    const screen = readFileSync(SUBSCRIPTION_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/isSubscriptionPaymentLocked/);
    expect(screen).toMatch(/Payment issue|Locked/);
  });
});

describe('STORY_4_1 AC4 — billing history viewable at Basic+', () => {
  it('test_STORY_4_1_AC4_billing_history_viewable_at_basic_plus: gate, repo, and account settings UI', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    expect(existsSync(BILLING_REPO_PATH)).toBe(true);
    expect(existsSync(SUBSCRIPTION_SCREEN_PATH)).toBe(true);
    expect(existsSync(PROFILE_SCREEN_PATH)).toBe(true);
    expect(existsSync(APP_PATH)).toBe(true);

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/billing_invoices/);
    expect(sql).toMatch(/sync_billing_invoice_from_stripe/);
    expect(sql).toMatch(/billing_invoices_owner_select/);

    const repo = readFileSync(BILLING_REPO_PATH, 'utf8');
    expect(repo).toMatch(/listByProfileId/);
    expect(repo).toMatch(/billing_invoices/);

    const screen = readFileSync(SUBSCRIPTION_SCREEN_PATH, 'utf8');
    expect(screen).toMatch(/BillingHistorySection/);
    expect(screen).toMatch(/canViewBillingHistory/);
    expect(screen).toMatch(/Billing history/);

    const profile = readFileSync(PROFILE_SCREEN_PATH, 'utf8');
    expect(profile).toMatch(/Manage Subscription/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/features\/profile\/ui\/ProfileScreen/);
    expect(app).toMatch(/features\/subscription\/ui\/SubscriptionScreen/);

    expect(
      canViewBillingHistory(
        subscriptionSchema.parse({
          id: '00000000-0000-4000-8000-000000000050',
          profileId: '00000000-0000-4000-8000-000000000051',
          tier: 'basic',
          status: 'active',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
          trialEndsAt: null,
        }),
      ),
    ).toBe(true);

    expect(
      canViewBillingHistory(
        subscriptionSchema.parse({
          id: '00000000-0000-4000-8000-000000000052',
          profileId: '00000000-0000-4000-8000-000000000053',
          tier: 'advanced',
          status: 'active',
          stripeCustomerId: 'cus_1',
          stripeSubscriptionId: 'sub_1',
          currentPeriodEnd: null,
          trialEndsAt: null,
        }),
      ),
    ).toBe(true);

    expect(canViewBillingHistory(null)).toBe(false);

    const invoiceResult = handleStripeWebhookEvent({
      id: 'evt_story_4_1_ac4_invoice',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_story_4_1_paid',
          customer: 'cus_story_4_1',
          amount_paid: 2900,
          currency: 'usd',
          status: 'paid',
          hosted_invoice_url: 'https://invoice.stripe.com/i/test',
          invoice_pdf: null,
          period_start: 1_700_000_000,
          period_end: 1_702_592_000,
          status_transitions: { paid_at: 1_700_000_100 },
          metadata: {
            profile_id: '00000000-0000-4000-8000-000000000054',
          },
        },
      },
    });

    expect(invoiceResult.handled).toBe(true);
    if (!invoiceResult.handled || invoiceResult.kind !== 'invoice_upsert') {
      throw new Error('expected invoice_upsert webhook result');
    }
    expect(invoiceResult.invoice.amount_cents).toBe(2900);
    expect(invoiceResult.invoice.status).toBe('paid');
    expect(invoiceResult.invoice.stripe_invoice_id).toBe('in_story_4_1_paid');
  });
});
