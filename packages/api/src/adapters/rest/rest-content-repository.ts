import type { FeatureFlagOverride, FreeContentCatalogItem } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type {
  ContentItem,
  ContentRepository,
  FeatureFlagInput,
  FreeContentCatalogItemInput,
} from '../../ports/content-repository.js';

export class RestContentRepository implements ContentRepository {
  async list(): Promise<ContentItem[]> {
    throw new NotImplementedAdapterError('rest', 'listContent');
  }

  async listFeatureFlags(): Promise<FeatureFlagOverride[]> {
    throw new NotImplementedAdapterError('rest', 'listFeatureFlags');
  }

  async upsertFeatureFlag(input: FeatureFlagInput): Promise<FeatureFlagOverride> {
    void input;
    throw new NotImplementedAdapterError('rest', 'upsertFeatureFlag');
  }

  async listFreeContentCatalog(): Promise<FreeContentCatalogItem[]> {
    throw new NotImplementedAdapterError('rest', 'listFreeContentCatalog');
  }

  async addFreeContentCatalogItem(
    input: FreeContentCatalogItemInput,
  ): Promise<FreeContentCatalogItem> {
    void input;
    throw new NotImplementedAdapterError('rest', 'addFreeContentCatalogItem');
  }

  async removeFreeContentCatalogItem(id: string): Promise<void> {
    void id;
    throw new NotImplementedAdapterError('rest', 'removeFreeContentCatalogItem');
  }
}
