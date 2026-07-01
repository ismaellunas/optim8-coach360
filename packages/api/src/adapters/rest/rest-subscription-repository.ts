import { NotImplementedAdapterError } from '../../client/types.js';
import type { SubscriptionRepository, SubscriptionSummary } from '../../ports/subscription-repository.js';

export class RestSubscriptionRepository implements SubscriptionRepository {
  async listSummaries(): Promise<SubscriptionSummary[]> {
    throw new NotImplementedAdapterError('rest', 'listSubscriptionSummaries');
  }
}
