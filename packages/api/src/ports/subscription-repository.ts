import type {
  Subscription,
  SubscriptionTier,
  TierCatalogDisplayOverride,
} from '@coach360/domain';

export type SubscriptionSummary = {
  tier: string;
  count: number;
};

export interface SubscriptionRepository {
  listSummaries(): Promise<SubscriptionSummary[]>;
  getByProfileId(profileId: string): Promise<Subscription | null>;
  activateTrial(profileId: string): Promise<Subscription>;
  deferToBasic(profileId: string): Promise<Subscription>;
  /** Client reconcile: downgrade current user's expired trial to Basic. */
  expireOwnTrialIfEnded(profileId: string): Promise<Subscription>;
  /** Service/batch: expire all ended trials (Flow 9). */
  expireEndedTrials(): Promise<Subscription[]>;
  getTrialWarningDays(): Promise<number>;
  setTrialWarningDays(days: number): Promise<number>;
  getTrialDurationDays(): Promise<number>;
  setTrialDurationDays(days: number): Promise<number>;
  getTierCatalogOverrides(): Promise<TierCatalogDisplayOverride[]>;
  setTierCatalogOverrides(
    overrides: TierCatalogDisplayOverride[],
  ): Promise<TierCatalogDisplayOverride[]>;
  /** Admin complimentary/manual tier grant (STORY-12.2 AC-4). */
  overrideUserTier(profileId: string, tier: SubscriptionTier): Promise<Subscription>;
}
