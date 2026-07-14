import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeTrialWarningDays, type Subscription } from '@coach360/domain';
import type { SubscriptionRepository, SubscriptionSummary } from '../../ports/subscription-repository.js';
import { mapSubscriptionRow, SUBSCRIPTION_SELECT } from './mappers/subscription-mapper.js';

export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listSummaries(): Promise<SubscriptionSummary[]> {
    const { data, error } = await this.client.from('subscriptions').select('tier');

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

  async getByProfileId(profileId: string): Promise<Subscription | null> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select(SUBSCRIPTION_SELECT)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return mapSubscriptionRow(data);
  }

  async activateTrial(profileId: string): Promise<Subscription> {
    const { data, error } = await this.client.rpc('activate_user_trial');

    if (error) {
      throw new Error(error.message);
    }

    const row = data as Record<string, unknown>;
    if (!row || row.profile_id !== profileId) {
      throw new Error('trial_activation_failed');
    }

    return mapSubscriptionRow(row as Parameters<typeof mapSubscriptionRow>[0]);
  }

  async deferToBasic(profileId: string): Promise<Subscription> {
    const { data, error } = await this.client.rpc('defer_user_to_basic');

    if (error) {
      throw new Error(error.message);
    }

    const row = data as Record<string, unknown>;
    if (!row || row.profile_id !== profileId) {
      throw new Error('defer_to_basic_failed');
    }

    return mapSubscriptionRow(row as Parameters<typeof mapSubscriptionRow>[0]);
  }

  async expireOwnTrialIfEnded(profileId: string): Promise<Subscription> {
    const { data, error } = await this.client.rpc('expire_own_trial_if_ended');

    if (error) {
      throw new Error(error.message);
    }

    const row = data as Record<string, unknown>;
    if (!row || row.profile_id !== profileId) {
      throw new Error('expire_own_trial_failed');
    }

    return mapSubscriptionRow(row as Parameters<typeof mapSubscriptionRow>[0]);
  }

  async expireEndedTrials(): Promise<Subscription[]> {
    const { data, error } = await this.client.rpc('expire_ended_trials');

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as Array<Parameters<typeof mapSubscriptionRow>[0]>;
    return rows.map(mapSubscriptionRow);
  }

  async getTrialWarningDays(): Promise<number> {
    const { data, error } = await this.client.rpc('get_trial_warning_days');
    if (error) {
      throw new Error(error.message);
    }
    return normalizeTrialWarningDays(data);
  }

  async setTrialWarningDays(days: number): Promise<number> {
    const { data, error } = await this.client.rpc('set_trial_warning_days', {
      p_days: days,
    });
    if (error) {
      throw new Error(error.message);
    }
    return normalizeTrialWarningDays(data);
  }
}
