import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  assertCheckoutTier,
  createCheckoutSession,
  encodeStripeFormBody,
  resolvePriceIdForTier,
  type CheckoutTier,
  type StripeCheckoutSessionCreateBody,
} from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  tier?: string;
  successUrl?: string;
  cancelUrl?: string;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'supabase_env_missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!stripeSecret || !stripeSecret.startsWith('sk_')) {
    return new Response(
      JSON.stringify({
        error: 'stripe_secret_missing_or_invalid',
        hint: 'STRIPE_SECRET_KEY must be sk_test_... / sk_live_..., not whsec_... from stripe listen',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const tierRaw = body.tier;
  if (!tierRaw) {
    return new Response(JSON.stringify({ error: 'tier_required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let tier: CheckoutTier;
  try {
    assertCheckoutTier(tierRaw);
    tier = tierRaw;
  } catch (cause) {
    return new Response(
      JSON.stringify({ error: cause instanceof Error ? cause.message : 'invalid_tier' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const origin = request.headers.get('origin') || Deno.env.get('APP_ORIGIN') || 'http://localhost:5173';
  const successUrl = body.successUrl || `${origin}/?checkout=success`;
  const cancelUrl = body.cancelUrl || `${origin}/?checkout=cancel`;

  let priceId: string;
  try {
    priceId = resolvePriceIdForTier(tier, {
      STRIPE_PRICE_BASIC: Deno.env.get('STRIPE_PRICE_BASIC') ?? undefined,
      STRIPE_PRICE_ADVANCED: Deno.env.get('STRIPE_PRICE_ADVANCED') ?? undefined,
      STRIPE_PRICE_PRO: Deno.env.get('STRIPE_PRICE_PRO') ?? undefined,
    });
  } catch (cause) {
    return new Response(
      JSON.stringify({ error: cause instanceof Error ? cause.message : 'price_env_missing' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: subRow } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  const customerId =
    subRow && typeof subRow.stripe_customer_id === 'string' ? subRow.stripe_customer_id : null;

  try {
    const result = await createCheckoutSession({
      input: {
        tier,
        profileId: user.id,
        priceId,
        successUrl,
        cancelUrl,
        customerId,
      },
      createSession: async (sessionBody: StripeCheckoutSessionCreateBody) => {
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: encodeStripeFormBody(sessionBody as unknown as Record<string, string>),
        });
        const json = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
        if (!response.ok) {
          throw new Error(json.error?.message || `stripe_http_${response.status}`);
        }
        return { id: json.id ?? '', url: json.url ?? null };
      },
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (cause) {
    return new Response(
      JSON.stringify({ error: cause instanceof Error ? cause.message : 'checkout_failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
