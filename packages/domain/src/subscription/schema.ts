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
