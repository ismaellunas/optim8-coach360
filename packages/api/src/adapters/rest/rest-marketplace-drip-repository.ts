import { NotImplementedAdapterError } from '../../client/types.js';
import type { DripProgressRow, TeamMemberPackageCompletion } from '@coach360/domain';
import type { MarketplaceDripRepository } from '../../ports/marketplace-drip-repository.js';

export class RestMarketplaceDripRepository implements MarketplaceDripRepository {
  async listForPurchase(purchaseId: string): Promise<DripProgressRow[]> {
    void purchaseId;
    return [];
  }

  async markModuleCompleted(purchaseId: string, moduleId: string): Promise<string> {
    void purchaseId;
    void moduleId;
    throw new NotImplementedAdapterError('rest', 'markDripModuleCompleted');
  }

  async listTeamPurchaseCompletions(
    purchaseId: string,
  ): Promise<TeamMemberPackageCompletion[]> {
    void purchaseId;
    return [];
  }
}
