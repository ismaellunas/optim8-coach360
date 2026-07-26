import { NotImplementedAdapterError } from '../../client/types.js';
import type {
  Subscription,
  SubscriptionTier,
  TierCatalogDisplayOverride,
} from '@coach360/domain';
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

  async getTrialDurationDays(): Promise<number> {
    throw new NotImplementedAdapterError('rest', 'getTrialDurationDays');
  }

  async setTrialDurationDays(days: number): Promise<number> {
    void days;
    throw new NotImplementedAdapterError('rest', 'setTrialDurationDays');
  }

  async getTierCatalogOverrides(): Promise<TierCatalogDisplayOverride[]> {
    throw new NotImplementedAdapterError('rest', 'getTierCatalogOverrides');
  }

  async setTierCatalogOverrides(
    overrides: TierCatalogDisplayOverride[],
  ): Promise<TierCatalogDisplayOverride[]> {
    void overrides;
    throw new NotImplementedAdapterError('rest', 'setTierCatalogOverrides');
  }

  async overrideUserTier(profileId: string, tier: SubscriptionTier): Promise<Subscription> {
    void profileId;
    void tier;
    throw new NotImplementedAdapterError('rest', 'overrideUserTier');
  }
}
