import type { AppRole } from '../user/schema.js';
import type { SubscriptionTier } from '../subscription/schema.js';
import type { PaidSubscriptionTier } from '../subscription/catalog.js';
import { meetsTierMinimum } from '../subscription/expiry.js';
import {
  FEATURE_TIER_REQUIREMENTS,
  type GatedRole,
  type PaywallRole,
} from '../subscription/paywall.js';

/**
 * STORY-5.2 — launch-critical Part 3 access matrix (DEP-06 subset).
 *
 * Legend (flows.md Part 3):
 *   ✓  full access
 *   ◎  read-only / limited access
 *   ○  available at higher tier (not partial — deny until fullFrom)
 *   ✗  not available for this role
 *
 * Full ~223-rule expansion is deferred post-MVP (AC-5).
 */

type RbacRole = AppRole | PaywallRole;

function normalizeRole(role: RbacRole): PaywallRole {
  return role === 'team_manager' ? 'team' : role;
}

/** AC-5: post-MVP expands the remaining Part 3 cells. */
export const FULL_MATRIX_DEFERRED = true;

/**
 * Per-role access band for launch features that use ◎ / ○.
 * `minTier` is the paid floor for any access (matches FEATURE_TIER_REQUIREMENTS).
 * `readonlyTiers` lists tiers where access is ◎ read-only (may include 'trial').
 * `fullFrom` is the paid floor for ✓ full access; tiers between min and full that
 * are not readonly are treated as ○ (available at higher tier → denied).
 */
export type LaunchAccessBand = {
  minTier: PaidSubscriptionTier;
  readonlyTiers?: readonly SubscriptionTier[];
  fullFrom: PaidSubscriptionTier;
};

export type LaunchAccessLevel = 'full' | 'readonly' | 'none';

/**
 * Launch ◎ / ○ bands (AC-4). Features absent here use binary
 * FEATURE_TIER_REQUIREMENTS → full | none.
 */
export const LAUNCH_ACCESS_BANDS: Record<
  string,
  Partial<Record<GatedRole, LaunchAccessBand>>
> = {
  browseMarketplace: {
    coach: { minTier: 'basic', readonlyTiers: ['trial'], fullFrom: 'basic' },
    player: { minTier: 'basic', readonlyTiers: ['trial'], fullFrom: 'basic' },
    team: { minTier: 'basic', readonlyTiers: ['trial'], fullFrom: 'basic' },
  },
  viewTrainingMaterials: {
    player: { minTier: 'basic', readonlyTiers: ['basic'], fullFrom: 'advanced' },
  },
  watchSharedVideo: {
    player: { minTier: 'basic', readonlyTiers: ['basic'], fullFrom: 'advanced' },
  },
  viewProgress: {
    // Player: Basic ◎, Advanced ○ → Pro ✓
    player: { minTier: 'basic', readonlyTiers: ['basic'], fullFrom: 'pro' },
    // Coach: Basic ◎ roster/progress track, Advanced+ ✓
    coach: { minTier: 'basic', readonlyTiers: ['basic'], fullFrom: 'advanced' },
  },
  teamRoster: {
    coach: { minTier: 'basic', readonlyTiers: ['basic'], fullFrom: 'advanced' },
  },
};

/** Documented launch-critical feature keys (AC-1–AC-4 subset + existing gates). */
export const LAUNCH_CRITICAL_FEATURE_KEYS: readonly string[] = Object.keys(
  FEATURE_TIER_REQUIREMENTS,
);

/** Count of (feature, role) pairs in the launch matrix — must stay ≪ 223 (AC-5). */
export function countLaunchCriticalRules(): number {
  let count = 0;
  for (const reqs of Object.values(FEATURE_TIER_REQUIREMENTS)) {
    count += Object.keys(reqs).length;
  }
  return count;
}

export type ResolvedFeatureAccess = {
  allowed: boolean;
  accessLevel: LaunchAccessLevel;
  /** Present when denied for tier reasons and an upgrade would help. */
  requiredTier: PaidSubscriptionTier | null;
};

function paidFloor(tier: SubscriptionTier): PaidSubscriptionTier {
  return tier === 'trial' ? 'pro' : tier;
}

/**
 * Resolve launch access including ◎ read-only and ○ higher-tier cells.
 * Trial is checked against `readonlyTiers` before mapping trial → Pro.
 */
export function resolveLaunchFeatureAccess(input: {
  role: RbacRole;
  tier: SubscriptionTier;
  feature: string;
}): ResolvedFeatureAccess {
  const role = normalizeRole(input.role);
  if (role === 'admin') {
    return { allowed: true, accessLevel: 'full', requiredTier: null };
  }

  const band = LAUNCH_ACCESS_BANDS[input.feature]?.[role];
  const minFromMap = FEATURE_TIER_REQUIREMENTS[input.feature]?.[role] ?? null;

  if (!band && !minFromMap) {
    return { allowed: false, accessLevel: 'none', requiredTier: null };
  }

  if (band) {
    if (band.readonlyTiers?.includes(input.tier)) {
      return { allowed: true, accessLevel: 'readonly', requiredTier: null };
    }

    const effective = paidFloor(input.tier);
    if (meetsTierMinimum(effective, band.fullFrom)) {
      return { allowed: true, accessLevel: 'full', requiredTier: null };
    }
    if (meetsTierMinimum(effective, band.minTier)) {
      // Between min and full, not listed as readonly → ○ (deny until fullFrom).
      return { allowed: false, accessLevel: 'none', requiredTier: band.fullFrom };
    }
    return { allowed: false, accessLevel: 'none', requiredTier: band.minTier };
  }

  // Binary feature: full access at/above FEATURE_TIER_REQUIREMENTS minimum.
  const effective = paidFloor(input.tier);
  if (minFromMap && meetsTierMinimum(effective, minFromMap)) {
    return { allowed: true, accessLevel: 'full', requiredTier: null };
  }
  return {
    allowed: false,
    accessLevel: 'none',
    requiredTier: minFromMap,
  };
}

export function featureAccessLevel(
  role: RbacRole,
  tier: SubscriptionTier,
  feature: string,
): LaunchAccessLevel {
  return resolveLaunchFeatureAccess({ role, tier, feature }).accessLevel;
}

export function canAccessFeatureFully(
  role: RbacRole,
  tier: SubscriptionTier,
  feature: string,
): boolean {
  return featureAccessLevel(role, tier, feature) === 'full';
}

export function canAccessFeatureReadonlyOrFull(
  role: RbacRole,
  tier: SubscriptionTier,
  feature: string,
): boolean {
  const level = featureAccessLevel(role, tier, feature);
  return level === 'full' || level === 'readonly';
}

/** Narrow helper for tests / docs — paywall role keys only. */
export function launchBandFor(
  feature: string,
  role: Exclude<PaywallRole, 'admin'>,
): LaunchAccessBand | null {
  return LAUNCH_ACCESS_BANDS[feature]?.[role] ?? null;
}
