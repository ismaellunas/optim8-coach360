import { NotImplementedAdapterError } from '../../client/types.js';
import type {
  CreatePackageCheckoutInput,
  CreatePackageCheckoutResult,
  MarketplacePurchaseRecord,
  MarketplacePurchaseRepository,
} from '../../ports/marketplace-purchase-repository.js';

export class RestMarketplacePurchaseRepository implements MarketplacePurchaseRepository {
  async createCheckoutSession(
    input: CreatePackageCheckoutInput,
  ): Promise<CreatePackageCheckoutResult> {
    void input;
    throw new NotImplementedAdapterError('rest', 'createPackageCheckoutSession');
  }

  async listOwned(): Promise<MarketplacePurchaseRecord[]> {
    return [];
  }
}
