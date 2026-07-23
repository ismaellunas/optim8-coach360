/**
 * Path B marketplace supply + approval workflow (STORY-10.4).
 *
 * OQ-4.1 — Both (with approval): coaches and admins may create packages;
 *          coach listings require admin approval before publish.
 * OQ-4.3 — draft → pending_review → approved | rejected → published (boolean).
 * OQ-4.4 — Coach may suggest a price; admin approves and may override.
 */

export const WORKFLOW_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export type WorkflowActor = 'coach' | 'admin';

/** OQ-4.1 — coaches submit; admins may also author and publish. */
export const MARKETPLACE_SUPPLY_MODEL = 'both_with_approval' as const;

/** OQ-4.4 — coach suggests; admin sets final Stripe price / display price. */
export const MARKETPLACE_PRICING_MODEL = 'coach_suggests_admin_overrides' as const;

export function isWorkflowStatus(value: unknown): value is WorkflowStatus {
  return typeof value === 'string' && (WORKFLOW_STATUSES as readonly string[]).includes(value);
}

export function canCreateMarketplacePackage(actor: WorkflowActor): boolean {
  return actor === 'coach' || actor === 'admin';
}

export function canApproveOrRejectPackage(actor: WorkflowActor): boolean {
  return actor === 'admin';
}

export function canPublishMarketplacePackage(actor: WorkflowActor): boolean {
  return actor === 'admin';
}

/**
 * Valid workflow status transitions (published is a separate boolean).
 * Coaches may submit / resubmit; only admins approve or reject.
 */
export function canTransitionWorkflowStatus(
  from: WorkflowStatus,
  to: WorkflowStatus,
  actor: WorkflowActor,
): boolean {
  if (from === to) return true;

  if (from === 'draft' && to === 'pending_review') {
    return actor === 'coach' || actor === 'admin';
  }
  // Admin-authored shortcut: approve without a review queue hop.
  if (from === 'draft' && to === 'approved') {
    return actor === 'admin';
  }
  if (from === 'pending_review' && (to === 'approved' || to === 'rejected')) {
    return actor === 'admin';
  }
  if (from === 'rejected' && (to === 'draft' || to === 'pending_review')) {
    return actor === 'coach' || actor === 'admin';
  }
  if (from === 'approved' && to === 'rejected') {
    return actor === 'admin';
  }
  if (from === 'approved' && to === 'pending_review') {
    return actor === 'admin';
  }

  return false;
}

export type PublishPreconditions = {
  status: WorkflowStatus | null | undefined;
  stripePriceId: string | null | undefined;
  actor: WorkflowActor;
};

/**
 * Publish requires approved status, a non-empty Stripe price ID, and an admin actor.
 */
export function canSetPackagePublished(input: PublishPreconditions): boolean {
  if (input.actor !== 'admin') return false;
  if (input.status !== 'approved') return false;
  return Boolean(input.stripePriceId?.trim());
}

export type ResolvePublishPricingInput = {
  /** Coach-suggested display price in minor units (OQ-4.4). */
  suggestedPriceCents: number | null | undefined;
  /** Admin override display price; wins when set. */
  adminPriceCents: number | null | undefined;
  /** Final Stripe Price id — admin-owned; required to publish. */
  adminStripePriceId: string | null | undefined;
};

export type ResolvedPublishPricing = {
  priceCents: number | null;
  stripePriceId: string;
  usedCoachSuggestion: boolean;
};

/**
 * Admin always supplies/overrides the Stripe price ID.
 * Display price: admin override if provided, else coach suggestion.
 */
export function resolvePublishPricing(
  input: ResolvePublishPricingInput,
): ResolvedPublishPricing {
  const stripePriceId = input.adminStripePriceId?.trim() || '';
  if (!stripePriceId) {
    throw new Error('stripe_price_id_required');
  }

  const hasAdminPrice =
    typeof input.adminPriceCents === 'number' &&
    Number.isFinite(input.adminPriceCents) &&
    input.adminPriceCents >= 0;

  if (hasAdminPrice) {
    return {
      priceCents: input.adminPriceCents as number,
      stripePriceId,
      usedCoachSuggestion: false,
    };
  }

  const hasSuggestion =
    typeof input.suggestedPriceCents === 'number' &&
    Number.isFinite(input.suggestedPriceCents) &&
    input.suggestedPriceCents >= 0;

  return {
    priceCents: hasSuggestion ? (input.suggestedPriceCents as number) : null,
    stripePriceId,
    usedCoachSuggestion: hasSuggestion,
  };
}

export type ReviewAction = 'approve' | 'reject' | 'publish';

export function nextStatusForReviewAction(
  current: WorkflowStatus,
  action: ReviewAction,
): WorkflowStatus {
  if (action === 'approve') {
    if (!canTransitionWorkflowStatus(current, 'approved', 'admin')) {
      throw new Error(`invalid_transition:${current}->approved`);
    }
    return 'approved';
  }
  if (action === 'reject') {
    if (!canTransitionWorkflowStatus(current, 'rejected', 'admin')) {
      throw new Error(`invalid_transition:${current}->rejected`);
    }
    return 'rejected';
  }
  // publish does not change workflow status; status must already be approved
  if (current !== 'approved') {
    throw new Error(`publish_requires_approved:got_${current}`);
  }
  return current;
}
