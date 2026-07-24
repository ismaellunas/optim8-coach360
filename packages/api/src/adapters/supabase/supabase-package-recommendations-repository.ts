import type { SupabaseClient } from '@supabase/supabase-js';
import { edgeFunctionErrorDetail } from './edge-function-error.js';
import type {
  ListPackageRecommendationsInput,
  ListPackageRecommendationsResult,
  PackageRecommendationsRepository,
} from '../../ports/package-recommendations-repository.js';

export class SupabasePackageRecommendationsRepository
  implements PackageRecommendationsRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async listRecommendations(
    input: ListPackageRecommendationsInput = {},
  ): Promise<ListPackageRecommendationsResult> {
    const { data, error } = await this.client.functions.invoke('recommend-packages', {
      body: {
        objectives: input.objectives ?? [],
        age: input.age ?? null,
        tier: input.tier,
        purchaseHistory: input.purchaseHistory ?? [],
        progress: input.progress,
      },
    });

    const payload = data as (ListPackageRecommendationsResult & { error?: string; hint?: string }) | null;

    if (error) {
      throw new Error(await edgeFunctionErrorDetail(error, payload));
    }

    if (!payload?.recommendations || !Array.isArray(payload.recommendations)) {
      throw new Error(payload?.error || 'package_recommendations_failed');
    }

    return {
      recommendations: payload.recommendations,
      context: payload.context ?? {
        objectives: input.objectives ?? [],
        age: input.age ?? null,
        tier: input.tier ?? 'basic',
        purchaseHistory: input.purchaseHistory ?? [],
      },
    };
  }
}
