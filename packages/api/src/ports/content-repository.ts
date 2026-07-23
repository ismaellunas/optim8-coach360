import type { FeatureFlagOverride, FreeContentCatalogItem, WorkflowStatus } from '@coach360/domain';

export type ContentItem = {
  id: string;
  title: string;
  status: 'published' | 'review' | 'draft';
};

export type FeatureFlagInput = {
  feature: string;
  role: GatedRoleFromDomain;
  requiredTier: FeatureFlagOverride['requiredTier'];
  paywallTitle?: string | null;
  paywallMessage?: string | null;
};

type GatedRoleFromDomain = FeatureFlagOverride['role'];

export type FreeContentCatalogItemInput = {
  title: string;
  category?: string | null;
};

/** Admin marketplace Path B review queue item (STORY-10.4). */
export type MarketplaceReviewItem = {
  id: string;
  title: string;
  workflowStatus: WorkflowStatus | null;
  published: boolean;
  stripePriceId: string | null;
  suggestedPriceCents: number | null;
  priceCents: number | null;
  currency: string | null;
  createdByRole: string | null;
};

export type PublishMarketplacePackageInput = {
  sanityDocumentId: string;
  stripePriceId: string;
  priceCents?: number | null;
  currency?: string | null;
};

export type MarketplaceReviewActionResult = {
  ok: true;
  sanityDocumentId: string;
  action: 'approve' | 'reject' | 'publish';
  workflowStatus: WorkflowStatus;
  published: boolean;
  stripePriceId: string | null;
  priceCents: number | null;
  currency: string | null;
};

export interface ContentRepository {
  list(): Promise<ContentItem[]>;
  /** Admin-configured feature tier overrides (STORY-5.3 AC-1/AC-2). */
  listFeatureFlags(): Promise<FeatureFlagOverride[]>;
  upsertFeatureFlag(input: FeatureFlagInput): Promise<FeatureFlagOverride>;
  /** Admin-maintained free-to-browse catalog at Basic tier (STORY-5.3 AC-3). */
  listFreeContentCatalog(): Promise<FreeContentCatalogItem[]>;
  addFreeContentCatalogItem(input: FreeContentCatalogItemInput): Promise<FreeContentCatalogItem>;
  removeFreeContentCatalogItem(id: string): Promise<void>;
  /** STORY-10.4 — pending_review + approved-unpublished packages. */
  listMarketplaceReviewQueue(): Promise<MarketplaceReviewItem[]>;
  approveMarketplacePackage(sanityDocumentId: string): Promise<MarketplaceReviewActionResult>;
  rejectMarketplacePackage(sanityDocumentId: string): Promise<MarketplaceReviewActionResult>;
  publishMarketplacePackage(
    input: PublishMarketplacePackageInput,
  ): Promise<MarketplaceReviewActionResult>;
}
