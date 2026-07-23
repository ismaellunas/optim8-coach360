import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  assertPackageCheckoutScope,
  createPackageCheckoutSession,
  encodeStripeFormBody,
  type PackageCheckoutScope,
  type StripePackageCheckoutSessionCreateBody,
} from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  sanityDocumentId?: string;
  scope?: string;
  teamId?: string | null;
  successUrl?: string;
  cancelUrl?: string;
};

const TIER_ORDER = ['trial', 'basic', 'advanced', 'pro'] as const;

function meetsAdvanced(tier: string | null | undefined): boolean {
  if (!tier) return false;
  return TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]) >= TIER_ORDER.indexOf('advanced');
}

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
        hint: 'STRIPE_SECRET_KEY must be sk_test_... / sk_live_...',
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

  const sanityDocumentId = body.sanityDocumentId?.trim();
  if (!sanityDocumentId) {
    return new Response(JSON.stringify({ error: 'package_id_required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const scopeRaw = (body.scope || 'personal').trim();
  let scope: PackageCheckoutScope;
  try {
    assertPackageCheckoutScope(scopeRaw);
    scope = scopeRaw;
  } catch (cause) {
    return new Response(
      JSON.stringify({ error: cause instanceof Error ? cause.message : 'invalid_scope' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const teamId = body.teamId?.trim() || null;
  if (scope === 'team' && !teamId) {
    return new Response(JSON.stringify({ error: 'team_id_required_for_team_purchase' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (scope === 'personal' && teamId) {
    return new Response(JSON.stringify({ error: 'team_id_not_allowed_for_personal_purchase' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const origin = request.headers.get('origin') || Deno.env.get('APP_ORIGIN') || 'http://localhost:5173';
  const successUrl = body.successUrl || `${origin}/?checkout=success&kind=package`;
  const cancelUrl = body.cancelUrl || `${origin}/?checkout=cancel&kind=package`;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  const { data: subRow } = await admin
    .from('subscriptions')
    .select('tier, stripe_customer_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (scope === 'team') {
    const role = profile && typeof profile.role === 'string' ? profile.role : null;
    const tier = subRow && typeof subRow.tier === 'string' ? subRow.tier : null;
    if (role !== 'coach' || !meetsAdvanced(tier)) {
      return new Response(JSON.stringify({ error: 'team_purchase_requires_coach_advanced' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isCoach, error: coachError } = await admin.rpc('is_team_coach', {
      p_team_id: teamId,
      p_user_id: user.id,
    });
    if (coachError || !isCoach) {
      return new Response(JSON.stringify({ error: 'not_team_coach' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const { data: pkgMeta, error: pkgError } = await admin
    .from('package_metadata')
    .select('sanity_document_id, stripe_price_id, published')
    .eq('sanity_document_id', sanityDocumentId)
    .maybeSingle();

  if (pkgError) {
    return new Response(JSON.stringify({ error: pkgError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!pkgMeta || pkgMeta.published !== true) {
    return new Response(JSON.stringify({ error: 'package_not_published' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const priceId =
    typeof pkgMeta.stripe_price_id === 'string' ? pkgMeta.stripe_price_id.trim() : '';
  if (!priceId) {
    return new Response(JSON.stringify({ error: 'package_stripe_price_missing' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const customerId =
    subRow && typeof subRow.stripe_customer_id === 'string' ? subRow.stripe_customer_id : null;

  try {
    const result = await createPackageCheckoutSession({
      input: {
        profileId: user.id,
        sanityDocumentId,
        priceId,
        scope,
        teamId,
        successUrl,
        cancelUrl,
        customerId,
      },
      createSession: async (sessionBody: StripePackageCheckoutSessionCreateBody) => {
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeSecret}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: encodeStripeFormBody(sessionBody as unknown as Record<string, string>),
        });
        const json = (await response.json()) as {
          id?: string;
          url?: string;
          error?: { message?: string };
        };
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
