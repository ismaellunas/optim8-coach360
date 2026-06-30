import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionRepository, SubscriptionSummary } from '../../ports/subscription-repository.js';

export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listSummaries(): Promise<SubscriptionSummary[]> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('tier');

    if (error) {
      throw new Error(error.message);
    }

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const tier = String(row.tier);
      counts.set(tier, (counts.get(tier) ?? 0) + 1);
    }

    return [...counts.entries()].map(([tier, count]) => ({ tier, count }));
  }
}
