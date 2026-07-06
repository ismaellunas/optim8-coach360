import type { Subscription, SubscriptionStatus, SubscriptionTier } from './schema.js';

export const TRIAL_DURATION_DAYS = 14;

export function needsSubscriptionGate(subscription: Subscription | null): boolean {
  return subscription === null;
}

export function trialGrantsProAccess(tier: SubscriptionTier, status: SubscriptionStatus): boolean {
  return tier === 'trial' && status === 'trialing';
}

/** Tier used for feature gating — active trial maps to Pro per Flow 2. */
export function effectiveTierForAccess(
  subscription: Pick<Subscription, 'tier' | 'status'>,
): SubscriptionTier {
  if (trialGrantsProAccess(subscription.tier, subscription.status)) {
    return 'pro';
  }
  return subscription.tier;
}

/** Legacy mock display tier (`trial` badge) vs access tier. */
export function legacyDisplayTier(
  subscription: Pick<Subscription, 'tier' | 'status'>,
): 'trial' | 'basic' | 'advanced' | 'pro' {
  if (trialGrantsProAccess(subscription.tier, subscription.status)) {
    return 'trial';
  }
  return subscription.tier;
}

export function trialDaysRemaining(trialEndsAt: string | null, now = new Date()): number {
  if (!trialEndsAt) {
    return 0;
  }
  const end = new Date(trialEndsAt);
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
