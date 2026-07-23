import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketplacePurchaseScope } from '@coach360/domain';
import { edgeFunctionErrorDetail } from './edge-function-error.js';
import type {
  CreatePackageCheckoutInput,
  CreatePackageCheckoutResult,
  MarketplacePurchaseRecord,
  MarketplacePurchaseRepository,
} from '../../ports/marketplace-purchase-repository.js';

type PurchaseRow = {
  id: string;
  sanity_document_id: string;
  scope: string | null;
  team_id: string | null;
  purchased_at: string;
};

function mapPurchaseRow(row: PurchaseRow): MarketplacePurchaseRecord {
  return {
    id: row.id,
    sanityDocumentId: row.sanity_document_id,
    scope: row.scope === 'team' ? 'team' : 'personal',
    teamId: row.team_id,
    purchasedAt: row.purchased_at,
  };
}

export class SupabaseMarketplacePurchaseRepository implements MarketplacePurchaseRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createCheckoutSession(
    input: CreatePackageCheckoutInput,
  ): Promise<CreatePackageCheckoutResult> {
    const { data, error } = await this.client.functions.invoke('create-package-checkout-session', {
      body: {
        sanityDocumentId: input.sanityDocumentId,
        scope: input.scope ?? 'personal',
        teamId: input.teamId ?? null,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      },
    });

    const payload = data as (CreatePackageCheckoutResult & { error?: string; hint?: string }) | null;

    if (error) {
      throw new Error(await edgeFunctionErrorDetail(error, payload));
    }

    if (!payload?.url) {
      throw new Error(payload?.error || 'package_checkout_session_failed');
    }

    return {
      url: payload.url,
      sessionId: payload.sessionId,
      sanityDocumentId: payload.sanityDocumentId,
      scope: payload.scope as MarketplacePurchaseScope,
      profileId: payload.profileId,
      teamId: payload.teamId ?? null,
    };
  }

  async listOwned(): Promise<MarketplacePurchaseRecord[]> {
    const { data, error } = await this.client
      .from('purchases')
      .select('id, sanity_document_id, scope, team_id, purchased_at')
      .order('purchased_at', { ascending: false });

    if (error) {
      throw new Error(`purchases_load_failed:${error.message}`);
    }

    return ((data ?? []) as PurchaseRow[]).map(mapPurchaseRow);
  }
}
