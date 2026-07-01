export type SubscriptionSummary = {
  tier: string;
  count: number;
};

export interface SubscriptionRepository {
  listSummaries(): Promise<SubscriptionSummary[]>;
}
