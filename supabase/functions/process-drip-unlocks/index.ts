import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { processDripUnlocks } from './handler.ts';

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
  const now = new Date();

  const { data: candidates, error: candidatesError } = await supabase.rpc('list_due_drip_unlocks', {
    p_now: now.toISOString(),
  });
  if (candidatesError) {
    return new Response(JSON.stringify({ error: candidatesError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const result = processDripUnlocks({
    candidates: (candidates ?? []) as Array<{
      purchase_id: string;
      profile_id: string;
      module_id: string;
      scheduled_unlock_at: string;
      sanity_document_id?: string | null;
    }>,
    now,
  });

  const applied: typeof result.unlocked = [];
  for (const row of result.unlocked) {
    const { data: didUnlock, error: unlockError } = await supabase.rpc('apply_drip_module_unlock', {
      p_purchase_id: row.purchaseId,
      p_module_id: row.moduleId,
      p_unlocked_at: now.toISOString(),
    });
    if (unlockError) {
      return new Response(JSON.stringify({ error: unlockError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (didUnlock) {
      applied.push(row);
      // DEP-07 / STORY-14.1 — native push delivery; MVP logs unlock events for the cron runner.
      console.debug('[notifications]', row.event, row);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      unlocked: applied.length,
      skipped: result.skipped + (result.unlocked.length - applied.length),
      notifications: applied,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
