import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingInvoice } from '@coach360/domain';
import type { BillingRepository } from '../../ports/billing-repository.js';
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
}
