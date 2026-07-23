import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FeatureFlagOverride,
  FreeContentCatalogItem,
  WorkflowStatus,
} from '@coach360/domain';
import { edgeFunctionErrorDetail } from './edge-function-error.js';
import type {
  ContentItem,
  ContentRepository,
  FeatureFlagInput,
  FreeContentCatalogItemInput,
  MarketplaceReviewActionResult,
  MarketplaceReviewItem,
  PublishMarketplacePackageInput,
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

type MetaRow = {
  sanity_document_id: string;
  title: string;
  workflow_status: string | null;
  published: boolean;
  stripe_price_id: string | null;
  suggested_price_cents: number | null;
  price_cents: number | null;
  currency: string | null;
  created_by_role: string | null;
};

function mapReviewItem(row: MetaRow): MarketplaceReviewItem {
  return {
    id: row.sanity_document_id,
    title: row.title,
    workflowStatus: (row.workflow_status as WorkflowStatus | null) ?? null,
    published: Boolean(row.published),
    stripePriceId: row.stripe_price_id,
    suggestedPriceCents: row.suggested_price_cents,
    priceCents: row.price_cents,
    currency: row.currency,
    createdByRole: row.created_by_role,
  };
}

function mapActionResult(payload: Record<string, unknown>): MarketplaceReviewActionResult {
  return {
    ok: true,
    sanityDocumentId: String(payload.sanityDocumentId || ''),
    action: payload.action as MarketplaceReviewActionResult['action'],
    workflowStatus: payload.workflowStatus as WorkflowStatus,
    published: Boolean(payload.published),
    stripePriceId: (payload.stripePriceId as string | null) ?? null,
    priceCents: typeof payload.priceCents === 'number' ? payload.priceCents : null,
    currency: (payload.currency as string | null) ?? null,
  };
}

export class SupabaseContentRepository implements ContentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<ContentItem[]> {
    const queue = await this.listMarketplaceReviewQueue();
    const { data, error } = await this.client
      .from('package_metadata')
      .select('sanity_document_id, title, workflow_status, published')
      .eq('published', true)
      .order('title', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const published: ContentItem[] = (data ?? []).map((row) => ({
      id: row.sanity_document_id as string,
      title: row.title as string,
      status: 'published' as const,
    }));

    const review: ContentItem[] = queue.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.workflowStatus === 'pending_review' ? ('review' as const) : ('draft' as const),
    }));

    return [...review, ...published];
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

  async listMarketplaceReviewQueue(): Promise<MarketplaceReviewItem[]> {
    const { data, error } = await this.client
      .from('package_metadata')
      .select(
        'sanity_document_id, title, workflow_status, published, stripe_price_id, suggested_price_cents, price_cents, currency, created_by_role',
      )
      .or('workflow_status.eq.pending_review,and(workflow_status.eq.approved,published.eq.false)')
      .order('title', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as MetaRow[]).map(mapReviewItem);
  }

  private async invokeReview(
    body: Record<string, unknown>,
  ): Promise<MarketplaceReviewActionResult> {
    const { data, error } = await this.client.functions.invoke('review-marketplace-package', {
      body,
    });

    const payload = data as (Record<string, unknown> & { error?: string }) | null;

    if (error) {
      throw new Error(await edgeFunctionErrorDetail(error, payload));
    }

    if (!payload?.ok) {
      throw new Error(payload?.error || 'marketplace_review_failed');
    }

    return mapActionResult(payload);
  }

  async approveMarketplacePackage(
    sanityDocumentId: string,
  ): Promise<MarketplaceReviewActionResult> {
    return this.invokeReview({ sanityDocumentId, action: 'approve' });
  }

  async rejectMarketplacePackage(sanityDocumentId: string): Promise<MarketplaceReviewActionResult> {
    return this.invokeReview({ sanityDocumentId, action: 'reject' });
  }

  async publishMarketplacePackage(
    input: PublishMarketplacePackageInput,
  ): Promise<MarketplaceReviewActionResult> {
    return this.invokeReview({
      sanityDocumentId: input.sanityDocumentId,
      action: 'publish',
      stripePriceId: input.stripePriceId,
      priceCents: input.priceCents ?? null,
      currency: input.currency ?? null,
    });
  }
}
