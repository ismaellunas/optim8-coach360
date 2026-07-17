import type { FeatureFlagOverride, FreeContentCatalogItem, GatedRole } from '@coach360/domain';

export type ContentItem = {
  id: string;
  title: string;
  status: 'published' | 'review' | 'draft';
};

export type FeatureFlagInput = {
  feature: string;
  role: GatedRole;
  requiredTier: FeatureFlagOverride['requiredTier'];
  paywallTitle?: string | null;
  paywallMessage?: string | null;
};

export type FreeContentCatalogItemInput = {
  title: string;
  category?: string | null;
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
}
