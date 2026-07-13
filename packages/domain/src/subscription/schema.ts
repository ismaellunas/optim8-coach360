import { z } from 'zod';

export const subscriptionTierSchema = z.enum(['trial', 'basic', 'advanced', 'pro']);
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;

export const subscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  tier: subscriptionTierSchema,
  status: subscriptionStatusSchema,
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  trialEndsAt: z.string().nullable(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export const billingInvoiceStatusSchema = z.enum([
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible',
]);
export type BillingInvoiceStatus = z.infer<typeof billingInvoiceStatusSchema>;

export const billingInvoiceSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  stripeInvoiceId: z.string().min(1),
  amountCents: z.number().int(),
  currency: z.string().min(1),
  status: billingInvoiceStatusSchema,
  hostedInvoiceUrl: z.string().nullable(),
  invoicePdf: z.string().nullable(),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});

export type BillingInvoice = z.infer<typeof billingInvoiceSchema>;
