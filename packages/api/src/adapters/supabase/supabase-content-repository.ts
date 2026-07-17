import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeatureFlagOverride, FreeContentCatalogItem } from '@coach360/domain';
import type {
  ContentItem,
  ContentRepository,
  FeatureFlagInput,
  FreeContentCatalogItemInput,
} from '../../ports/content-repository.js';

function mapFeatureFlagRow(row: {
  feature_key: string;
  role: string;
  required_tier: string;
  paywall_title: string | null;
  paywall_message: string | null;
}): FeatureFlagOverride {
  return {
    feature: row.feature_key,
    role: row.role as FeatureFlagOverride['role'],
    requiredTier: row.required_tier as FeatureFlagOverride['requiredTier'],
    paywallTitle: row.paywall_title,
    paywallMessage: row.paywall_message,
  };
}

function mapFreeContentCatalogRow(row: {
  id: string;
  title: string;
  category: string | null;
}): FreeContentCatalogItem {
  return { id: row.id, title: row.title, category: row.category };
}

/** Content list is a placeholder until marketplace metadata is synced to Supabase. */
export class SupabaseContentRepository implements ContentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<ContentItem[]> {
    return [
      { id: '1', title: 'Elite Shooting', status: 'published' },
      { id: '2', title: 'Lockdown Defense', status: 'published' },
      { id: '3', title: 'Rebounding Drills', status: 'review' },
    ];
  }

  async listFeatureFlags(): Promise<FeatureFlagOverride[]> {
    const { data, error } = await this.client
      .from('feature_flags')
      .select('feature_key, role, required_tier, paywall_title, paywall_message');

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapFeatureFlagRow);
  }

  async upsertFeatureFlag(input: FeatureFlagInput): Promise<FeatureFlagOverride> {
    const { data, error } = await this.client
      .from('feature_flags')
      .upsert(
        {
          feature_key: input.feature,
          role: input.role,
          required_tier: input.requiredTier,
          paywall_title: input.paywallTitle ?? null,
          paywall_message: input.paywallMessage ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'feature_key,role' },
      )
      .select('feature_key, role, required_tier, paywall_title, paywall_message')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapFeatureFlagRow(data);
  }

  async listFreeContentCatalog(): Promise<FreeContentCatalogItem[]> {
    const { data, error } = await this.client
      .from('free_content_catalog')
      .select('id, title, category')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapFreeContentCatalogRow);
  }

  async addFreeContentCatalogItem(
    input: FreeContentCatalogItemInput,
  ): Promise<FreeContentCatalogItem> {
    const { data, error } = await this.client
      .from('free_content_catalog')
      .insert({ title: input.title, category: input.category ?? null })
      .select('id, title, category')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapFreeContentCatalogRow(data);
  }

  async removeFreeContentCatalogItem(id: string): Promise<void> {
    const { error } = await this.client.from('free_content_catalog').delete().eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
