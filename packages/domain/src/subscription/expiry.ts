import type { Subscription, SubscriptionStatus, SubscriptionTier } from './schema.js';

export type ExpiredTrialDowngrade = {
  tier: 'basic';
  status: 'active';
};

/**
 * True when a trialing subscription's trial_ends_at is at or before now.
 * Used for client-side gating before the expire job persists Basic.
 */
export function isTrialExpired(
  subscription: Pick<Subscription, 'tier' | 'status' | 'trialEndsAt'> | null,
  now = new Date(),
): boolean {
  if (!subscription) {
    return false;
  }
  if (subscription.tier !== 'trial' || subscription.status !== 'trialing') {
    return false;
  }
  if (!subscription.trialEndsAt) {
    return false;
  }
  return new Date(subscription.trialEndsAt).getTime() <= now.getTime();
}

/**
 * Persisted state after trial ends without payment (Flow 9).
 * Keeps trial_used_at / trial_ends_at for history; only tier+status change.
 */
export function expiredTrialDowngrade(): ExpiredTrialDowngrade {
  return { tier: 'basic', status: 'active' };
}

/**
 * Apply Flow 9 downgrade to a subscription snapshot (pure helper for tests / clients).
 */
export function applyExpiredTrialDowngrade<T extends Pick<Subscription, 'tier' | 'status'>>(
  subscription: T,
): T & ExpiredTrialDowngrade {
  return {
    ...subscription,
    ...expiredTrialDowngrade(),
  };
}

/**
 * Post-trial Basic (or still-trialing past end) should see the upgrade prompt
 * with tier comparison (Flow 9 step D).
 */
export function needsTrialExpiredUpgradePrompt(
  subscription: Pick<Subscription, 'tier' | 'status' | 'trialEndsAt' | 'trialUsedAt'> | null,
  now = new Date(),
): boolean {
  if (!subscription) {
    return false;
  }
  if (isTrialExpired(subscription, now)) {
    return true;
  }
  if (subscription.trialUsedAt === null) {
    return false;
  }
  if (subscription.tier !== 'basic' || subscription.status !== 'active') {
    return false;
  }
  if (!subscription.trialEndsAt) {
    return false;
  }
  return new Date(subscription.trialEndsAt).getTime() <= now.getTime();
}

/**
 * OQ-9.3 / Flow 9: purchased marketplace packages stay usable after trial → Basic.
 * Only subscription-gated Advanced/Pro features lock; ownership does not revoke.
 */
export function retainsPurchasedMarketplaceContent(
  subscription: Pick<Subscription, 'tier' | 'status'> | null,
): boolean {
  void subscription;
  return true;
}

/** Feature keys that require Advanced or Pro (used by access tests). */
export const ADVANCED_OR_PRO_FEATURES = [
  'chat',
  'createSession',
  'distribute',
  'objectives',
  'ai',
  'createContent',
  'peerShare',
  'feedback',
] as const;

export type AdvancedOrProFeature = (typeof ADVANCED_OR_PRO_FEATURES)[number];

const TIER_ORDER: SubscriptionTier[] = ['trial', 'basic', 'advanced', 'pro'];

function tierIndex(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Whether a user's effective access tier meets a minimum (for paywall checks).
 */
export function meetsTierMinimum(
  effectiveTier: SubscriptionTier,
  minimum: SubscriptionTier,
): boolean {
  return tierIndex(effectiveTier) >= tierIndex(minimum);
}

export function isAdvancedOrProFeatureLocked(
  effectiveTier: SubscriptionTier,
  requiredTier: SubscriptionTier,
): boolean {
  return !meetsTierMinimum(effectiveTier, requiredTier);
}

export type TrialExpiryCandidate = {
  profile_id: string;
  trial_ends_at: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
};

/**
 * Select which candidate trials should be downgraded to Basic (batch expire job).
 */
export function selectTrialsToExpire(
  candidates: TrialExpiryCandidate[],
  now = new Date(),
): TrialExpiryCandidate[] {
  return candidates.filter((candidate) =>
    isTrialExpired(
      {
        tier: candidate.tier,
        status: candidate.status,
        trialEndsAt: candidate.trial_ends_at,
      },
      now,
    ),
  );
}
