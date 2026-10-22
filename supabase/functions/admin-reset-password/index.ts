import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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

type RequestBody = {
  profileId?: string;
};

/**
 * STORY-12.1 (resolved, QA3-09) — admin triggers a self-service password
 * reset email for another user. Admin-gated, pattern-matched from
 * review-marketplace-package/index.ts (auth header -> getUser -> service-role
 * profile check for role = 'admin').
 *
 * Resolved: (a) email the user a reset link via resetPasswordForEmail, not
 * (b) admin sees/sets a temporary password — avoids the admin ever handling
 * a plaintext credential.
 *
 * Known limitation, not fixed here: neither app has a page that listens for
 * Supabase's PASSWORD_RECOVERY auth event to actually let the user set a new
 * password once they click the emailed link. The email will send; completing
 * the flow end-to-end needs that page built as separate, larger scope.
 */
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

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'supabase_env_missing' }, 500);
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

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('id, role, is_suspended')
    .eq('id', user.id)
    .maybeSingle();

  if (!callerProfile || callerProfile.role !== 'admin' || callerProfile.is_suspended === true) {
    return jsonResponse({ error: 'admin_required' }, 403);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const profileId = body.profileId?.trim();
  if (!profileId) {
    return jsonResponse({ error: 'profile_id_required' }, 400);
  }

  const { data: targetUser, error: targetError } = await admin.auth.admin.getUserById(profileId);
  if (targetError || !targetUser?.user?.email) {
    return jsonResponse({ error: 'target_user_not_found' }, 404);
  }

  const { error: resetError } = await admin.auth.resetPasswordForEmail(targetUser.user.email);
  if (resetError) {
    return jsonResponse({ error: resetError.message }, 500);
  }

  return jsonResponse({ ok: true }, 200);
});
