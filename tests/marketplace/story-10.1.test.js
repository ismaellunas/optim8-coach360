// STORY-10.1 — Marketplace browse and purchase (catalog + Stripe package checkout).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canPurchaseForTeamDistribution,
  assertPackageCheckoutRequest,
  formatPackagePriceLabel,
  mapSanityPackageToCatalog,
  normalizePackageRating,
  PUBLISHED_PACKAGES_GROQ,
} from '@coach360/domain';
import {
  buildStripePackageCheckoutSessionBody,
  createPackageCheckoutSession,
} from '../../supabase/functions/create-package-checkout-session/handler.ts';
import {
  buildPurchaseUpsert,
  handleStripeWebhookEvent,
} from '../../supabase/functions/stripe-webhook/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const STORE_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'marketplace',
  'ui',
  'StoreScreen.jsx',
);
const PLAYER_CONTENT = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'content',
  'ui',
  'PlayerContentScreen.jsx',
);
const CHECKOUT_HANDLER = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'create-package-checkout-session',
  'handler.ts',
);
const CHECKOUT_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'create-package-checkout-session',
  'index.ts',
);
const MIGRATION = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260723120000_marketplace_purchases.sql',
);
const STAKEHOLDER_Q = path.join(REPO_ROOT, 'docs', 'product', 'stakeholder-questions.md');
const DOMAIN_PURCHASE = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'marketplace',
  'purchase.ts',
);
const PURCHASE_PORT = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'marketplace-purchase-repository.ts',
);

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

describe('STORY_10_1 AC1 — Marketplace lists published packages with title, price, rating, skills tags', () => {
  it('test_STORY_10_1_AC1_catalog_lists_title_price_rating_skills', () => {
    expect(PUBLISHED_PACKAGES_GROQ).toMatch(/priceCents/);
    expect(PUBLISHED_PACKAGES_GROQ).toMatch(/rating/);
    expect(PUBLISHED_PACKAGES_GROQ).toMatch(/skills/);

    const mapped = mapSanityPackageToCatalog({
      _id: 'seed.coach360.elite-shooting.package',
      title: 'Elite Shooting System',
      skills: ['shooting', 'form'],
      priceCents: 2900,
      rating: 4.8,
      moduleCount: 1,
    });
    expect(mapped).not.toBeNull();
    expect(mapped.title).toBe('Elite Shooting System');
    expect(mapped.priceLabel).toBe('$29');
    expect(mapped.rating).toBe(4.8);
    expect(mapped.skills).toEqual(['shooting', 'form']);
    expect(formatPackagePriceLabel(2500)).toBe('$25');
    expect(normalizePackageRating(4.75)).toBe(4.8);

    const store = read(STORE_UI);
    expect(store).toMatch(/package-price|priceLabel|p\.p/);
    expect(store).toMatch(/package-rating|rating/);
    expect(store).toMatch(/package-skills|skills/);
    expect(store).toMatch(/marketplaceCatalog\.listPublished/);
  });
});

describe('STORY_10_1 AC2 — Package detail has no outline/drip preview (OQ-4.6 = no)', () => {
  it('test_STORY_10_1_AC2_no_outline_or_drip_preview_before_purchase', () => {
    const q = read(STAKEHOLDER_Q);
    expect(q).toMatch(/4\.6[\s\S]*?\|\s*\*\*No\.\*\*/i);

    const store = read(STORE_UI);
    expect(store).toMatch(/OQ-4\.6/);
    expect(store).not.toMatch(/data-testid=["']package-outline["']/);
    expect(store).not.toMatch(/data-testid=["']drip-preview["']/);
    // Pre-purchase detail must not advertise drip schedule preview copy.
    expect(store).not.toMatch(/Drip:\s*/);
    expect(store).not.toMatch(/outline preview/i);

    const player = read(PLAYER_CONTENT);
    expect(player).toMatch(/OQ-4\.6/);
    expect(player).not.toMatch(/Drip:\s*/);
  });
});

describe('STORY_10_1 AC3 — Stripe checkout completes purchase and records in Supabase', () => {
  it('test_STORY_10_1_AC3_stripe_checkout_records_purchase', async () => {
    expect(existsSync(CHECKOUT_HANDLER)).toBe(true);
    expect(existsSync(CHECKOUT_INDEX)).toBe(true);
    expect(existsSync(MIGRATION)).toBe(true);
    expect(existsSync(PURCHASE_PORT)).toBe(true);

    const migration = read(MIGRATION);
    expect(migration).toMatch(/sync_purchase_from_stripe/);
    expect(migration).toMatch(/scope/);

    const body = buildStripePackageCheckoutSessionBody({
      profileId: 'profile-1',
      sanityDocumentId: 'seed.coach360.elite-shooting.package',
      priceId: 'price_test_pkg',
      scope: 'personal',
      successUrl: 'https://app.test/?checkout=success',
      cancelUrl: 'https://app.test/?checkout=cancel',
    });
    expect(body.mode).toBe('payment');
    expect(body['metadata[kind]']).toBe('marketplace_purchase');
    expect(body['metadata[sanity_document_id]']).toBe('seed.coach360.elite-shooting.package');

    const session = await createPackageCheckoutSession({
      input: {
        profileId: 'profile-1',
        sanityDocumentId: 'seed.coach360.elite-shooting.package',
        priceId: 'price_test_pkg',
        scope: 'personal',
        successUrl: 'https://app.test/?ok',
        cancelUrl: 'https://app.test/?cancel',
      },
      createSession: async () => ({
        id: 'cs_test_pkg',
        url: 'https://checkout.stripe.test/cs_test_pkg',
      }),
    });
    expect(session.url).toContain('checkout.stripe.test');

    const result = handleStripeWebhookEvent({
      id: 'evt_pkg_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_pkg',
          mode: 'payment',
          payment_status: 'paid',
          amount_total: 2900,
          currency: 'usd',
          payment_intent: 'pi_test_pkg',
          metadata: {
            kind: 'marketplace_purchase',
            profile_id: 'profile-1',
            sanity_document_id: 'seed.coach360.elite-shooting.package',
            scope: 'personal',
          },
        },
      },
    });
    expect(result.handled).toBe(true);
    expect(result.kind).toBe('purchase_upsert');
    expect(result.purchase.sanity_document_id).toBe('seed.coach360.elite-shooting.package');
    expect(result.purchase.stripe_payment_intent_id).toBe('pi_test_pkg');
    expect(result.purchase.amount_cents).toBe(2900);

    const purchase = buildPurchaseUpsert({
      id: 'cs',
      amount_total: 1000,
      currency: 'usd',
      payment_intent: { id: 'pi_x' },
      metadata: {
        kind: 'marketplace_purchase',
        profile_id: 'p1',
        sanity_document_id: 'pkg',
        scope: 'personal',
      },
    });
    expect(purchase.buyer_id).toBe('p1');

    const store = read(STORE_UI);
    expect(store).toMatch(/marketplacePurchases\.createCheckoutSession/);
    const indexSrc = read(CHECKOUT_INDEX);
    expect(indexSrc).toMatch(/createPackageCheckoutSession/);
  });
});

describe('STORY_10_1 AC4 — Coach at Advanced+ can purchase for team distribution', () => {
  it('test_STORY_10_1_AC4_coach_advanced_team_purchase', () => {
    expect(existsSync(DOMAIN_PURCHASE)).toBe(true);
    expect(canPurchaseForTeamDistribution('coach', 'advanced')).toBe(true);
    expect(canPurchaseForTeamDistribution('coach', 'pro')).toBe(true);
    expect(canPurchaseForTeamDistribution('coach', 'basic')).toBe(false);
    expect(canPurchaseForTeamDistribution('player', 'pro')).toBe(false);
    expect(canPurchaseForTeamDistribution('team', 'advanced')).toBe(false);

    const req = assertPackageCheckoutRequest({
      sanityDocumentId: 'pkg-1',
      scope: 'team',
      teamId: 'team-1',
      successUrl: 'https://ok',
      cancelUrl: 'https://cancel',
    });
    expect(req.scope).toBe('team');
    expect(req.teamId).toBe('team-1');

    expect(() =>
      assertPackageCheckoutRequest({
        sanityDocumentId: 'pkg-1',
        scope: 'team',
        successUrl: 'https://ok',
        cancelUrl: 'https://cancel',
      }),
    ).toThrow(/team_id_required/);

    const body = buildStripePackageCheckoutSessionBody({
      profileId: 'coach-1',
      sanityDocumentId: 'pkg-1',
      priceId: 'price_team',
      scope: 'team',
      teamId: 'team-1',
      successUrl: 'https://ok',
      cancelUrl: 'https://cancel',
    });
    expect(body['metadata[scope]']).toBe('team');
    expect(body['metadata[team_id]']).toBe('team-1');

    const webhook = handleStripeWebhookEvent({
      id: 'evt_team_pkg',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_team',
          payment_status: 'paid',
          amount_total: 2500,
          currency: 'usd',
          payment_intent: 'pi_team',
          metadata: {
            kind: 'marketplace_purchase',
            profile_id: 'coach-1',
            sanity_document_id: 'pkg-1',
            scope: 'team',
            team_id: 'team-1',
          },
        },
      },
    });
    expect(webhook.handled).toBe(true);
    expect(webhook.purchase.scope).toBe('team');
    expect(webhook.purchase.team_id).toBe('team-1');

    const store = read(STORE_UI);
    expect(store).toMatch(/canPurchaseForTeamDistribution/);
    expect(store).toMatch(/purchase-scope-team|For team/);
    expect(store).toMatch(/team-purchase/);

    const migration = read(MIGRATION);
    expect(migration).toMatch(/team_id/);
    expect(migration).toMatch(/scope = 'team'/);
  });
});
