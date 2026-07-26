import { createClient } from '@supabase/supabase-js';

export function createAdminClient(ctx) {
  if (!ctx.supabaseUrl || !ctx.serviceRoleKey) {
    throw new Error('supabase_admin_missing_url_or_key');
  }
  return createClient(ctx.supabaseUrl, ctx.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollUntil(label, fn, options = {}) {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const intervalMs = options.intervalMs ?? 1500;
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await fn();
    if (last) return last;
    await sleep(intervalMs);
  }
  throw new Error(`poll_timeout:${label}:${JSON.stringify(last)}`);
}

/** Pick any profile for Stripe/Mux probe fixtures. */
export async function findProbeProfileId(admin, preferredId) {
  if (preferredId) {
    const { data } = await admin.from('profiles').select('id').eq('id', preferredId).maybeSingle();
    if (data?.id) return data.id;
  }
  const { data, error } = await admin.from('profiles').select('id').limit(1);
  if (error) throw new Error(error.message);
  return data?.[0]?.id ?? null;
}
