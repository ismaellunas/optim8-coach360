/**
 * Pure tier-change builders for STORY-4.5 (Deno edge + vitest).
 *
 * Flow 17: upgrade = immediate Stripe subscription item price swap with
 * proration; downgrade = Stripe subscription schedule that switches the price
 * at the end of the current billing period. Neither path deletes user data —
 * objectives and AI history stay stored and only tier gating hides them.
 */

export type PaidTier = 'basic' | 'advanced' | 'pro';

const PAID_TIER_ORDER: PaidTier[] = ['basic', 'advanced', 'pro'];
const PAID_TIERS: ReadonlySet<string> = new Set(PAID_TIER_ORDER);

export type TierChangeDirection = 'upgrade' | 'downgrade' | 'same';

export function assertPaidTier(tier: string): asserts tier is PaidTier {
  if (!PAID_TIERS.has(tier)) {
    throw new Error(`invalid_paid_tier:${tier}`);
  }
}

/** Non-paid current tiers (trial) rank below every paid tier. */
export function classifyPaidTierChange(
  currentTier: string,
  targetTier: PaidTier,
): TierChangeDirection {
  assertPaidTier(targetTier);
  if (!PAID_TIERS.has(currentTier)) {
    return 'upgrade';
  }
  const delta =
    PAID_TIER_ORDER.indexOf(targetTier) - PAID_TIER_ORDER.indexOf(currentTier as PaidTier);
  if (delta === 0) {
    return 'same';
  }
  return delta > 0 ? 'upgrade' : 'downgrade';
}

/**
 * Stripe `POST /v1/subscriptions/{id}` body (form-encoded keys) for an
 * immediate upgrade: swap the item price and invoice the proration now (AC-2).
 */
export type StripeSubscriptionUpgradeBody = {
  'items[0][id]': string;
  'items[0][price]': string;
  proration_behavior: 'always_invoice';
  payment_behavior: 'error_if_incomplete';
  'metadata[profile_id]': string;
  'metadata[tier]': string;
};

export function buildStripeSubscriptionUpgradeBody(input: {
  subscriptionItemId: string;
  priceId: string;
  tier: PaidTier;
  profileId: string;
}): StripeSubscriptionUpgradeBody {
  assertPaidTier(input.tier);
  if (!input.subscriptionItemId) {
    throw new Error('upgrade_subscription_item_required');
  }
  if (!input.priceId) {
    throw new Error('upgrade_price_id_required');
  }
  if (!input.profileId) {
    throw new Error('upgrade_profile_id_required');
  }

  return {
    'items[0][id]': input.subscriptionItemId,
    'items[0][price]': input.priceId,
    proration_behavior: 'always_invoice',
    payment_behavior: 'error_if_incomplete',
    'metadata[profile_id]': input.profileId,
    'metadata[tier]': input.tier,
  };
}

/**
 * Stripe `POST /v1/subscription_schedules/{id}` body: keep the current price
 * until the period ends, then switch to the target price (AC-3). The schedule
 * is created with `from_subscription` first, then updated with these phases.
 */
export type StripeDowngradeSchedulePhasesBody = {
  'phases[0][items][0][price]': string;
  'phases[0][start_date]': string;
  'phases[0][end_date]': string;
  'phases[1][items][0][price]': string;
  'phases[1][metadata][profile_id]': string;
  'phases[1][metadata][tier]': string;
  end_behavior: 'release';
};

/**
 * Stripe Basil (2025-03-31+) moved billing periods onto subscription items.
 * Prefer item-level fields; fall back to subscription-level for older payloads.
 */
export function resolveSubscriptionBillingPeriod(sub: {
  current_period_start?: number | null;
  current_period_end?: number | null;
  items?: {
    data?: Array<{
      current_period_start?: number | null;
      current_period_end?: number | null;
    }>;
  };
}): { periodStart: number; periodEnd: number } {
  const item = sub.items?.data?.[0];
  return {
    periodStart: Number(item?.current_period_start ?? sub.current_period_start ?? 0),
    periodEnd: Number(item?.current_period_end ?? sub.current_period_end ?? 0),
  };
}

export function buildDowngradeSchedulePhasesBody(input: {
  currentPriceId: string;
  targetPriceId: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  targetTier: PaidTier;
  profileId: string;
}): StripeDowngradeSchedulePhasesBody {
  assertPaidTier(input.targetTier);
  if (!input.currentPriceId || !input.targetPriceId) {
    throw new Error('downgrade_price_ids_required');
  }
  if (!input.currentPeriodStart || !input.currentPeriodEnd) {
    throw new Error('downgrade_billing_period_required');
  }
  if (!input.profileId) {
    throw new Error('downgrade_profile_id_required');
  }

  return {
    'phases[0][items][0][price]': input.currentPriceId,
    'phases[0][start_date]': String(input.currentPeriodStart),
    'phases[0][end_date]': String(input.currentPeriodEnd),
    'phases[1][items][0][price]': input.targetPriceId,
    'phases[1][metadata][profile_id]': input.profileId,
    'phases[1][metadata][tier]': input.targetTier,
    end_behavior: 'release',
  };
}

export type ChangeSubscriptionTierInput = {
  profileId: string;
  currentTier: string;
  targetTier: PaidTier;
  stripeSubscriptionId: string;
  subscriptionItemId: string;
  currentPriceId: string;
  targetPriceId: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
};

export type ChangeSubscriptionTierResult = {
  kind: 'upgraded' | 'downgrade_scheduled';
  tier: PaidTier | string;
  pendingTier: PaidTier | null;
  pendingTierEffectiveAt: string | null;
  profileId: string;
};

export type StripeTierChangeCalls = {
  updateSubscription: (
    subscriptionId: string,
    body: StripeSubscriptionUpgradeBody,
  ) => Promise<{ id: string; status: string }>;
  createSchedule: (subscriptionId: string) => Promise<{ id: string }>;
  updateSchedule: (
    scheduleId: string,
    body: StripeDowngradeSchedulePhasesBody,
  ) => Promise<{ id: string }>;
};

export type TierChangePersistence = {
  /** AC-2: apply the new tier to the read model immediately after payment. */
  applyUpgrade: (update: {
    profileId: string;
    tier: PaidTier;
  }) => Promise<void>;
  /** AC-3: record the scheduled change; active tier stays until the period ends. */
  schedulePendingDowngrade: (update: {
    profileId: string;
    pendingTier: PaidTier;
    pendingTierEffectiveAt: string;
  }) => Promise<void>;
};

/**
 * Orchestrates a tier change via injected Stripe callers (testable offline).
 * Persists only subscription-row updates — never deletes user data (AC-4).
 */
export async function changeSubscriptionTier(options: {
  input: ChangeSubscriptionTierInput;
  stripe: StripeTierChangeCalls;
  persist: TierChangePersistence;
}): Promise<ChangeSubscriptionTierResult> {
  const { input, stripe, persist } = options;
  const direction = classifyPaidTierChange(input.currentTier, input.targetTier);

  if (direction === 'same') {
    throw new Error('tier_unchanged');
  }
  if (!input.stripeSubscriptionId) {
    throw new Error('stripe_subscription_required');
  }

  if (direction === 'upgrade') {
    const body = buildStripeSubscriptionUpgradeBody({
      subscriptionItemId: input.subscriptionItemId,
      priceId: input.targetPriceId,
      tier: input.targetTier,
      profileId: input.profileId,
    });
    await stripe.updateSubscription(input.stripeSubscriptionId, body);
    await persist.applyUpgrade({ profileId: input.profileId, tier: input.targetTier });

    return {
      kind: 'upgraded',
      tier: input.targetTier,
      pendingTier: null,
      pendingTierEffectiveAt: null,
      profileId: input.profileId,
    };
  }

  const schedule = await stripe.createSchedule(input.stripeSubscriptionId);
  const phasesBody = buildDowngradeSchedulePhasesBody({
    currentPriceId: input.currentPriceId,
    targetPriceId: input.targetPriceId,
    currentPeriodStart: input.currentPeriodStart,
    currentPeriodEnd: input.currentPeriodEnd,
    targetTier: input.targetTier,
    profileId: input.profileId,
  });
  await stripe.updateSchedule(schedule.id, phasesBody);

  const pendingTierEffectiveAt = new Date(input.currentPeriodEnd * 1000).toISOString();
  await persist.schedulePendingDowngrade({
    profileId: input.profileId,
    pendingTier: input.targetTier,
    pendingTierEffectiveAt,
  });

  return {
    kind: 'downgrade_scheduled',
    tier: input.currentTier,
    pendingTier: input.targetTier,
    pendingTierEffectiveAt,
    profileId: input.profileId,
  };
}

/** Env key mapping for catalog prices (matches STRIPE_PRODUCT_CATALOG). */
export const TIER_PRICE_ENV_BY_TIER: Record<PaidTier, string> = {
  basic: 'STRIPE_PRICE_BASIC',
  advanced: 'STRIPE_PRICE_ADVANCED',
  pro: 'STRIPE_PRICE_PRO',
};

export function resolvePriceIdForTier(
  tier: PaidTier,
  env: Record<string, string | undefined>,
): string {
  const key = TIER_PRICE_ENV_BY_TIER[tier];
  const priceId = env[key];
  if (!priceId) {
    throw new Error(`missing_price_env:${key}`);
  }
  return priceId;
}

export function encodeStripeFormBody(body: Record<string, string>): string {
  return Object.entries(body)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}
