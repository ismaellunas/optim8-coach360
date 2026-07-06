import { subscriptionSchema, type Subscription } from '@coach360/domain';

type SubscriptionRow = {
  id: string;
  profile_id: string;
  tier: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
};

export function mapSubscriptionRow(row: SubscriptionRow): Subscription {
  return subscriptionSchema.parse({
    id: row.id,
    profileId: row.profile_id,
    tier: row.tier,
    status: row.status,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    currentPeriodEnd: row.current_period_end,
    trialEndsAt: row.trial_ends_at,
  });
}

export const SUBSCRIPTION_SELECT =
  'id, profile_id, tier, status, stripe_customer_id, stripe_subscription_id, current_period_end, trial_ends_at';
