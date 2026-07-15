import type { AppRole } from '../user/schema.js';
import type { SubscriptionTier } from '../subscription/schema.js';
import { meetsTierMinimum } from '../subscription/expiry.js';
import {
  FEATURE_TIER_REQUIREMENTS,
  tierDisplayLabel,
  type PaywallRole,
} from '../subscription/paywall.js';
import type { PaidSubscriptionTier } from '../subscription/catalog.js';

/**
 * STORY-5.1 — core RBAC policy layer.
 * Single allow/deny utility consumed by API routes (edge functions) and
 * mobile guards. Accepts both canonical AppRole ('team_manager') and the
 * legacy mobile role key ('team').
 */
export type RbacRole = AppRole | PaywallRole;

export function normalizeRbacRole(role: RbacRole): PaywallRole {
  return role === 'team_manager' ? 'team' : role;
}

export type FeatureAccessDenialReason = 'role_not_permitted' | 'tier_insufficient';

export type FeatureAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: 'role_not_permitted'; requiredTier: null; upgradeHint: null }
  | {
      allowed: false;
      reason: 'tier_insufficient';
      requiredTier: PaidSubscriptionTier;
      upgradeHint: string;
    };

export function upgradeHintForFeature(
  feature: string,
  requiredTier: PaidSubscriptionTier,
): string {
  return `Upgrade to ${tierDisplayLabel(requiredTier)} to unlock ${feature}.`;
}

export type FeatureAccessInput = {
  role: RbacRole;
  /**
   * Effective access tier. 'trial' means an active (non-expired) trial and
   * maps to Pro per Flow 2; callers holding a subscription row should pass
   * effectiveTierForAccess(subscription), which already resolves expiry.
   */
  tier: SubscriptionTier;
  feature: string;
};

/** AC-1: role + tier + feature key → allow/deny with denial detail. */
export function checkFeatureAccess(input: FeatureAccessInput): FeatureAccessDecision {
  const role = normalizeRbacRole(input.role);
  if (role === 'admin') {
    return { allowed: true };
  }
  const requiredTier = FEATURE_TIER_REQUIREMENTS[input.feature]?.[role] ?? null;
  if (!requiredTier) {
    return { allowed: false, reason: 'role_not_permitted', requiredTier: null, upgradeHint: null };
  }
  const effectiveTier = input.tier === 'trial' ? 'pro' : input.tier;
  if (meetsTierMinimum(effectiveTier, requiredTier)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: 'tier_insufficient',
    requiredTier,
    upgradeHint: upgradeHintForFeature(input.feature, requiredTier),
  };
}

/** Boolean convenience wrapper for UI guards. */
export function canAccessFeature(role: RbacRole, tier: SubscriptionTier, feature: string): boolean {
  return checkFeatureAccess({ role, tier, feature }).allowed;
}

export type FeatureAccessDenial = {
  status: 403;
  error: FeatureAccessDenialReason;
  feature: string;
  requiredTier: PaidSubscriptionTier | null;
  /** Present only when upgrading a tier would grant access (AC-3). */
  hint: string | null;
};

/**
 * AC-3: HTTP-shaped 403 payload for deny decisions; null when allowed.
 */
export function featureAccessDenial(input: FeatureAccessInput): FeatureAccessDenial | null {
  const decision = checkFeatureAccess(input);
  if (decision.allowed) {
    return null;
  }
  return {
    status: 403,
    error: decision.reason,
    feature: input.feature,
    requiredTier: decision.requiredTier,
    hint: decision.upgradeHint,
  };
}
