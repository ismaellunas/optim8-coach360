import { NotImplementedAdapterError } from '../../client/types.js';
import type { Subscription } from '@coach360/domain';
import type { SubscriptionRepository, SubscriptionSummary } from '../../ports/subscription-repository.js';

export class RestSubscriptionRepository implements SubscriptionRepository {
  async listSummaries(): Promise<SubscriptionSummary[]> {
    throw new NotImplementedAdapterError('rest', 'listSubscriptionSummaries');
  }

  async getByProfileId(profileId: string): Promise<Subscription | null> {
    void profileId;
    throw new NotImplementedAdapterError('rest', 'getSubscriptionByProfileId');
  }

  async activateTrial(profileId: string): Promise<Subscription> {
    void profileId;
    throw new NotImplementedAdapterError('rest', 'activateTrial');
  }

  async deferToBasic(profileId: string): Promise<Subscription> {
    void profileId;
    throw new NotImplementedAdapterError('rest', 'deferToBasic');
  }
}
