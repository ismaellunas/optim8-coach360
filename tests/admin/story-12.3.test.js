// STORY-12.3 — Content and marketplace operations.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DRIP_INTERVAL_BY_TIER,
  DEFAULT_DRIP_INTERVAL_DAYS,
  DRIP_INTERVAL_BY_TIER_SETTING_KEY,
  effectiveDripIntervalDays,
  normalizeDripIntervalByTier,
  normalizeRejectionReason,
} from '@coach360/domain';
import { planMarketplacePackageReview } from '../../supabase/functions/review-marketplace-package/handler.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

const MIGRATION_PATH = 'supabase/migrations/20260727120000_admin_content_marketplace_ops.sql';
const PORT_PATH = 'packages/api/src/ports/content-repository.ts';
const SUPABASE_PATH = 'packages/api/src/adapters/supabase/supabase-content-repository.ts';
const REST_PATH = 'packages/api/src/adapters/rest/rest-content-repository.ts';
const CONTENT_PAGE = 'apps/admin/src/pages/content/ContentPage.tsx';
const STUDIO_PAGE = 'apps/admin/src/pages/studio/StudioPage.tsx';
const ROUTES = 'apps/admin/src/app/router/routes.tsx';
const TRAINING_PACKAGE = 'apps/studio/schemaTypes/trainingPackage.ts';
const REVIEW_HANDLER = 'supabase/functions/review-marketplace-package/handler.ts';
const DOMAIN_DRIP = 'packages/domain/src/marketplace/drip.ts';

const CURRENT = {
  status: 'pending_review',
  published: false,
  stripePriceId: null,
  suggestedPriceCents: 2900,
  priceCents: null,
  currency: 'usd',
};

describe('STORY_12_3 AC1 — pending review queue lists coach-submitted packages', () => {
  it('test_STORY_12_3_AC1_pending_review_queue_lists_coach_packages', () => {
    const port = read(PORT_PATH);
    expect(port).toMatch(/listMarketplaceReviewQueue/);

    const supabase = read(SUPABASE_PATH);
    expect(supabase).toMatch(/pending_review/);
    expect(supabase).toMatch(/created_by_role/);
    // Live Sanity list via edge function (E10-T9 / E12-T14); metadata is fallback.
    expect(supabase).toMatch(/listFromSanity/);
    expect(supabase).toMatch(/body:\s*\{\s*action\s*\}/);
    expect(supabase).toMatch(/'list'/);
    expect(supabase).toMatch(/list_published/);

    const page = read(CONTENT_PAGE);
    expect(page).toMatch(/marketplace-review-queue/);
    expect(page).toMatch(/listMarketplaceReviewQueue/);
    expect(page).toMatch(/Package review queue/);
    expect(page).toMatch(/createdByRole/);
    expect(page).toMatch(/Pending review/);
    expect(page).toMatch(/SANITY_API_TOKEN/);

    const handler = read(REVIEW_HANDLER);
    expect(handler).toMatch(/pending_review/);
    expect(handler).toMatch(/createdByRole/);
    expect(handler).toMatch(/PUBLISHED_LIST_GROQ/);
  });
});

describe('STORY_12_3 AC2 — admin approves, rejects with reason, or publishes', () => {
  it('test_STORY_12_3_AC2_admin_approve_reject_with_reason_or_publish', () => {
    expect(normalizeRejectionReason('  Needs clearer drills  ')).toBe('Needs clearer drills');
    expect(normalizeRejectionReason('   ')).toBeNull();

    const rejectMissing = planMarketplacePackageReview(
      { sanityDocumentId: 'pkg-1', action: 'reject' },
      CURRENT,
    );
    expect(rejectMissing.ok).toBe(false);
    if (!rejectMissing.ok) {
      expect(rejectMissing.error).toBe('rejection_reason_required');
    }

    const rejectOk = planMarketplacePackageReview(
      {
        sanityDocumentId: 'pkg-1',
        action: 'reject',
        rejectionReason: 'Missing module outline',
      },
      CURRENT,
    );
    expect(rejectOk.ok).toBe(true);
    if (rejectOk.ok) {
      expect(rejectOk.nextStatus).toBe('rejected');
      expect(rejectOk.metadata.rejection_reason).toBe('Missing module outline');
      expect(rejectOk.patch.set.rejectionReason).toBe('Missing module outline');
    }

    const approve = planMarketplacePackageReview(
      { sanityDocumentId: 'pkg-1', action: 'approve' },
      CURRENT,
    );
    expect(approve.ok).toBe(true);

    const publish = planMarketplacePackageReview(
      {
        sanityDocumentId: 'pkg-1',
        action: 'publish',
        stripePriceId: 'price_abc',
      },
      { ...CURRENT, status: 'approved' },
    );
    expect(publish.ok).toBe(true);

    const unpublish = planMarketplacePackageReview(
      { sanityDocumentId: 'pkg-1', action: 'unpublish' },
      {
        status: 'approved',
        published: true,
        stripePriceId: 'price_abc',
        suggestedPriceCents: null,
        priceCents: 2900,
        currency: 'usd',
      },
    );
    expect(unpublish.ok).toBe(true);
    if (unpublish.ok) {
      expect(unpublish.published).toBe(false);
    }

    const port = read(PORT_PATH);
    expect(port).toMatch(/rejectMarketplacePackage\(/);
    expect(port).toMatch(/rejectionReason/);
    expect(port).toMatch(/unpublishMarketplacePackage/);

    const page = read(CONTENT_PAGE);
    expect(page).toMatch(/marketplace-reject-reason/);
    expect(page).toMatch(/rejectMarketplacePackage\(input\.id, input\.reason\)/);
    expect(page).toMatch(/unpublishMarketplacePackage/);
    expect(page).toMatch(/marketplace-unpublish/);

    const schema = read(TRAINING_PACKAGE);
    expect(schema).toMatch(/rejectionReason/);

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/rejection_reason/);
  });
});

describe('STORY_12_3 AC3 — Stripe price ID assignable from admin on publish', () => {
  it('test_STORY_12_3_AC3_stripe_price_id_assignable_on_publish', () => {
    const publish = planMarketplacePackageReview(
      {
        sanityDocumentId: 'pkg-1',
        action: 'publish',
        stripePriceId: 'price_admin_99',
        priceCents: 4500,
      },
      {
        status: 'approved',
        published: false,
        stripePriceId: null,
        suggestedPriceCents: 2900,
        priceCents: null,
        currency: 'usd',
      },
    );
    expect(publish.ok).toBe(true);
    if (publish.ok) {
      expect(publish.metadata.stripe_price_id).toBe('price_admin_99');
      expect(publish.metadata.price_cents).toBe(4500);
    }

    const page = read(CONTENT_PAGE);
    expect(page).toMatch(/marketplace-stripe-price-input/);
    expect(page).toMatch(/publishMarketplacePackage/);
    expect(page).toMatch(/Stripe price ID/);
  });
});

describe('STORY_12_3 AC4 — global drip schedule rules configurable per tier', () => {
  it('test_STORY_12_3_AC4_global_drip_rules_configurable_per_tier', () => {
    expect(DRIP_INTERVAL_BY_TIER_SETTING_KEY).toBe('drip_interval_days_by_tier');
    expect(DEFAULT_DRIP_INTERVAL_BY_TIER).toEqual({
      basic: DEFAULT_DRIP_INTERVAL_DAYS,
      advanced: DEFAULT_DRIP_INTERVAL_DAYS,
      pro: DEFAULT_DRIP_INTERVAL_DAYS,
    });

    const rules = normalizeDripIntervalByTier({ basic: 14, advanced: 7, pro: 3 });
    expect(rules).toEqual({ basic: 14, advanced: 7, pro: 3 });

    // Package interval wins when set.
    expect(effectiveDripIntervalDays('pro', 10, rules)).toBe(10);
    // Else tier global rule.
    expect(effectiveDripIntervalDays('basic', null, rules)).toBe(14);
    expect(effectiveDripIntervalDays('pro', null, rules)).toBe(3);
    // Defaults stay equal (OQ-14.3) until admin differentiates.
    expect(effectiveDripIntervalDays('advanced', null, DEFAULT_DRIP_INTERVAL_BY_TIER)).toBe(7);

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/drip_interval_days_by_tier/);
    expect(sql).toMatch(/get_drip_interval_days_by_tier/);
    expect(sql).toMatch(/set_drip_interval_days_by_tier/);
    expect(sql).toMatch(/admin_required/);
    expect(sql).toMatch(/get_drip_interval_days_by_tier\(\)/);

    const domain = read(DOMAIN_DRIP);
    expect(domain).toMatch(/DRIP_INTERVAL_BY_TIER_SETTING_KEY/);
    expect(domain).toMatch(/normalizeDripIntervalByTier/);

    const port = read(PORT_PATH);
    expect(port).toMatch(/getDripIntervalByTier/);
    expect(port).toMatch(/setDripIntervalByTier/);

    const supabase = read(SUPABASE_PATH);
    expect(supabase).toMatch(/get_drip_interval_days_by_tier/);
    expect(supabase).toMatch(/set_drip_interval_days_by_tier/);

    const rest = read(REST_PATH);
    expect(rest).toMatch(/getDripIntervalByTier/);
    expect(rest).toMatch(/setDripIntervalByTier/);

    const page = read(CONTENT_PAGE);
    expect(page).toMatch(/global-drip-rules/);
    expect(page).toMatch(/Global drip schedule rules/);
    expect(page).toMatch(/drip-interval-basic/);
    expect(page).toMatch(/drip-interval-advanced/);
    expect(page).toMatch(/drip-interval-pro/);
    expect(page).toMatch(/setDripIntervalByTier/);
  });
});

describe('STORY_12_3 AC5 — link to Sanity Studio for content authoring', () => {
  it('test_STORY_12_3_AC5_link_to_sanity_studio', () => {
    const page = read(CONTENT_PAGE);
    expect(page).toMatch(/Open Sanity Studio/);
    expect(page).toMatch(/adminPaths\.studio/);

    const routes = read(ROUTES);
    expect(routes).toMatch(/StudioPage/);
    expect(routes).toMatch(/adminPaths\.studio/);

    const studio = read(STUDIO_PAGE);
    expect(studio).toMatch(/createSanityConfig/);
    expect(studio).toMatch(/basePath: '\/admin\/studio'/);
  });
});

describe('STORY_12_3 structure — Content page has no direct supabase', () => {
  it('test_STORY_12_3_structure_content_page_has_no_direct_supabase', () => {
    const page = read(CONTENT_PAGE);
    expect(page).not.toMatch(/createClient/);
    expect(page).not.toMatch(/from\(['"]package_metadata['"]\)/);
    expect(page).toMatch(/useRepositories/);
  });
});
