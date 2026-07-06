export type StripeSubscriptionPayload = {
  id: string;
  customer: string | { id: string };
  status: string;
  metadata?: {
    profile_id?: string;
    tier?: string;
  };
  items?: {
    data: Array<{
      price?: {
        id?: string;
        metadata?: {
          tier?: string;
        };
      };
    }>;
  };
  current_period_end?: number;
  trial_end?: number | null;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: StripeSubscriptionPayload;
  };
};

export const STRIPE_STATUS_MAP: Record<string, string> = {
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  incomplete: 'incomplete',
  incomplete_expired: 'canceled',
  unpaid: 'past_due',
};

const VALID_TIERS = new Set(['trial', 'basic', 'advanced', 'pro']);

export function resolveTierFromStripeSubscription(sub: StripeSubscriptionPayload): string {
  const metaTier = sub.metadata?.tier;
  if (metaTier && VALID_TIERS.has(metaTier)) {
    return metaTier;
  }

  const priceTier = sub.items?.data?.[0]?.price?.metadata?.tier;
  if (priceTier && VALID_TIERS.has(priceTier)) {
    return priceTier;
  }

  return 'basic';
}

export function resolveStripeCustomerId(sub: StripeSubscriptionPayload): string | null {
  if (typeof sub.customer === 'string') {
    return sub.customer;
  }
  return sub.customer?.id ?? null;
}

export function buildSubscriptionUpsert(sub: StripeSubscriptionPayload, profileId: string) {
  const status = STRIPE_STATUS_MAP[sub.status] ?? 'incomplete';

  return {
    profile_id: profileId,
    tier: resolveTierFromStripeSubscription(sub),
    status,
    stripe_customer_id: resolveStripeCustomerId(sub),
    stripe_subscription_id: sub.id,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
  };
}

export type StripeWebhookHandleResult =
  | { handled: false; reason: string }
  | {
      handled: true;
      idempotencyKey: string;
      eventType: string;
      upsert: ReturnType<typeof buildSubscriptionUpsert>;
    };

export function handleStripeWebhookEvent(event: StripeWebhookEvent): StripeWebhookHandleResult {
  if (!event.type.startsWith('customer.subscription.')) {
    return { handled: false, reason: 'ignored_event_type' };
  }

  const sub = event.data.object;
  const profileId = sub.metadata?.profile_id;
  if (!profileId) {
    return { handled: false, reason: 'missing_profile_id' };
  }

  return {
    handled: true,
    idempotencyKey: event.id,
    eventType: event.type,
    upsert: buildSubscriptionUpsert(sub, profileId),
  };
}
