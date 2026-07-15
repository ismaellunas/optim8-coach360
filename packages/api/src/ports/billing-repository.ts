import type { BillingInvoice, PaidSubscriptionTier } from '@coach360/domain';

export type CreateCheckoutSessionInput = {
  tier: PaidSubscriptionTier;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutSessionResult = {
  url: string;
  sessionId: string;
  tier: PaidSubscriptionTier;
  profileId: string;
};

export interface BillingRepository {
  listByProfileId(profileId: string): Promise<BillingInvoice[]>;
  /** Opens Stripe Checkout for a paid tier (STORY-4.4 paywall upgrade). */
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult>;
}
