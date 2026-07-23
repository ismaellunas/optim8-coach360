import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  assertPaidTier,
  changeSubscriptionTier,
  encodeStripeFormBody,
  resolvePriceIdForTier,
  resolveSubscriptionBillingPeriod,
  type PaidTier,
  type StripeDowngradeSchedulePhasesBody,
  type StripeSubscriptionUpgradeBody,
} from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function stripeRequest(
  stripeSecret: string,
  path: string,
  body?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${stripeSecret}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: body ? encodeStripeFormBody(body) : undefined,
  });
  const json = (await response.json()) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(json.error?.message || `stripe_http_${response.status}`);
  }
  return json;
}

type RequestBody = {
  tier?: string;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'supabase_env_missing' }, 500);
  }

  if (!stripeSecret || !stripeSecret.startsWith('sk_')) {
    return jsonResponse(
      {
        error: 'stripe_secret_missing_or_invalid',
        hint: 'STRIPE_SECRET_KEY must be sk_test_... / sk_live_..., not whsec_... from stripe listen',
      },
      500,
    );
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const tierRaw = body.tier;
  if (!tierRaw) {
    return jsonResponse({ error: 'tier_required' }, 400);
  }

  let targetTier: PaidTier;
  try {
    assertPaidTier(tierRaw);
    targetTier = tierRaw;
  } catch (cause) {
    return jsonResponse(
      { error: cause instanceof Error ? cause.message : 'invalid_tier' },
      400,
    );
  }

  const priceEnv = {
    STRIPE_PRICE_BASIC: Deno.env.get('STRIPE_PRICE_BASIC') ?? undefined,
    STRIPE_PRICE_ADVANCED: Deno.env.get('STRIPE_PRICE_ADVANCED') ?? undefined,
    STRIPE_PRICE_PRO: Deno.env.get('STRIPE_PRICE_PRO') ?? undefined,
  };

  let targetPriceId: string;
  try {
    targetPriceId = resolvePriceIdForTier(targetTier, priceEnv);
  } catch (cause) {
    return jsonResponse(
      { error: cause instanceof Error ? cause.message : 'price_env_missing' },
      500,
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: subRow, error: subError } = await admin
    .from('subscriptions')
    .select('tier, stripe_subscription_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (subError) {
    return jsonResponse({ error: subError.message }, 500);
  }

  const stripeSubscriptionId =
    subRow && typeof subRow.stripe_subscription_id === 'string'
      ? subRow.stripe_subscription_id
      : null;

  if (!stripeSubscriptionId) {
    return jsonResponse(
      {
        error: 'no_stripe_subscription',
        hint: 'Use create-checkout-session to start a paid subscription first.',
      },
      409,
    );
  }

  // Live Stripe subscription is the source of truth for item / price / period.
  // Basil+ APIs expose period on the item, not the subscription root.
  let stripeSub: {
    itemId: string;
    priceId: string;
    periodStart: number;
    periodEnd: number;
    scheduleId: string | null;
  };
  try {
    const raw = await stripeRequest(stripeSecret, `/v1/subscriptions/${stripeSubscriptionId}`);
    const items = raw.items as {
      data?: Array<{
        id?: string;
        price?: { id?: string };
        current_period_start?: number;
        current_period_end?: number;
      }>;
    };
    const firstItem = items?.data?.[0];
    const { periodStart, periodEnd } = resolveSubscriptionBillingPeriod({
      current_period_start:
        typeof raw.current_period_start === 'number' ? raw.current_period_start : null,
      current_period_end:
        typeof raw.current_period_end === 'number' ? raw.current_period_end : null,
      items,
    });
    const scheduleField = raw.schedule;
    stripeSub = {
      itemId: firstItem?.id ?? '',
      priceId: firstItem?.price?.id ?? '',
      periodStart,
      periodEnd,
      scheduleId:
        typeof scheduleField === 'string'
          ? scheduleField
          : scheduleField &&
              typeof scheduleField === 'object' &&
              typeof (scheduleField as { id?: unknown }).id === 'string'
            ? String((scheduleField as { id: string }).id)
            : null,
    };
  } catch (cause) {
    return jsonResponse(
      { error: cause instanceof Error ? cause.message : 'stripe_subscription_fetch_failed' },
      500,
    );
  }

  try {
    const result = await changeSubscriptionTier({
      input: {
        profileId: user.id,
        currentTier: typeof subRow?.tier === 'string' ? subRow.tier : 'basic',
        targetTier,
        stripeSubscriptionId,
        subscriptionItemId: stripeSub.itemId,
        currentPriceId: stripeSub.priceId,
        targetPriceId,
        currentPeriodStart: stripeSub.periodStart,
        currentPeriodEnd: stripeSub.periodEnd,
        existingScheduleId: stripeSub.scheduleId,
      },
      stripe: {
        updateSubscription: async (
          subscriptionId: string,
          upgradeBody: StripeSubscriptionUpgradeBody,
        ) => {
          const raw = await stripeRequest(
            stripeSecret,
            `/v1/subscriptions/${subscriptionId}`,
            upgradeBody as unknown as Record<string, string>,
          );
          return { id: String(raw.id ?? ''), status: String(raw.status ?? '') };
        },
        createSchedule: async (subscriptionId: string) => {
          const raw = await stripeRequest(stripeSecret, '/v1/subscription_schedules', {
            from_subscription: subscriptionId,
          });
          return { id: String(raw.id ?? '') };
        },
        updateSchedule: async (
          scheduleId: string,
          phasesBody: StripeDowngradeSchedulePhasesBody,
        ) => {
          const raw = await stripeRequest(
            stripeSecret,
            `/v1/subscription_schedules/${scheduleId}`,
            phasesBody as unknown as Record<string, string>,
          );
          return { id: String(raw.id ?? '') };
        },
        releaseSchedule: async (scheduleId: string) => {
          await stripeRequest(stripeSecret, `/v1/subscription_schedules/${scheduleId}/release`);
        },
      },
      persist: {
        applyUpgrade: async (update) => {
          const { error } = await admin
            .from('subscriptions')
            .update({
              tier: update.tier,
              status: 'active',
              pending_tier: null,
              pending_tier_effective_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('profile_id', update.profileId);
          if (error) {
            throw new Error(error.message);
          }
        },
        schedulePendingDowngrade: async (update) => {
          const { error } = await admin
            .from('subscriptions')
            .update({
              pending_tier: update.pendingTier,
              pending_tier_effective_at: update.pendingTierEffectiveAt,
              updated_at: new Date().toISOString(),
            })
            .eq('profile_id', update.profileId);
          if (error) {
            throw new Error(error.message);
          }
        },
      },
    });

    return jsonResponse(result, 200);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'tier_change_failed';
    const status = message === 'tier_unchanged' ? 400 : 500;
    return jsonResponse({ error: message }, status);
  }
});
