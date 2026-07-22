import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { createMuxDirectUpload } from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  libraryItemId?: string;
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
  const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
  const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'supabase_env_missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!muxTokenId || !muxTokenSecret) {
    return new Response(JSON.stringify({ error: 'mux_credentials_missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

  const libraryItemId = body.libraryItemId?.trim();
  if (!libraryItemId) {
    return new Response(JSON.stringify({ error: 'library_item_id_required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: item, error: itemError } = await admin
    .from('coach_library_items')
    .select('id, owner_id, kind')
    .eq('id', libraryItemId)
    .maybeSingle();

  if (itemError || !item) {
    return new Response(JSON.stringify({ error: 'library_item_not_found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (item.owner_id !== user.id) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (item.kind !== 'video') {
    return new Response(JSON.stringify({ error: 'mux_video_kind_required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const origin = request.headers.get('origin') || Deno.env.get('APP_ORIGIN') || '*';

  let upload;
  try {
    upload = await createMuxDirectUpload({
      tokenId: muxTokenId,
      tokenSecret: muxTokenSecret,
      corsOrigin: origin === 'null' ? '*' : origin,
      libraryItemId,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'mux_initiate_failed';
    return new Response(JSON.stringify({ error: message.split(':')[0] || 'mux_initiate_failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: updateError } = await admin
    .from('coach_library_items')
    .update({
      mux_upload_id: upload.uploadId,
      transcode_status: 'pending',
    })
    .eq('id', libraryItemId)
    .eq('owner_id', user.id);

  if (updateError) {
    return new Response(JSON.stringify({ error: 'library_update_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      libraryItemId,
      uploadId: upload.uploadId,
      uploadUrl: upload.uploadUrl,
      transcodeStatus: 'pending',
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
