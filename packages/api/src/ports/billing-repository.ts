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

export type ChangeSubscriptionTierInput = {
  tier: PaidSubscriptionTier;
};

export type ChangeSubscriptionTierResult = {
  /** Upgrades apply immediately; downgrades wait until the period ends (Flow 17). */
  kind: 'upgraded' | 'downgrade_scheduled';
  /** Active tier after the call (unchanged for scheduled downgrades). */
  tier: PaidSubscriptionTier;
  pendingTier: PaidSubscriptionTier | null;
  pendingTierEffectiveAt: string | null;
  profileId: string;
};

export interface BillingRepository {
  listByProfileId(profileId: string): Promise<BillingInvoice[]>;
  /** Opens Stripe Checkout for a paid tier (STORY-4.4 paywall upgrade). */
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult>;
  /**
   * Changes the tier of an existing Stripe subscription (STORY-4.5):
   * immediate prorated upgrade or end-of-cycle scheduled downgrade.
   */
  changeSubscriptionTier(input: ChangeSubscriptionTierInput): Promise<ChangeSubscriptionTierResult>;
}
