import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST' && request.method !== 'GET') {
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

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Persist Flow 9 downgrade: trial/trialing past trial_ends_at → basic/active.
  const { data: expiredRows, error: expireError } = await supabase.rpc('expire_ended_trials');
  if (expireError) {
    return new Response(JSON.stringify({ error: expireError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rows = (expiredRows ?? []) as Array<{
    profile_id: string;
    trial_ends_at: string | null;
    tier: string;
    status: string;
  }>;

  const downgrades = rows.map((row) => ({
    profileId: row.profile_id,
    trialEndsAt: row.trial_ends_at,
    fromTier: 'trial',
    toTier: row.tier,
    toStatus: row.status,
    event: 'trial_expired_downgrade',
  }));

  return new Response(
    JSON.stringify({
      ok: true,
      expired: downgrades.length,
      downgrades,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
