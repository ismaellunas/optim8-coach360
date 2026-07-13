import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { processTrialExpiryWarnings } from './handler.ts';

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

  const { data: warningDays, error: settingsError } = await supabase.rpc('get_trial_warning_days');
  if (settingsError) {
    return new Response(JSON.stringify({ error: settingsError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: candidates, error: candidatesError } = await supabase.rpc(
    'list_trial_warning_candidates',
  );
  if (candidatesError) {
    return new Response(JSON.stringify({ error: candidatesError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = processTrialExpiryWarnings({
    candidates: (candidates ?? []) as Array<{
      profile_id: string;
      trial_ends_at: string;
      days_remaining?: number;
    }>,
    warningDaysBefore: typeof warningDays === 'number' ? warningDays : Number(warningDays),
  });

  for (const warning of result.sent) {
    const { error: recordError } = await supabase.rpc('record_trial_warning_sent', {
      p_profile_id: warning.profileId,
      p_trial_ends_at: warning.trialEndsAt,
    });
    if (recordError) {
      return new Response(JSON.stringify({ error: recordError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      warningDaysBefore: result.warningDaysBefore,
      sent: result.sent.length,
      skipped: result.skipped,
      warnings: result.sent,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
