/**
 * Pure helpers for admin marketplace package review (STORY-10.4 / STORY-12.3).
 * Self-contained for Deno edge + vitest (mirrors packages/domain marketplace/workflow).
 */

export type WorkflowStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
export type ReviewAction = 'approve' | 'reject' | 'publish' | 'unpublish';

export type ReviewPackageRequest = {
  sanityDocumentId?: string;
  action?: string;
  stripePriceId?: string | null;
  priceCents?: number | null;
  currency?: string | null;
  /** Required when action is reject (STORY-12.3 AC-2). */
  rejectionReason?: string | null;
};

export type ReviewPackageCurrent = {
  status: string | null;
  published: boolean;
  stripePriceId: string | null;
  suggestedPriceCents: number | null;
  priceCents: number | null;
  currency: string | null;
};

export type SanityPackagePatch = {
  set: Record<string, unknown>;
};

export type ReviewPackagePlan =
  | {
      ok: true;
      sanityDocumentId: string;
      action: ReviewAction;
      nextStatus: WorkflowStatus;
      published: boolean;
      patch: SanityPackagePatch;
      metadata: {
        workflow_status: WorkflowStatus;
        published: boolean;
        stripe_price_id: string | null;
        price_cents: number | null;
        currency: string | null;
        rejection_reason: string | null;
      };
    }
  | { ok: false; error: string };

const STATUSES: WorkflowStatus[] = ['draft', 'pending_review', 'approved', 'rejected'];

function isWorkflowStatus(value: unknown): value is WorkflowStatus {
  return typeof value === 'string' && (STATUSES as string[]).includes(value);
}

function asAction(value: string | undefined): ReviewAction | null {
  if (value === 'approve' || value === 'reject' || value === 'publish' || value === 'unpublish') {
    return value;
  }
  return null;
}

function canAdminTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  if (from === to) return true;
  if (from === 'draft' && (to === 'pending_review' || to === 'approved')) return true;
  if (from === 'pending_review' && (to === 'approved' || to === 'rejected')) return true;
  if (from === 'rejected' && (to === 'draft' || to === 'pending_review')) return true;
  if (from === 'approved' && (to === 'rejected' || to === 'pending_review')) return true;
  return false;
}

function normalizeRejectionReason(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validate admin review request against current package state and build Sanity patch.
 */
export function planMarketplacePackageReview(
  body: ReviewPackageRequest,
  current: ReviewPackageCurrent,
): ReviewPackagePlan {
  const sanityDocumentId = body.sanityDocumentId?.trim() || '';
  if (!sanityDocumentId) {
    return { ok: false, error: 'sanity_document_id_required' };
  }

  const action = asAction(body.action);
  if (!action) {
    return { ok: false, error: 'invalid_action' };
  }

  const currentStatus = isWorkflowStatus(current.status) ? current.status : 'draft';

  if (action === 'approve') {
    if (!canAdminTransition(currentStatus, 'approved')) {
      return { ok: false, error: `invalid_transition:${currentStatus}->approved` };
    }
    return {
      ok: true,
      sanityDocumentId,
      action,
      nextStatus: 'approved',
      published: false,
      patch: { set: { status: 'approved', published: false, rejectionReason: '' } },
      metadata: {
        workflow_status: 'approved',
        published: false,
        stripe_price_id: current.stripePriceId,
        price_cents: current.priceCents,
        currency: current.currency,
        rejection_reason: null,
      },
    };
  }

  if (action === 'reject') {
    if (!canAdminTransition(currentStatus, 'rejected')) {
      return { ok: false, error: `invalid_transition:${currentStatus}->rejected` };
    }
    const rejectionReason = normalizeRejectionReason(body.rejectionReason);
    if (!rejectionReason) {
      return { ok: false, error: 'rejection_reason_required' };
    }
    return {
      ok: true,
      sanityDocumentId,
      action,
      nextStatus: 'rejected',
      published: false,
      patch: { set: { status: 'rejected', published: false, rejectionReason } },
      metadata: {
        workflow_status: 'rejected',
        published: false,
        stripe_price_id: current.stripePriceId,
        price_cents: current.priceCents,
        currency: current.currency,
        rejection_reason: rejectionReason,
      },
    };
  }

  if (action === 'unpublish') {
    if (currentStatus !== 'approved') {
      return { ok: false, error: `unpublish_requires_approved:got_${currentStatus}` };
    }
    if (!current.published) {
      return { ok: false, error: 'unpublish_requires_published' };
    }
    return {
      ok: true,
      sanityDocumentId,
      action,
      nextStatus: 'approved',
      published: false,
      patch: { set: { status: 'approved', published: false } },
      metadata: {
        workflow_status: 'approved',
        published: false,
        stripe_price_id: current.stripePriceId,
        price_cents: current.priceCents,
        currency: current.currency,
        rejection_reason: null,
      },
    };
  }

  // publish — requires approved + Stripe price ID (admin may override coach suggestion)
  if (currentStatus !== 'approved') {
    return { ok: false, error: `publish_requires_approved:got_${currentStatus}` };
  }

  const stripePriceId = (body.stripePriceId ?? current.stripePriceId)?.trim() || '';
  if (!stripePriceId) {
    return { ok: false, error: 'stripe_price_id_required' };
  }

  const hasAdminPrice =
    typeof body.priceCents === 'number' &&
    Number.isFinite(body.priceCents) &&
    body.priceCents >= 0;

  const hasSuggestion =
    typeof current.suggestedPriceCents === 'number' &&
    Number.isFinite(current.suggestedPriceCents) &&
    current.suggestedPriceCents >= 0;

  const priceCents = hasAdminPrice
    ? body.priceCents!
    : hasSuggestion
      ? current.suggestedPriceCents
      : current.priceCents;

  const currency =
    (typeof body.currency === 'string' && body.currency.trim()
      ? body.currency.trim().toLowerCase()
      : null) ||
    current.currency ||
    'usd';

  const set: Record<string, unknown> = {
    status: 'approved',
    published: true,
    stripePriceId,
    currency,
    rejectionReason: '',
  };
  if (typeof priceCents === 'number') {
    set.priceCents = priceCents;
  }

  return {
    ok: true,
    sanityDocumentId,
    action,
    nextStatus: 'approved',
    published: true,
    patch: { set },
    metadata: {
      workflow_status: 'approved',
      published: true,
      stripe_price_id: stripePriceId,
      price_cents: typeof priceCents === 'number' ? priceCents : null,
      currency,
      rejection_reason: null,
    },
  };
}

export type SanityMutateBody = {
  mutations: Array<{ patch: { id: string; set: Record<string, unknown> } }>;
};

export function buildSanityPatchMutation(
  documentId: string,
  patch: SanityPackagePatch,
): SanityMutateBody {
  return {
    mutations: [{ patch: { id: documentId, set: patch.set } }],
  };
}

/** Shared projection fields for admin marketplace lists. */
const LIST_PROJECTION = `{
  _id,
  title,
  status,
  published,
  stripePriceId,
  suggestedPriceCents,
  priceCents,
  currency,
  createdByRole,
  rejectionReason
}`;

/** GROQ for admin review queue (pending + approved-unpublished). */
export const REVIEW_QUEUE_GROQ = `*[_type == "trainingPackage" && (status == "pending_review" || (status == "approved" && published != true))]|order(title asc)${LIST_PROJECTION}`;

/** GROQ for admin published marketplace listings (E12-T15). */
export const PUBLISHED_LIST_GROQ = `*[_type == "trainingPackage" && published == true]|order(title asc)${LIST_PROJECTION}`;
