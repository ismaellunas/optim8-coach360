import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingInvoice, PaidSubscriptionTier } from '@coach360/domain';
import type {
  BillingRepository,
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
} from '../../ports/billing-repository.js';
import {
  BILLING_INVOICE_SELECT,
  mapBillingInvoiceRow,
} from './mappers/billing-invoice-mapper.js';

export class SupabaseBillingRepository implements BillingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listByProfileId(profileId: string): Promise<BillingInvoice[]> {
    const { data, error } = await this.client
      .from('billing_invoices')
      .select(BILLING_INVOICE_SELECT)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) =>
      mapBillingInvoiceRow(row as Parameters<typeof mapBillingInvoiceRow>[0]),
    );
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionResult> {
    const { data, error } = await this.client.functions.invoke('create-checkout-session', {
      body: {
        tier: input.tier,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      },
    });

    const payload = data as (CreateCheckoutSessionResult & { error?: string; hint?: string }) | null;

    if (error) {
      const detail = payload?.error
        ? `${payload.error}${payload.hint ? ` (${payload.hint})` : ''}`
        : error.message;
      throw new Error(detail);
    }

    if (!payload?.url) {
      throw new Error(payload?.error || 'checkout_session_failed');
    }

    return {
      url: payload.url,
      sessionId: payload.sessionId,
      tier: payload.tier as PaidSubscriptionTier,
      profileId: payload.profileId,
    };
  }
}
