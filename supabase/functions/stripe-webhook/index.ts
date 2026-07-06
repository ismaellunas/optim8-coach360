import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleStripeWebhookEvent } from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'supabase_env_missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let event: Parameters<typeof handleStripeWebhookEvent>[0];
  try {
    event = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = handleStripeWebhookEvent(event);
  if (!result.handled) {
    return new Response(JSON.stringify({ received: true, skipped: result.reason }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await supabase.rpc('sync_subscription_from_stripe', {
    p_profile_id: result.upsert.profile_id,
    p_tier: result.upsert.tier,
    p_status: result.upsert.status,
    p_stripe_customer_id: result.upsert.stripe_customer_id,
    p_stripe_subscription_id: result.upsert.stripe_subscription_id,
    p_current_period_end: result.upsert.current_period_end,
    p_trial_ends_at: result.upsert.trial_ends_at,
    p_event_id: result.idempotencyKey,
    p_event_type: result.eventType,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true, synced: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
