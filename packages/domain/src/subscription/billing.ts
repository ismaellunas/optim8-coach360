import type { Subscription, SubscriptionStatus, SubscriptionTier } from './schema.js';
import { effectiveTierForAccess } from './rules.js';

/** Statuses where paid features should be treated as locked pending payment recovery. */
const PAYMENT_LOCKED_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  'past_due',
  'incomplete',
]);

export function isSubscriptionPaymentLocked(status: SubscriptionStatus): boolean {
  return PAYMENT_LOCKED_STATUSES.has(status);
}

/**
 * Access matrix: View billing history at Basic+.
 * Uses effective tier so an active trial (Pro access) can also view history.
 */
export function canViewBillingHistory(
  subscription: Pick<Subscription, 'tier' | 'status'> | null,
): boolean {
  if (!subscription) {
    return false;
  }
  const tier: SubscriptionTier = effectiveTierForAccess(subscription);
  return tier === 'basic' || tier === 'advanced' || tier === 'pro';
}

export function lockedStateMessage(status: SubscriptionStatus): string | null {
  if (!isSubscriptionPaymentLocked(status)) {
    return null;
  }
  if (status === 'past_due') {
    return 'Payment failed — update your billing details to restore full access.';
  }
  return 'Subscription incomplete — finish payment to unlock your plan.';
}

/** Admin Subscriptions pillar revenue rollup (STORY-12.2 AC-3). */
export type BillingRevenueSummary = {
  paidRevenueCents: number;
  paidInvoiceCount: number;
  currency: string;
  activePaidByTier: Array<{ tier: string; count: number }>;
};

export function formatRevenueCents(cents: number, currency = 'usd'): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${(cents / 100).toFixed(0)}`;
  }
}
