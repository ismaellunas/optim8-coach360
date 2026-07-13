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
  getTrialWarningDays(): Promise<number>;
  setTrialWarningDays(days: number): Promise<number>;
}
