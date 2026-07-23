/** Pure Stripe Checkout Session builders for marketplace packages (STORY-10.1). */

export type PackageCheckoutScope = 'personal' | 'team';

export type CreatePackageCheckoutSessionInput = {
  profileId: string;
  sanityDocumentId: string;
  priceId: string;
  scope: PackageCheckoutScope;
  teamId?: string | null;
  successUrl: string;
  cancelUrl: string;
  customerId?: string | null;
};

/** Stripe Checkout.sessions.create body (form-encoded keys) for one-time payment. */
export type StripePackageCheckoutSessionCreateBody = {
  mode: 'payment';
  'line_items[0][price]': string;
  'line_items[0][quantity]': string;
  success_url: string;
  cancel_url: string;
  client_reference_id: string;
  'metadata[kind]': 'marketplace_purchase';
  'metadata[profile_id]': string;
  'metadata[sanity_document_id]': string;
  'metadata[scope]': PackageCheckoutScope;
  'metadata[team_id]'?: string;
  'payment_intent_data[metadata][kind]': 'marketplace_purchase';
  'payment_intent_data[metadata][profile_id]': string;
  'payment_intent_data[metadata][sanity_document_id]': string;
  'payment_intent_data[metadata][scope]': PackageCheckoutScope;
  'payment_intent_data[metadata][team_id]'?: string;
  customer?: string;
};

export type CreatePackageCheckoutSessionResult = {
  url: string;
  sessionId: string;
  sanityDocumentId: string;
  scope: PackageCheckoutScope;
  profileId: string;
  teamId: string | null;
};

export function assertPackageCheckoutScope(scope: string): asserts scope is PackageCheckoutScope {
  if (scope !== 'personal' && scope !== 'team') {
    throw new Error(`invalid_purchase_scope:${scope}`);
  }
}

/**
 * Build Stripe Checkout Session create params for a one-time package purchase.
 */
export function buildStripePackageCheckoutSessionBody(
  input: CreatePackageCheckoutSessionInput,
): StripePackageCheckoutSessionCreateBody {
  assertPackageCheckoutScope(input.scope);
  if (!input.profileId) {
    throw new Error('checkout_profile_id_required');
  }
  if (!input.sanityDocumentId) {
    throw new Error('package_id_required');
  }
  if (!input.priceId) {
    throw new Error('checkout_price_id_required');
  }
  if (!input.successUrl || !input.cancelUrl) {
    throw new Error('checkout_urls_required');
  }
  if (input.scope === 'team' && !input.teamId) {
    throw new Error('team_id_required_for_team_purchase');
  }

  const body: StripePackageCheckoutSessionCreateBody = {
    mode: 'payment',
    'line_items[0][price]': input.priceId,
    'line_items[0][quantity]': '1',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.profileId,
    'metadata[kind]': 'marketplace_purchase',
    'metadata[profile_id]': input.profileId,
    'metadata[sanity_document_id]': input.sanityDocumentId,
    'metadata[scope]': input.scope,
    'payment_intent_data[metadata][kind]': 'marketplace_purchase',
    'payment_intent_data[metadata][profile_id]': input.profileId,
    'payment_intent_data[metadata][sanity_document_id]': input.sanityDocumentId,
    'payment_intent_data[metadata][scope]': input.scope,
  };

  if (input.scope === 'team' && input.teamId) {
    body['metadata[team_id]'] = input.teamId;
    body['payment_intent_data[metadata][team_id]'] = input.teamId;
  }

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

export async function createPackageCheckoutSession(options: {
  input: CreatePackageCheckoutSessionInput;
  createSession: (body: StripePackageCheckoutSessionCreateBody) => Promise<{
    id: string;
    url: string | null;
  }>;
}): Promise<CreatePackageCheckoutSessionResult> {
  const body = buildStripePackageCheckoutSessionBody(options.input);
  const session = await options.createSession(body);

  if (!session.url) {
    throw new Error('checkout_session_missing_url');
  }

  return {
    url: session.url,
    sessionId: session.id,
    sanityDocumentId: options.input.sanityDocumentId,
    scope: options.input.scope,
    profileId: options.input.profileId,
    teamId: options.input.teamId ?? null,
  };
}
