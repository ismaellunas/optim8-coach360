import type { Subscription } from '@coach360/domain';

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
}
