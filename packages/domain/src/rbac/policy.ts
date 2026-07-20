import type { AppRole } from '../user/schema.js';
import type { SubscriptionTier } from '../subscription/schema.js';
import {
  FEATURE_TIER_REQUIREMENTS,
  tierDisplayLabel,
  type FeatureTierRequirements,
  type PaywallRole,
} from '../subscription/paywall.js';
import type { PaidSubscriptionTier } from '../subscription/catalog.js';
import {
  resolveLaunchFeatureAccess,
  type LaunchAccessLevel,
} from './launch-matrix.js';

/**
 * STORY-5.1 — core RBAC policy layer.
 * Single allow/deny utility consumed by API routes (edge functions) and
 * mobile guards. Accepts both canonical AppRole ('team_manager') and the
 * legacy mobile role key ('team').
 *
 * STORY-5.2 extends resolution with ◎ read-only / ○ higher-tier bands via
 * resolveLaunchFeatureAccess — checkFeatureAccess remains the binary gate
 * (readonly counts as allowed).
 */
export type RbacRole = AppRole | PaywallRole;

export function normalizeRbacRole(role: RbacRole): PaywallRole {
  return role === 'team_manager' ? 'team' : role;
}

export type FeatureAccessDenialReason = 'role_not_permitted' | 'tier_insufficient';

export type FeatureAccessDecision =
  | { allowed: true; accessLevel: LaunchAccessLevel }
  | {
      allowed: false;
      reason: 'role_not_permitted';
      requiredTier: null;
      upgradeHint: null;
      accessLevel: 'none';
    }
  | {
      allowed: false;
      reason: 'tier_insufficient';
      requiredTier: PaidSubscriptionTier;
      upgradeHint: string;
      accessLevel: 'none';
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
   * Access tier. Active trial callers that still hold tier 'trial' should pass
   * 'trial' so ◎ bands that list trial as readonly can apply; otherwise pass
   * effectiveTierForAccess(subscription) (trial → pro).
   */
  tier: SubscriptionTier;
  feature: string;
  /**
   * STORY-5.4: merged admin+default requirements map.
   * Omit/null/undefined → static FEATURE_TIER_REQUIREMENTS (offline / unfetched fallback).
   * `| undefined` is required under exactOptionalPropertyTypes when callers forward
   * an optional `requirements?` parameter into this object.
   */
  requirements?: FeatureTierRequirements | null | undefined;
};

/**
 * Role + tier + feature key → allow/deny with denial detail.
 * STORY-5.2: ◎ readonly counts as allowed; ○ mid-tier denies until fullFrom.
 * STORY-5.4: optional injected `requirements` map; static map is the fallback.
 */
export function checkFeatureAccess(input: FeatureAccessInput): FeatureAccessDecision {
  const role = normalizeRbacRole(input.role);
  if (role === 'admin') {
    return { allowed: true, accessLevel: 'full' };
  }

  const reqs = input.requirements ?? FEATURE_TIER_REQUIREMENTS;
  const resolved = resolveLaunchFeatureAccess(input);
  if (resolved.allowed) {
    return { allowed: true, accessLevel: resolved.accessLevel };
  }

  const minFromMap = reqs[input.feature]?.[role] ?? null;
  if (!minFromMap && !resolved.requiredTier) {
    return {
      allowed: false,
      reason: 'role_not_permitted',
      requiredTier: null,
      upgradeHint: null,
      accessLevel: 'none',
    };
  }

  const requiredTier = resolved.requiredTier ?? minFromMap;
  if (!requiredTier) {
    return {
      allowed: false,
      reason: 'role_not_permitted',
      requiredTier: null,
      upgradeHint: null,
      accessLevel: 'none',
    };
  }

  return {
    allowed: false,
    reason: 'tier_insufficient',
    requiredTier,
    upgradeHint: upgradeHintForFeature(input.feature, requiredTier),
    accessLevel: 'none',
  };
}

/** Boolean convenience wrapper for UI guards (readonly or full). */
export function canAccessFeature(
  role: RbacRole,
  tier: SubscriptionTier,
  feature: string,
  requirements?: FeatureTierRequirements | null,
): boolean {
  return checkFeatureAccess({ role, tier, feature, requirements }).allowed;
}

export type FeatureAccessDenial = {
  status: 403;
  error: FeatureAccessDenialReason;
  feature: string;
  requiredTier: PaidSubscriptionTier | null;
  /** Present only when upgrading a tier would grant access. */
  hint: string | null;
};

/** HTTP-shaped 403 payload for deny decisions; null when allowed. */
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
