import type { MarketplaceCatalogPackage } from '@coach360/domain';

export type { MarketplaceCatalogPackage };

export interface MarketplaceCatalogRepository {
  /** Published training packages from Sanity CDN/API. */
  listPublished(): Promise<MarketplaceCatalogPackage[]>;
}
