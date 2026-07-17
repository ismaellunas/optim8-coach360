import { canActivateTrial } from './trial.js';
import {
  STRIPE_PRODUCT_CATALOG,
  getStripeCatalogEntry,
  isPaidSubscriptionTier,
  type PaidSubscriptionTier,
} from './catalog.js';
import type { Subscription, SubscriptionTier } from './schema.js';
import { meetsTierMinimum } from './expiry.js';

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

/** Roles a feature flag override can target (admin bypasses gating, so excluded). */
export type GatedRole = Exclude<PaywallRole, 'admin'>;

/** Feature keys the base matrix gates — the only keys an admin override may target (STORY-5.3). */
export const GATED_FEATURE_KEYS: string[] = Object.keys(FEATURE_TIER_REQUIREMENTS);

/** Admin-configured override for one (feature, role) pair (STORY-5.3 AC-1/AC-2). */
export type FeatureFlagOverride = {
  feature: string;
  role: GatedRole;
  requiredTier: PaidSubscriptionTier;
  paywallTitle?: string | null;
  paywallMessage?: string | null;
};

/**
 * Merge admin overrides into the code-defined FEATURE_TIER_REQUIREMENTS.
 * Only (feature, role) pairs already present in the base matrix can be
 * overridden — an override cannot newly gate a role that wasn't gated before.
 */
export function applyFeatureFlagOverrides(
  overrides: readonly FeatureFlagOverride[],
): Record<string, Partial<Record<GatedRole, PaidSubscriptionTier>>> {
  const merged: Record<string, Partial<Record<GatedRole, PaidSubscriptionTier>>> = {};
  for (const [feature, reqs] of Object.entries(FEATURE_TIER_REQUIREMENTS)) {
    merged[feature] = { ...reqs };
  }
  for (const override of overrides) {
    const reqs = merged[override.feature];
    if (!reqs || !(override.role in reqs)) {
      continue;
    }
    reqs[override.role] = override.requiredTier;
  }
  return merged;
}

/** Paywall copy override lookup, keyed by feature + role (STORY-5.3 AC-2). */
function findCopyOverride(
  overrides: readonly FeatureFlagOverride[],
  feature: string,
  role: GatedRole,
): FeatureFlagOverride | null {
  return overrides.find((entry) => entry.feature === feature && entry.role === role) ?? null;
}

export function requiredTierForFeature(
  feature: string,
  role: PaywallRole,
  overrides: readonly FeatureFlagOverride[] = [],
): PaidSubscriptionTier | null {
  if (role === 'admin') {
    return null;
  }
  const reqs = applyFeatureFlagOverrides(overrides)[feature];
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
  /** Admin-edited paywall copy override (STORY-5.3 AC-2), null when unset. */
  paywallTitle: string | null;
  paywallMessage: string | null;
};

export function paywallCopyForFeature(
  feature: string,
  role: PaywallRole,
  overrides: readonly FeatureFlagOverride[] = [],
): PaywallEncounterCopy | null {
  const requiredTier = requiredTierForFeature(feature, role, overrides);
  if (!requiredTier) {
    return null;
  }
  const entry = getStripeCatalogEntry(requiredTier);
  const copyOverride =
    role === 'admin' ? null : findCopyOverride(overrides, feature, role);
  return {
    requiredTier,
    tierLabel: entry.label,
    unlockedFeatures: [...entry.features],
    displayPrice: entry.displayPrice,
    paywallTitle: copyOverride?.paywallTitle ?? null,
    paywallMessage: copyOverride?.paywallMessage ?? null,
  };
}

export type PaywallTierOption = {
  tier: PaidSubscriptionTier;
  label: string;
  displayPrice: string;
  accent: 'green' | 'blue' | 'orange';
  features: string[];
  /** False when this plan is below the feature's required tier. */
  selectable: boolean;
};

/** True when at least one paid catalog tier ranks above the given tier. */
export function hasHigherPaidTier(tier: PaidSubscriptionTier): boolean {
  return STRIPE_PRODUCT_CATALOG.some((entry) => meetsTierMinimum(entry.tier, tier) && entry.tier !== tier);
}

/**
 * Requirement line for the paywall: "Pro" when max tier; otherwise "Advanced or above".
 */
export function paywallRequirementPhrase(requiredTier: PaidSubscriptionTier): string {
  const label = getStripeCatalogEntry(requiredTier).label;
  if (!hasHigherPaidTier(requiredTier)) {
    return label;
  }
  return `${label} or above`;
}

/**
 * Full catalog for the paywall: tiers below the minimum stay visible but disabled.
 */
export function paywallTierOptionsForFeature(
  feature: string,
  role: PaywallRole,
  overrides: readonly FeatureFlagOverride[] = [],
): {
  requiredTier: PaidSubscriptionTier;
  tierLabel: string;
  requirementPhrase: string;
  options: PaywallTierOption[];
} | null {
  const requiredTier = requiredTierForFeature(feature, role, overrides);
  if (!requiredTier) {
    return null;
  }

  const options = STRIPE_PRODUCT_CATALOG.map((entry) => ({
    tier: entry.tier,
    label: entry.label,
    displayPrice: entry.displayPrice,
    accent: entry.accent,
    features: [...entry.features],
    selectable: meetsTierMinimum(entry.tier, requiredTier),
  }));

  return {
    requiredTier,
    tierLabel: getStripeCatalogEntry(requiredTier).label,
    requirementPhrase: paywallRequirementPhrase(requiredTier),
    options,
  };
}

/** Admin-maintained free-to-browse item at Basic tier (STORY-5.3 AC-3). */
export type FreeContentCatalogItem = {
  id: string;
  title: string;
  category: string | null;
};

/**
 * OQ-10.4: whether a catalog item is free to browse at Basic tier —
 * true when the admin-maintained catalog lists it by id.
 */
export function isFreeAtBasicTier(
  contentId: string,
  catalog: readonly FreeContentCatalogItem[],
): boolean {
  return catalog.some((item) => item.id === contentId);
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
