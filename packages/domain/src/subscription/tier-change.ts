import type { Subscription, SubscriptionTier } from './schema.js';
import {
  getStripeCatalogEntry,
  isPaidSubscriptionTier,
  type PaidSubscriptionTier,
} from './catalog.js';
import { effectiveTierForAccess, trialDaysRemaining, trialGrantsProAccess } from './rules.js';
import { meetsTierMinimum } from './expiry.js';
import { requiredTierForFeature, tierDisplayLabel, type PaywallRole } from './paywall.js';

/**
 * Flow 17 tier-change rules for account settings:
 * upgrade = immediate with proration; downgrade = end of current billing cycle.
 */

export type TierChangeKind = 'upgrade' | 'downgrade' | 'same';

const PAID_TIER_ORDER: PaidSubscriptionTier[] = ['basic', 'advanced', 'pro'];

function paidTierIndex(tier: PaidSubscriptionTier): number {
  return PAID_TIER_ORDER.indexOf(tier);
}

/**
 * Classify a paid-tier change request. Current `trial` (or expired-trial Basic
 * access) counts as below every paid tier, so any paid selection is an upgrade.
 */
export function classifyTierChange(
  currentTier: SubscriptionTier,
  targetTier: PaidSubscriptionTier,
): TierChangeKind {
  if (!isPaidSubscriptionTier(targetTier)) {
    throw new Error(`invalid_target_tier:${String(targetTier)}`);
  }
  if (!isPaidSubscriptionTier(currentTier)) {
    return 'upgrade';
  }
  const delta = paidTierIndex(targetTier) - paidTierIndex(currentTier);
  if (delta === 0) {
    return 'same';
  }
  return delta > 0 ? 'upgrade' : 'downgrade';
}

/** Immediate upgrade result applied to the local subscription snapshot (AC-2). */
export type ImmediateUpgrade = {
  tier: PaidSubscriptionTier;
  status: 'active';
  pendingTier: null;
  pendingTierEffectiveAt: null;
};

export function applyImmediateUpgrade<T extends Pick<Subscription, 'tier' | 'status'>>(
  subscription: T,
  targetTier: PaidSubscriptionTier,
): T & ImmediateUpgrade {
  return {
    ...subscription,
    tier: targetTier,
    status: 'active',
    pendingTier: null,
    pendingTierEffectiveAt: null,
  };
}

/** End-of-cycle scheduled downgrade (AC-3): active tier is untouched until then. */
export type ScheduledDowngrade = {
  pendingTier: PaidSubscriptionTier;
  pendingTierEffectiveAt: string;
};

export function scheduleDowngradeAtPeriodEnd(
  subscription: Pick<Subscription, 'tier' | 'currentPeriodEnd'>,
  targetTier: PaidSubscriptionTier,
): ScheduledDowngrade {
  if (classifyTierChange(subscription.tier, targetTier) !== 'downgrade') {
    throw new Error(`not_a_downgrade:${subscription.tier}->${targetTier}`);
  }
  if (!subscription.currentPeriodEnd) {
    throw new Error('downgrade_requires_billing_period');
  }
  return {
    pendingTier: targetTier,
    pendingTierEffectiveAt: subscription.currentPeriodEnd,
  };
}

export type PendingTierChange = {
  tier: PaidSubscriptionTier;
  tierLabel: string;
  effectiveAt: string;
};

export function pendingTierChange(
  subscription: Pick<Subscription, 'pendingTier' | 'pendingTierEffectiveAt'> | null,
): PendingTierChange | null {
  if (
    !subscription ||
    !subscription.pendingTier ||
    !subscription.pendingTierEffectiveAt ||
    !isPaidSubscriptionTier(subscription.pendingTier)
  ) {
    return null;
  }
  return {
    tier: subscription.pendingTier,
    tierLabel: tierDisplayLabel(subscription.pendingTier),
    effectiveAt: subscription.pendingTierEffectiveAt,
  };
}

/** Current plan card content for account settings (AC-1). */
export type AccountPlanOverview = {
  tierLabel: string;
  displayPrice: string | null;
  status: Subscription['status'];
  renewsAt: string | null;
  isTrial: boolean;
  trialDaysRemaining: number;
  pendingChange: PendingTierChange | null;
};

export function accountPlanOverview(
  subscription: Subscription,
  now = new Date(),
): AccountPlanOverview {
  const onTrial = trialGrantsProAccess(
    subscription.tier,
    subscription.status,
    subscription.trialEndsAt,
    now,
  );
  const displayPrice = isPaidSubscriptionTier(subscription.tier)
    ? getStripeCatalogEntry(subscription.tier).displayPrice
    : null;

  return {
    tierLabel: tierDisplayLabel(subscription.tier),
    displayPrice,
    status: subscription.status,
    renewsAt: subscription.currentPeriodEnd,
    isTrial: onTrial,
    trialDaysRemaining: onTrial ? trialDaysRemaining(subscription.trialEndsAt, now) : 0,
    pendingChange: pendingTierChange(subscription),
  };
}

/** Usage summary rows for account settings (AC-1). */
export type AccountUsageItem = {
  key: 'access' | 'entitlements' | 'renewal' | 'trial';
  label: string;
  value: string;
};

function formatSummaryDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function accountUsageSummary(
  subscription: Subscription,
  now = new Date(),
): AccountUsageItem[] {
  const effectiveTier = effectiveTierForAccess(subscription, now);
  const items: AccountUsageItem[] = [
    {
      key: 'access',
      label: 'Feature access',
      value: tierDisplayLabel(effectiveTier),
    },
  ];

  if (isPaidSubscriptionTier(effectiveTier)) {
    items.push({
      key: 'entitlements',
      label: 'Included features',
      value: getStripeCatalogEntry(effectiveTier).features.join(' · '),
    });
  }

  if (trialGrantsProAccess(subscription.tier, subscription.status, subscription.trialEndsAt, now)) {
    items.push({
      key: 'trial',
      label: 'Trial days remaining',
      value: String(trialDaysRemaining(subscription.trialEndsAt, now)),
    });
  } else if (subscription.currentPeriodEnd) {
    items.push({
      key: 'renewal',
      label: 'Renews on',
      value: formatSummaryDate(subscription.currentPeriodEnd),
    });
  }

  return items;
}

/**
 * OQ-17.2 / Flow 17 data retention (AC-4): downgrade never deletes higher-tier
 * data. Objective and AI history stay stored and hidden until re-upgrade.
 */
export const HISTORY_RETAINED_FEATURES = ['objectives', 'ai'] as const;
export type HistoryRetainedFeature = (typeof HISTORY_RETAINED_FEATURES)[number];

export type DowngradeHistoryRetention = {
  policy: 'preserve_hidden';
  deletesData: false;
  restoredOnUpgrade: true;
};

export function downgradeHistoryRetention(): DowngradeHistoryRetention {
  return {
    policy: 'preserve_hidden',
    deletesData: false,
    restoredOnUpgrade: true,
  };
}

/**
 * Whether tier-gated history (objectives, AI) is visible at the given effective
 * tier. Hidden below the feature's required tier; visible again on re-upgrade.
 */
export function isHistoryFeatureVisible(
  feature: HistoryRetainedFeature | string,
  role: PaywallRole,
  effectiveTier: SubscriptionTier,
): boolean {
  const requiredTier = requiredTierForFeature(feature, role);
  if (!requiredTier) {
    return true;
  }
  return meetsTierMinimum(effectiveTier, requiredTier);
}

/** Downgrade confirmation copy shown in account settings (AC-3 + AC-4). */
export function downgradeRetentionNotice(targetTier: PaidSubscriptionTier): string {
  const label = getStripeCatalogEntry(targetTier).label;
  return `Your plan switches to ${label} at the end of the current billing period. Objectives and AI history are preserved but hidden until you upgrade again.`;
}
