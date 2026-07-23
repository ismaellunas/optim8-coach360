import type { MarketplacePurchaseScope } from '@coach360/domain';

export type CreatePackageCheckoutInput = {
  sanityDocumentId: string;
  scope?: MarketplacePurchaseScope;
  teamId?: string | null;
  successUrl: string;
  cancelUrl: string;
};

export type CreatePackageCheckoutResult = {
  url: string;
  sessionId: string;
  sanityDocumentId: string;
  scope: MarketplacePurchaseScope;
  profileId: string;
  teamId: string | null;
};

export type MarketplacePurchaseRecord = {
  id: string;
  sanityDocumentId: string;
  scope: MarketplacePurchaseScope;
  teamId: string | null;
  purchasedAt: string;
};

export interface MarketplacePurchaseRepository {
  /** Opens Stripe Checkout for a published marketplace package (STORY-10.1). */
  createCheckoutSession(input: CreatePackageCheckoutInput): Promise<CreatePackageCheckoutResult>;
  /** Buyer-owned purchases (personal + team buys by this profile). */
  listOwned(): Promise<MarketplacePurchaseRecord[]>;
}
