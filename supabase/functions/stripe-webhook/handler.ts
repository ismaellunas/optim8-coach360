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

export type StripeInvoicePayload = {
  id: string;
  customer: string | { id: string } | null;
  subscription?: string | { id: string } | null;
  amount_paid?: number;
  amount_due?: number;
  currency?: string;
  status?: string;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  period_start?: number | null;
  period_end?: number | null;
  status_transitions?: {
    paid_at?: number | null;
  };
  metadata?: {
    profile_id?: string;
    tier?: string;
  };
  lines?: {
    data?: Array<{
      metadata?: {
        profile_id?: string;
        tier?: string;
      };
      price?: {
        metadata?: {
          tier?: string;
        };
      };
    }>;
  };
};

export type StripeWebhookEvent =
  | {
      id: string;
      type: `customer.subscription.${string}`;
      data: { object: StripeSubscriptionPayload };
    }
  | {
      id: string;
      type: `invoice.${string}`;
      data: { object: StripeInvoicePayload };
    }
  | {
      id: string;
      type: string;
      data: { object: StripeSubscriptionPayload | StripeInvoicePayload };
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

export const STRIPE_INVOICE_STATUS_MAP: Record<string, string> = {
  draft: 'draft',
  open: 'open',
  paid: 'paid',
  void: 'void',
  uncollectible: 'uncollectible',
};

const VALID_TIERS = new Set(['trial', 'basic', 'advanced', 'pro']);
const PAID_TIERS = new Set(['basic', 'advanced', 'pro']);

/** Known monthly catalog tiers — mirrors packages/domain subscription catalog. */
export const STRIPE_MONTHLY_CATALOG_TIERS = ['basic', 'advanced', 'pro'] as const;

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

export function resolveStripeCustomerId(
  customer: string | { id: string } | null | undefined,
): string | null {
  if (!customer) {
    return null;
  }
  if (typeof customer === 'string') {
    return customer;
  }
  return customer.id ?? null;
}

function resolveStripeSubscriptionId(
  subscription: string | { id: string } | null | undefined,
): string | null {
  if (!subscription) {
    return null;
  }
  if (typeof subscription === 'string') {
    return subscription;
  }
  return subscription.id ?? null;
}

export function resolveProfileIdFromInvoice(invoice: StripeInvoicePayload): string | null {
  if (invoice.metadata?.profile_id) {
    return invoice.metadata.profile_id;
  }
  const lineMeta = invoice.lines?.data?.[0]?.metadata?.profile_id;
  return lineMeta ?? null;
}

export function resolveTierFromInvoice(invoice: StripeInvoicePayload): string | null {
  const metaTier = invoice.metadata?.tier;
  if (metaTier && PAID_TIERS.has(metaTier)) {
    return metaTier;
  }
  const lineTier =
    invoice.lines?.data?.[0]?.metadata?.tier ??
    invoice.lines?.data?.[0]?.price?.metadata?.tier;
  if (lineTier && PAID_TIERS.has(lineTier)) {
    return lineTier;
  }
  return null;
}

export function buildSubscriptionUpsert(sub: StripeSubscriptionPayload, profileId: string) {
  const status = STRIPE_STATUS_MAP[sub.status] ?? 'incomplete';

  return {
    profile_id: profileId,
    tier: resolveTierFromStripeSubscription(sub),
    status,
    stripe_customer_id: resolveStripeCustomerId(sub.customer),
    stripe_subscription_id: sub.id,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
  };
}

export function buildBillingInvoiceUpsert(invoice: StripeInvoicePayload, profileId: string) {
  const rawStatus = invoice.status ?? 'open';
  const status = STRIPE_INVOICE_STATUS_MAP[rawStatus] ?? 'open';
  const amount =
    typeof invoice.amount_paid === 'number' && invoice.amount_paid > 0
      ? invoice.amount_paid
      : (invoice.amount_due ?? 0);

  return {
    profile_id: profileId,
    stripe_invoice_id: invoice.id,
    amount_cents: amount,
    currency: invoice.currency ?? 'usd',
    status,
    hosted_invoice_url: invoice.hosted_invoice_url ?? null,
    invoice_pdf: invoice.invoice_pdf ?? null,
    period_start: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    paid_at: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : null,
  };
}

export type StripeWebhookHandleResult =
  | { handled: false; reason: string }
  | {
      handled: true;
      kind: 'subscription_upsert';
      idempotencyKey: string;
      eventType: string;
      upsert: ReturnType<typeof buildSubscriptionUpsert>;
    }
  | {
      handled: true;
      kind: 'invoice_upsert';
      idempotencyKey: string;
      eventType: string;
      invoice: ReturnType<typeof buildBillingInvoiceUpsert>;
    }
  | {
      handled: true;
      kind: 'payment_failed';
      idempotencyKey: string;
      eventType: string;
      stripeCustomerId: string | null;
      profileId: string | null;
      lockedStatus: 'past_due';
    };

export function handleStripeWebhookEvent(event: StripeWebhookEvent): StripeWebhookHandleResult {
  if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object as StripeSubscriptionPayload;
    const profileId = sub.metadata?.profile_id;
    if (!profileId) {
      return { handled: false, reason: 'missing_profile_id' };
    }

    return {
      handled: true,
      kind: 'subscription_upsert',
      idempotencyKey: event.id,
      eventType: event.type,
      upsert: buildSubscriptionUpsert(sub, profileId),
    };
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as StripeInvoicePayload;
    return {
      handled: true,
      kind: 'payment_failed',
      idempotencyKey: event.id,
      eventType: event.type,
      stripeCustomerId: resolveStripeCustomerId(invoice.customer),
      profileId: resolveProfileIdFromInvoice(invoice),
      lockedStatus: 'past_due',
    };
  }

  if (event.type === 'invoice.paid' || event.type === 'invoice.finalized') {
    const invoice = event.data.object as StripeInvoicePayload;
    const profileId = resolveProfileIdFromInvoice(invoice);
    if (!profileId) {
      return { handled: false, reason: 'missing_profile_id' };
    }

    return {
      handled: true,
      kind: 'invoice_upsert',
      idempotencyKey: event.id,
      eventType: event.type,
      invoice: buildBillingInvoiceUpsert(invoice, profileId),
    };
  }

  return { handled: false, reason: 'ignored_event_type' };
}

export { resolveStripeSubscriptionId };
