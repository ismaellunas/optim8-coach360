import { canActivateTrial } from './trial.js';
import {
  getStripeCatalogEntry,
  isPaidSubscriptionTier,
  type PaidSubscriptionTier,
} from './catalog.js';
import type { Subscription, SubscriptionTier } from './schema.js';

/** Role keys used by mobile access checks (legacy App roles). */
export type PaywallRole = 'coach' | 'player' | 'team' | 'admin';

/**
 * Feature → minimum paid tier by role (Flow 10 / access matrix).
 * Mirrors mobile FEATURE_REQS; admin is open in UI and omitted here.
 */
export const FEATURE_TIER_REQUIREMENTS: Record<
  string,
  Partial<Record<Exclude<PaywallRole, 'admin'>, PaidSubscriptionTier>>
> = {
  chat: { coach: 'advanced', player: 'advanced' },
  createSession: { coach: 'advanced' },
  distribute: { coach: 'advanced' },
  objectives: { coach: 'pro', player: 'pro' },
  ai: { coach: 'pro', player: 'pro' },
  createContent: { coach: 'advanced' },
  teamManage: { coach: 'basic', team: 'basic' },
  invitePlayers: { coach: 'advanced', team: 'basic' },
  removePlayers: { coach: 'advanced', team: 'basic' },
  assignCoach: { coach: 'pro', team: 'advanced' },
  viewProgress: { coach: 'advanced', player: 'basic' },
  purchase: { coach: 'basic', player: 'basic' },
  peerShare: { coach: 'advanced', player: 'advanced' },
  feedback: { coach: 'advanced', player: 'advanced' },
};

const TIER_LABELS: Record<PaidSubscriptionTier, string> = {
  basic: 'Basic',
  advanced: 'Advanced',
  pro: 'Pro',
};

export function requiredTierForFeature(
  feature: string,
  role: PaywallRole,
): PaidSubscriptionTier | null {
  if (role === 'admin') {
    return null;
  }
  const reqs = FEATURE_TIER_REQUIREMENTS[feature];
  if (!reqs) {
    return null;
  }
  return reqs[role] ?? null;
}

export function tierDisplayLabel(tier: PaidSubscriptionTier | SubscriptionTier): string {
  if (isPaidSubscriptionTier(tier)) {
    return TIER_LABELS[tier];
  }
  if (tier === 'trial') {
    return 'Trial';
  }
  return tier;
}

/** Catalog feature bullets unlocked at/with the required paid tier. */
export function unlockedFeaturesForTier(tier: PaidSubscriptionTier): string[] {
  return [...getStripeCatalogEntry(tier).features];
}

export type PaywallEncounterCopy = {
  requiredTier: PaidSubscriptionTier;
  tierLabel: string;
  unlockedFeatures: string[];
  displayPrice: string;
};

export function paywallCopyForFeature(
  feature: string,
  role: PaywallRole,
): PaywallEncounterCopy | null {
  const requiredTier = requiredTierForFeature(feature, role);
  if (!requiredTier) {
    return null;
  }
  const entry = getStripeCatalogEntry(requiredTier);
  return {
    requiredTier,
    tierLabel: entry.label,
    unlockedFeatures: [...entry.features],
    displayPrice: entry.displayPrice,
  };
}

/**
 * OQ-10.1: always offer trial on every paywall when unused.
 * Uses canActivateTrial (one trial per account).
 */
export function shouldShowPaywallTrialCta(
  subscription: Pick<Subscription, 'trialUsedAt'> | null,
): boolean {
  return canActivateTrial(subscription);
}

export type CheckoutSessionRequest = {
  tier: PaidSubscriptionTier;
  profileId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string | null;
};

/**
 * Params the create-checkout-session edge function needs to open Stripe Checkout
 * for the required subscription tier (STORY-4.4 AC-4).
 */
export function buildCheckoutSessionRequest(input: CheckoutSessionRequest): CheckoutSessionRequest {
  if (!isPaidSubscriptionTier(input.tier)) {
    throw new Error(`invalid_checkout_tier:${String(input.tier)}`);
  }
  if (!input.profileId) {
    throw new Error('checkout_profile_id_required');
  }
  if (!input.successUrl || !input.cancelUrl) {
    throw new Error('checkout_urls_required');
  }
  return {
    tier: input.tier,
    profileId: input.profileId,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    customerId: input.customerId ?? null,
  };
}
