import type { Subscription, SubscriptionStatus, SubscriptionTier } from './schema.js';

export const TRIAL_DURATION_DAYS = 14;

export function needsSubscriptionGate(subscription: Subscription | null): boolean {
  return subscription === null;
}

/**
 * Active (non-expired) trial maps to Pro per Flow 2.
 * Expired trials do not grant Pro even if the row has not been downgraded yet.
 */
export function trialGrantsProAccess(
  tier: SubscriptionTier,
  status: SubscriptionStatus,
  trialEndsAt?: string | null,
  now = new Date(),
): boolean {
  if (tier !== 'trial' || status !== 'trialing') {
    return false;
  }
  if (trialEndsAt && new Date(trialEndsAt).getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

/** Tier used for feature gating — active trial maps to Pro per Flow 2. */
export function effectiveTierForAccess(
  subscription: Pick<Subscription, 'tier' | 'status'> & { trialEndsAt?: string | null },
  now = new Date(),
): SubscriptionTier {
  if (
    trialGrantsProAccess(subscription.tier, subscription.status, subscription.trialEndsAt, now)
  ) {
    return 'pro';
  }
  // Still marked trial but expired (or not trialing) → Basic until paid upgrade.
  if (subscription.tier === 'trial') {
    return 'basic';
  }
  return subscription.tier;
}

/** Legacy mock display tier (`trial` badge) vs access tier. */
export function legacyDisplayTier(
  subscription: Pick<Subscription, 'tier' | 'status'> & { trialEndsAt?: string | null },
  now = new Date(),
): 'trial' | 'basic' | 'advanced' | 'pro' {
  if (
    trialGrantsProAccess(subscription.tier, subscription.status, subscription.trialEndsAt, now)
  ) {
    return 'trial';
  }
  if (subscription.tier === 'trial') {
    return 'basic';
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
