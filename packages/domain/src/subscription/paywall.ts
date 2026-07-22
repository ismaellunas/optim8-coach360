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
  // STORY-5.2 AC-1: chat Advanced+ for coach, player, and team manager.
  chat: { coach: 'advanced', player: 'advanced', team: 'advanced' },
  createSession: { coach: 'advanced', team: 'advanced' },
  distribute: { coach: 'advanced' },
  objectives: { coach: 'pro', player: 'pro' },
  // STORY-5.2 AC-2 / OQ-6.5: AI Pro-only for all gated roles.
  ai: { coach: 'pro', player: 'pro', team: 'pro' },
  // STORY-5.2 AC-3: coach content creation Advanced+.
  createContent: { coach: 'advanced' },
  teamManage: { coach: 'basic', team: 'basic' },
  invitePlayers: { coach: 'advanced', team: 'basic' },
  removePlayers: { coach: 'advanced', team: 'basic' },
  assignCoach: { coach: 'pro', team: 'advanced' },
  // Coach Basic is ◎ read-only (full at Advanced+); player Basic is ◎ (full at Pro).
  viewProgress: { coach: 'basic', player: 'basic' },
  purchase: { coach: 'basic', player: 'basic', team: 'basic' },
  peerShare: { coach: 'advanced', player: 'advanced' },
  // STORY-8.3 AC-3 / OQ-18.3 interim — aggregated peer engagement at Pro.
  peerEngagement: { coach: 'pro' },
  feedback: { coach: 'advanced', player: 'advanced' },
  // STORY-5.2 AC-4 launch ◎ subset — minimum tier for any access (readonly or full).
  browseMarketplace: { coach: 'basic', player: 'basic', team: 'basic' },
  viewTrainingMaterials: { player: 'basic' },
  watchSharedVideo: { player: 'basic' },
  teamRoster: { coach: 'basic' },
  // STORY-6.3 AC-3 — player in-app schedule at Basic+.
  viewSchedule: { player: 'basic' },
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

/** Merged (or static) feature → role → min tier map used by gating (STORY-5.4). */
export type FeatureTierRequirements = Record<
  string,
  Partial<Record<GatedRole, PaidSubscriptionTier>>
>;

/** Admin-configured override for one (feature, role) pair (STORY-5.3 AC-1). */
export type FeatureFlagOverride = {
  feature: string;
  role: GatedRole;
  requiredTier: PaidSubscriptionTier;
  /** Legacy DB columns; mobile uses generic paywall copy only. */
  paywallTitle?: string | null;
  paywallMessage?: string | null;
};

const GATED_ROLES: readonly GatedRole[] = ['coach', 'player', 'team'];

/** camelCase feature key → Title Case label for admin tables. */
export function formatFeatureLabel(featureKey: string): string {
  return featureKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function adminOverrideFor(
  overrides: readonly FeatureFlagOverride[],
  feature: string,
  role: GatedRole,
): FeatureFlagOverride | undefined {
  return overrides.find((entry) => entry.feature === feature && entry.role === role);
}

/**
 * Per-cell tier: admin row wins, else code default, else not gated.
 */
export function resolvedTierForFeatureRole(
  feature: string,
  role: GatedRole,
  overrides: readonly FeatureFlagOverride[] = [],
): PaidSubscriptionTier | null {
  const admin = adminOverrideFor(overrides, feature, role);
  if (admin) {
    return admin.requiredTier;
  }
  return FEATURE_TIER_REQUIREMENTS[feature]?.[role] ?? null;
}

/** Feature keys to show on an admin role tab (defaults ∪ saved overrides). */
export function gatedFeaturesForRole(
  role: GatedRole,
  overrides: readonly FeatureFlagOverride[] = [],
): string[] {
  const keys = new Set<string>();
  for (const [feature, reqs] of Object.entries(FEATURE_TIER_REQUIREMENTS)) {
    if (reqs[role]) {
      keys.add(feature);
    }
  }
  for (const override of overrides) {
    if (override.role === role) {
      keys.add(override.feature);
    }
  }
  return [...keys].sort((a, b) => formatFeatureLabel(a).localeCompare(formatFeatureLabel(b)));
}

/**
 * Build merged feature → role → tier map for mobile gating.
 * Admin overrides win per cell; code defaults fill gaps; new admin pairs are included.
 */
export function applyFeatureFlagOverrides(
  overrides: readonly FeatureFlagOverride[],
): FeatureTierRequirements {
  const merged: FeatureTierRequirements = {};
  const featureKeys = new Set([
    ...GATED_FEATURE_KEYS,
    ...overrides.map((override) => override.feature),
  ]);

  for (const feature of featureKeys) {
    const reqs: Partial<Record<GatedRole, PaidSubscriptionTier>> = {};
    for (const role of GATED_ROLES) {
      const tier = resolvedTierForFeatureRole(feature, role, overrides);
      if (tier) {
        reqs[role] = tier;
      }
    }
    if (Object.keys(reqs).length > 0) {
      merged[feature] = reqs;
    }
  }

  return merged;
}

export function requiredTierForFeature(
  feature: string,
  role: PaywallRole,
  overrides: readonly FeatureFlagOverride[] = [],
): PaidSubscriptionTier | null {
  if (role === 'admin') {
    return null;
  }
  return resolvedTierForFeatureRole(feature, role, overrides);
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
  return {
    requiredTier,
    tierLabel: entry.label,
    unlockedFeatures: [...entry.features],
    displayPrice: entry.displayPrice,
    paywallTitle: null,
    paywallMessage: null,
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
