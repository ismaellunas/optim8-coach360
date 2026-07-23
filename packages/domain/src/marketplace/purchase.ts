import { meetsTierMinimum, type SubscriptionTier } from '../subscription/expiry.js';

/** Marketplace purchase scope (STORY-10.1). */
export type MarketplacePurchaseScope = 'personal' | 'team';

export function isMarketplacePurchaseScope(value: string): value is MarketplacePurchaseScope {
  return value === 'personal' || value === 'team';
}

/**
 * AC-4 — coach Advanced+ may purchase for team distribution.
 * Players and team managers use personal purchase only in this story.
 */
export function canPurchaseForTeamDistribution(
  role: string | null | undefined,
  tier: SubscriptionTier | null | undefined,
): boolean {
  if (role !== 'coach' || !tier) return false;
  return meetsTierMinimum(tier, 'advanced');
}

export type CreatePackageCheckoutRequest = {
  sanityDocumentId: string;
  scope: MarketplacePurchaseScope;
  teamId?: string | null;
  successUrl: string;
  cancelUrl: string;
};

export function assertPackageCheckoutRequest(input: {
  sanityDocumentId?: string | null;
  scope?: string | null;
  teamId?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
}): CreatePackageCheckoutRequest {
  const sanityDocumentId = input.sanityDocumentId?.trim();
  if (!sanityDocumentId) {
    throw new Error('package_id_required');
  }
  const scopeRaw = input.scope?.trim() || 'personal';
  if (!isMarketplacePurchaseScope(scopeRaw)) {
    throw new Error(`invalid_purchase_scope:${scopeRaw}`);
  }
  if (!input.successUrl?.trim() || !input.cancelUrl?.trim()) {
    throw new Error('checkout_urls_required');
  }
  const teamId = input.teamId?.trim() || null;
  if (scopeRaw === 'team' && !teamId) {
    throw new Error('team_id_required_for_team_purchase');
  }
  if (scopeRaw === 'personal' && teamId) {
    throw new Error('team_id_not_allowed_for_personal_purchase');
  }
  return {
    sanityDocumentId,
    scope: scopeRaw,
    teamId,
    successUrl: input.successUrl.trim(),
    cancelUrl: input.cancelUrl.trim(),
  };
}
