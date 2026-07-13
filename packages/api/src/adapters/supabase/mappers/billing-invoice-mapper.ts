import { billingInvoiceSchema, type BillingInvoice } from '@coach360/domain';

type BillingInvoiceRow = {
  id: string;
  profile_id: string;
  stripe_invoice_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
};

export function mapBillingInvoiceRow(row: BillingInvoiceRow): BillingInvoice {
  return billingInvoiceSchema.parse({
    id: row.id,
    profileId: row.profile_id,
    stripeInvoiceId: row.stripe_invoice_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    hostedInvoiceUrl: row.hosted_invoice_url,
    invoicePdf: row.invoice_pdf,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  });
}

export const BILLING_INVOICE_SELECT =
  'id, profile_id, stripe_invoice_id, amount_cents, currency, status, hosted_invoice_url, invoice_pdf, period_start, period_end, paid_at, created_at';
