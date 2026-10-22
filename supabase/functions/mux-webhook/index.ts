import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { mapMuxWebhookEvent, verifyMuxWebhookSignature } from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, mux-signature',
};

// STORY-12.4 (resolved) — Mux is an inbound webhook receiver like Stripe/Sanity;
// a DB-sync failure here is a genuine webhook_failure, not an api_error.
// Note: video.asset.errored (mapped.kind === 'error') is Mux successfully telling
// us a transcode failed — that's recorded via transcode_status, not here, since
// the webhook itself was delivered and handled fine.
async function recordWebhookFailure(
  supabase: ReturnType<typeof createClient>,
  message: string,
  details: Record<string, unknown>,
) {
  try {
    await supabase.rpc('record_system_health_event', {
      p_kind: 'webhook_failure',
      p_source: 'mux-webhook',
      p_message: message,
      p_details: details,
    });
  } catch {
    // Best-effort health recording — never mask the original failure.
  }
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
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
  const webhookSecret = Deno.env.get('MUX_WEBHOOK_SECRET');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'supabase_env_missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await request.text();

  if (webhookSecret) {
    const ok = await verifyMuxWebhookSignature({
      rawBody,
      signatureHeader: request.headers.get('Mux-Signature'),
      secret: webhookSecret,
    });
    if (!ok) {
      return new Response(JSON.stringify({ error: 'invalid_signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  let event: Parameters<typeof mapMuxWebhookEvent>[0];
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const mapped = mapMuxWebhookEvent(event);
  if (mapped.kind === 'skip') {
    return new Response(JSON.stringify({ received: true, skipped: mapped.reason }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  if (mapped.kind === 'ready') {
    const { error } = await admin
      .from('coach_library_items')
      .update({
        mux_asset_id: mapped.muxAssetId,
        mux_playback_id: mapped.muxPlaybackId,
        media_url: mapped.mediaUrl,
        transcode_status: 'ready',
      })
      .eq('id', mapped.libraryItemId);

    if (error) {
      await recordWebhookFailure(admin, error.message, { stage: 'library_item_ready_update' });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        received: true,
        synced: true,
        kind: 'ready',
        libraryItemId: mapped.libraryItemId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const { error } = await admin
    .from('coach_library_items')
    .update({
      mux_asset_id: mapped.muxAssetId,
      transcode_status: 'error',
    })
    .eq('id', mapped.libraryItemId);

  if (error) {
    await recordWebhookFailure(admin, error.message, { stage: 'library_item_error_update' });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      received: true,
      synced: true,
      kind: 'error',
      libraryItemId: mapped.libraryItemId,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
