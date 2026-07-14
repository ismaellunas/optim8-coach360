/** Pure Checkout Session builders for STORY-4.4 (Deno edge + vitest). */

export type CheckoutTier = 'basic' | 'advanced' | 'pro';

export type CreateCheckoutSessionInput = {
  tier: CheckoutTier;
  profileId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string | null;
};

/** Stripe Checkout.sessions.create body (form-encoded keys) ready for API. */
export type StripeCheckoutSessionCreateBody = {
  mode: 'subscription';
  'line_items[0][price]': string;
  'line_items[0][quantity]': string;
  success_url: string;
  cancel_url: string;
  client_reference_id: string;
  'metadata[profile_id]': string;
  'metadata[tier]': string;
  'subscription_data[metadata][profile_id]': string;
  'subscription_data[metadata][tier]': string;
  customer?: string;
};

export type CreateCheckoutSessionResult = {
  url: string;
  sessionId: string;
  tier: CheckoutTier;
  profileId: string;
};

const PAID_TIERS: ReadonlySet<string> = new Set(['basic', 'advanced', 'pro']);

export function assertCheckoutTier(tier: string): asserts tier is CheckoutTier {
  if (!PAID_TIERS.has(tier)) {
    throw new Error(`invalid_checkout_tier:${tier}`);
  }
}

/**
 * Build Stripe Checkout Session create params for a subscription upgrade.
 * Session metadata mirrors webhook profile_id / tier expectations.
 */
export function buildStripeCheckoutSessionBody(
  input: CreateCheckoutSessionInput,
): StripeCheckoutSessionCreateBody {
  assertCheckoutTier(input.tier);
  if (!input.profileId) {
    throw new Error('checkout_profile_id_required');
  }
  if (!input.priceId) {
    throw new Error('checkout_price_id_required');
  }
  if (!input.successUrl || !input.cancelUrl) {
    throw new Error('checkout_urls_required');
  }

  const body: StripeCheckoutSessionCreateBody = {
    mode: 'subscription',
    'line_items[0][price]': input.priceId,
    'line_items[0][quantity]': '1',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.profileId,
    'metadata[profile_id]': input.profileId,
    'metadata[tier]': input.tier,
    'subscription_data[metadata][profile_id]': input.profileId,
    'subscription_data[metadata][tier]': input.tier,
  };

  if (input.customerId) {
    body.customer = input.customerId;
  }

  return body;
}

export function encodeStripeFormBody(body: Record<string, string>): string {
  return Object.entries(body)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * Create a Checkout Session via injected Stripe caller (testable without live Stripe).
 */
export async function createCheckoutSession(options: {
  input: CreateCheckoutSessionInput;
  createSession: (body: StripeCheckoutSessionCreateBody) => Promise<{
    id: string;
    url: string | null;
  }>;
}): Promise<CreateCheckoutSessionResult> {
  const body = buildStripeCheckoutSessionBody(options.input);
  const session = await options.createSession(body);

  if (!session.url) {
    throw new Error('checkout_session_missing_url');
  }

  return {
    url: session.url,
    sessionId: session.id,
    tier: options.input.tier,
    profileId: options.input.profileId,
  };
}

/** Env key mapping for catalog prices (matches STRIPE_PRODUCT_CATALOG). */
export const CHECKOUT_PRICE_ENV_BY_TIER: Record<CheckoutTier, string> = {
  basic: 'STRIPE_PRICE_BASIC',
  advanced: 'STRIPE_PRICE_ADVANCED',
  pro: 'STRIPE_PRICE_PRO',
};

export function resolvePriceIdForTier(
  tier: CheckoutTier,
  env: Record<string, string | undefined>,
): string {
  const key = CHECKOUT_PRICE_ENV_BY_TIER[tier];
  const priceId = env[key];
  if (!priceId) {
    throw new Error(`missing_price_env:${key}`);
  }
  return priceId;
}
