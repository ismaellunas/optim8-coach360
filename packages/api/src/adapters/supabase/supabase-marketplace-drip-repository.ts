import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeCompletionPercent,
  type DripProgressRow,
  type TeamMemberPackageCompletion,
} from '@coach360/domain';
import type { MarketplaceDripRepository } from '../../ports/marketplace-drip-repository.js';

type DripProgressDbRow = {
  module_id: string;
  scheduled_unlock_at: string | null;
  unlocked_at: string | null;
  completed_at: string | null;
};

type TeamCompletionDbRow = {
  profile_id: string;
  display_name: string | null;
  total_modules: number;
  completed_modules: number;
  unlocked_modules: number;
};

export class SupabaseMarketplaceDripRepository implements MarketplaceDripRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listForPurchase(purchaseId: string): Promise<DripProgressRow[]> {
    const { data: auth } = await this.client.auth.getUser();
    const profileId = auth?.user?.id;

    let query = this.client
      .from('drip_progress')
      .select('module_id, scheduled_unlock_at, unlocked_at, completed_at')
      .eq('purchase_id', purchaseId)
      .order('scheduled_unlock_at', { ascending: true });
    // Team buyers can read every player's rows; scope to own module state.
    if (profileId) {
      query = query.eq('profile_id', profileId);
    }
    const { data, error } = await query;

    if (error) {
      throw new Error(`drip_progress_load_failed:${error.message}`);
    }

    return ((data ?? []) as DripProgressDbRow[]).map((row) => ({
      moduleId: row.module_id,
      scheduledUnlockAt: row.scheduled_unlock_at,
      unlockedAt: row.unlocked_at,
      completedAt: row.completed_at,
    }));
  }

  async markModuleCompleted(purchaseId: string, moduleId: string): Promise<string> {
    const { data, error } = await this.client.rpc('mark_drip_module_completed', {
      p_purchase_id: purchaseId,
      p_module_id: moduleId,
    });

    if (error) {
      throw new Error(`drip_module_complete_failed:${error.message}`);
    }

    return String(data);
  }

  async listTeamPurchaseCompletions(
    purchaseId: string,
  ): Promise<TeamMemberPackageCompletion[]> {
    const { data, error } = await this.client.rpc('list_team_purchase_completions', {
      p_purchase_id: purchaseId,
    });

    if (error) {
      throw new Error(`team_completions_load_failed:${error.message}`);
    }

    return ((data ?? []) as TeamCompletionDbRow[]).map((row) => ({
      profileId: row.profile_id,
      displayName: row.display_name,
      totalModules: row.total_modules,
      completedModules: row.completed_modules,
      completionPercent: computeCompletionPercent(row.completed_modules, row.total_modules),
    }));
  }
}
