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

  async expireOwnTrialIfEnded(profileId: string): Promise<Subscription> {
    void profileId;
    throw new NotImplementedAdapterError('rest', 'expireOwnTrialIfEnded');
  }

  async expireEndedTrials(): Promise<Subscription[]> {
    throw new NotImplementedAdapterError('rest', 'expireEndedTrials');
  }

  async getTrialWarningDays(): Promise<number> {
    throw new NotImplementedAdapterError('rest', 'getTrialWarningDays');
  }

  async setTrialWarningDays(days: number): Promise<number> {
    void days;
    throw new NotImplementedAdapterError('rest', 'setTrialWarningDays');
  }
}
