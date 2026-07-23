// STORY-10.4 — Marketplace supply and approval workflow (Path B).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MARKETPLACE_PRICING_MODEL,
  MARKETPLACE_SUPPLY_MODEL,
  PUBLISHED_PACKAGES_GROQ,
  WORKFLOW_STATUSES,
  canApproveOrRejectPackage,
  canCreateMarketplacePackage,
  canPublishMarketplacePackage,
  canSetPackagePublished,
  canTransitionWorkflowStatus,
  resolvePublishPricing,
} from '@coach360/domain';
import {
  planMarketplacePackageReview,
  REVIEW_QUEUE_GROQ,
} from '../../supabase/functions/review-marketplace-package/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const WORKFLOW = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'marketplace', 'workflow.ts');
const CONTENT_PAGE = path.join(
  REPO_ROOT,
  'apps',
  'admin',
  'src',
  'pages',
  'content',
  'ContentPage.tsx',
);
const CONTENT_PORT = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'content-repository.ts',
);
const CONTENT_ADAPTER = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-content-repository.ts',
);
const REVIEW_HANDLER = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'review-marketplace-package',
  'handler.ts',
);
const REVIEW_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'review-marketplace-package',
  'index.ts',
);
const TRAINING_PACKAGE = path.join(
  REPO_ROOT,
  'apps',
  'studio',
  'schemaTypes',
  'trainingPackage.ts',
);
const WORKFLOW_FIELDS = path.join(
  REPO_ROOT,
  'apps',
  'studio',
  'schemaTypes',
  'objects',
  'workflowFields.ts',
);
const CATALOG = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'content',
  'marketplace-catalog.ts',
);
const STAKEHOLDER = path.join(REPO_ROOT, 'docs', 'product', 'stakeholder-questions.md');
const CONTENT_MODEL = path.join(REPO_ROOT, 'docs', 'architecture', 'content-model.md');
const MIGRATION = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260723180000_marketplace_supply_workflow.sql',
);

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

describe('STORY_10_4 AC1 — workflow draft → pending_review → approved/rejected → published', () => {
  it('test_STORY_10_4_AC1_workflow_transitions', () => {
    expect(WORKFLOW_STATUSES).toEqual(['draft', 'pending_review', 'approved', 'rejected']);

    expect(canTransitionWorkflowStatus('draft', 'pending_review', 'coach')).toBe(true);
    expect(canTransitionWorkflowStatus('draft', 'pending_review', 'admin')).toBe(true);
    expect(canTransitionWorkflowStatus('pending_review', 'approved', 'admin')).toBe(true);
    expect(canTransitionWorkflowStatus('pending_review', 'rejected', 'admin')).toBe(true);
    expect(canTransitionWorkflowStatus('pending_review', 'approved', 'coach')).toBe(false);
    expect(canTransitionWorkflowStatus('draft', 'approved', 'admin')).toBe(true);
    expect(canTransitionWorkflowStatus('draft', 'approved', 'coach')).toBe(false);

    expect(
      canSetPackagePublished({
        status: 'approved',
        stripePriceId: 'price_abc',
        actor: 'admin',
      }),
    ).toBe(true);
    expect(
      canSetPackagePublished({
        status: 'pending_review',
        stripePriceId: 'price_abc',
        actor: 'admin',
      }),
    ).toBe(false);
    expect(
      canSetPackagePublished({
        status: 'approved',
        stripePriceId: '',
        actor: 'admin',
      }),
    ).toBe(false);
    expect(
      canSetPackagePublished({
        status: 'approved',
        stripePriceId: 'price_abc',
        actor: 'coach',
      }),
    ).toBe(false);

    const approve = planMarketplacePackageReview(
      { sanityDocumentId: 'pkg-1', action: 'approve' },
      {
        status: 'pending_review',
        published: false,
        stripePriceId: null,
        suggestedPriceCents: 2900,
        priceCents: null,
        currency: 'usd',
      },
    );
    expect(approve.ok).toBe(true);
    if (approve.ok) {
      expect(approve.nextStatus).toBe('approved');
      expect(approve.published).toBe(false);
    }

    const reject = planMarketplacePackageReview(
      { sanityDocumentId: 'pkg-1', action: 'reject' },
      {
        status: 'pending_review',
        published: false,
        stripePriceId: null,
        suggestedPriceCents: null,
        priceCents: null,
        currency: null,
      },
    );
    expect(reject.ok).toBe(true);
    if (reject.ok) {
      expect(reject.nextStatus).toBe('rejected');
    }

    const workflowFields = read(WORKFLOW_FIELDS);
    expect(workflowFields).toMatch(/Publish requires workflow status Approved/);
    expect(workflowFields).toMatch(/Publish requires a Stripe price ID/);
  });
});

describe('STORY_10_4 AC2 — Admin approves or rejects from dashboard', () => {
  it('test_STORY_10_4_AC2_admin_dashboard_approve_reject', () => {
    expect(existsSync(CONTENT_PAGE)).toBe(true);
    expect(existsSync(CONTENT_PORT)).toBe(true);
    expect(existsSync(CONTENT_ADAPTER)).toBe(true);
    expect(existsSync(REVIEW_HANDLER)).toBe(true);
    expect(existsSync(REVIEW_INDEX)).toBe(true);

    const page = read(CONTENT_PAGE);
    expect(page).toMatch(/marketplace-review-queue/);
    expect(page).toMatch(/listMarketplaceReviewQueue/);
    expect(page).toMatch(/approveMarketplacePackage/);
    expect(page).toMatch(/rejectMarketplacePackage/);
    expect(page).toMatch(/marketplace-approve/);
    expect(page).toMatch(/marketplace-reject/);
    expect(page).toMatch(/Package review queue/);

    const port = read(CONTENT_PORT);
    expect(port).toMatch(/listMarketplaceReviewQueue/);
    expect(port).toMatch(/approveMarketplacePackage/);
    expect(port).toMatch(/rejectMarketplacePackage/);
    expect(port).toMatch(/publishMarketplacePackage/);

    const adapter = read(CONTENT_ADAPTER);
    expect(adapter).toMatch(/review-marketplace-package/);
    expect(adapter).toMatch(/listMarketplaceReviewQueue/);

    const indexSrc = read(REVIEW_INDEX);
    expect(indexSrc).toMatch(/admin_required/);
    expect(indexSrc).toMatch(/planMarketplacePackageReview/);
    expect(indexSrc).toMatch(/role !== 'admin'/);

    expect(REVIEW_QUEUE_GROQ).toMatch(/pending_review/);
    expect(canApproveOrRejectPackage('admin')).toBe(true);
    expect(canApproveOrRejectPackage('coach')).toBe(false);
  });
});

describe('STORY_10_4 AC3 — Published packages appear with Stripe price ID', () => {
  it('test_STORY_10_4_AC3_published_requires_stripe_price_in_catalog', () => {
    const publishOk = planMarketplacePackageReview(
      {
        sanityDocumentId: 'pkg-1',
        action: 'publish',
        stripePriceId: 'price_live_123',
        priceCents: 3500,
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
    expect(publishOk.ok).toBe(true);
    if (publishOk.ok) {
      expect(publishOk.published).toBe(true);
      expect(publishOk.metadata.stripe_price_id).toBe('price_live_123');
      expect(publishOk.metadata.price_cents).toBe(3500);
    }

    const publishMissingPrice = planMarketplacePackageReview(
      { sanityDocumentId: 'pkg-1', action: 'publish' },
      {
        status: 'approved',
        published: false,
        stripePriceId: null,
        suggestedPriceCents: 2900,
        priceCents: null,
        currency: 'usd',
      },
    );
    expect(publishMissingPrice.ok).toBe(false);
    if (!publishMissingPrice.ok) {
      expect(publishMissingPrice.error).toBe('stripe_price_id_required');
    }

    expect(PUBLISHED_PACKAGES_GROQ).toMatch(/published == true/);
    expect(PUBLISHED_PACKAGES_GROQ).toMatch(/stripePriceId/);

    const catalog = read(CATALOG);
    expect(catalog).toMatch(/stripePriceId/);

    const page = read(CONTENT_PAGE);
    expect(page).toMatch(/publishMarketplacePackage/);
    expect(page).toMatch(/marketplace-stripe-price-input/);
    expect(page).toMatch(/Publish to marketplace/);

    const pricing = resolvePublishPricing({
      suggestedPriceCents: 2900,
      adminPriceCents: 3500,
      adminStripePriceId: 'price_override',
    });
    expect(pricing.stripePriceId).toBe('price_override');
    expect(pricing.priceCents).toBe(3500);
    expect(pricing.usedCoachSuggestion).toBe(false);

    const fromSuggestion = resolvePublishPricing({
      suggestedPriceCents: 2900,
      adminPriceCents: null,
      adminStripePriceId: 'price_from_admin',
    });
    expect(fromSuggestion.priceCents).toBe(2900);
    expect(fromSuggestion.usedCoachSuggestion).toBe(true);
  });
});

describe('STORY_10_4 AC4 — Supply model coaches submit with admin approval', () => {
  it('test_STORY_10_4_AC4_coach_submit_admin_approval_supply_model', () => {
    expect(MARKETPLACE_SUPPLY_MODEL).toBe('both_with_approval');
    expect(MARKETPLACE_PRICING_MODEL).toBe('coach_suggests_admin_overrides');
    expect(canCreateMarketplacePackage('coach')).toBe(true);
    expect(canCreateMarketplacePackage('admin')).toBe(true);
    expect(canPublishMarketplacePackage('admin')).toBe(true);
    expect(canPublishMarketplacePackage('coach')).toBe(false);

    expect(existsSync(WORKFLOW)).toBe(true);
    expect(existsSync(MIGRATION)).toBe(true);

    const trainingPackage = read(TRAINING_PACKAGE);
    expect(trainingPackage).toMatch(/createdByRole/);
    expect(trainingPackage).toMatch(/suggestedPriceCents/);
    expect(trainingPackage).toMatch(/OQ-4\.1/);
    expect(trainingPackage).toMatch(/OQ-4\.4/);

    const stakeholder = read(STAKEHOLDER);
    expect(stakeholder).toMatch(/Both \(with approval\)/);
    expect(stakeholder).toMatch(/draft → pending_review → approved/);
    expect(stakeholder).toMatch(/Coach suggests; admin approves and may override/);

    const contentModel = read(CONTENT_MODEL);
    expect(contentModel).toMatch(/both with approval/i);
    expect(contentModel).toMatch(/draft → pending_review → approved/);

    const migration = read(MIGRATION);
    expect(migration).toMatch(/suggested_price_cents/);
    expect(migration).toMatch(/created_by_role/);
  });
});
