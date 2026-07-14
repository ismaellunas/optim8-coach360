#!/usr/bin/env node
/**
 * Force-expire active trials for all users (dev/ops).
 *
 * Downgrades trialing subscriptions to Basic (tier=basic, status=active),
 * matching expire_ended_trials / STORY-4.3. Preserves trial_ends_at and
 * trial_used_at.
 *
 * Usage:
 *   npm run expire:trials
 *   npm run expire:trials -- --dry-run
 *   npm run expire:trials -- --due-only
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENV_PATH = path.join(ROOT, '.env');

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const [rawKey, inlineValue] = token.slice(2).split('=');
    const nextValue = argv[index + 1];
    const value =
      inlineValue ?? (nextValue && !nextValue.startsWith('--') ? argv[++index] : 'true');
    args[rawKey] = value;
  }

  return args;
}

async function readDotEnv(filePath) {
  try {
    const source = await readFile(filePath, 'utf8');
    const values = {};

    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      values[key] = value;
    }

    return values;
  } catch {
    return {};
  }
}

function printHelp() {
  console.log(`Expire active trials (downgrade to Basic).

Usage:
  npm run expire:trials
  npm run expire:trials -- --dry-run
  npm run expire:trials -- --due-only

Options:
  --dry-run    List matching trials without updating
  --due-only   Only expire trials whose trial_ends_at has already passed
               (calls expire_ended_trials RPC). Default expires ALL trialing users.
  --help       Show this message

Required env:
  VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY from \`supabase status -o env\`)
`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') {
  printHelp();
  process.exit(0);
}

const dryRun = args['dry-run'] === 'true';
const dueOnly = args['due-only'] === 'true';

const envFile = await readDotEnv(ENV_PATH);
const env = { ...envFile, ...process.env };

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SERVICE_ROLE_KEY in .env/process env.',
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const nowIso = new Date().toISOString();

const { data: candidates, error: listError } = await admin
  .from('subscriptions')
  .select('id, profile_id, tier, status, trial_ends_at, trial_used_at')
  .eq('tier', 'trial')
  .eq('status', 'trialing');

if (listError) throw listError;

const matching = dueOnly
  ? (candidates ?? []).filter(
      (row) => row.trial_ends_at != null && row.trial_ends_at <= nowIso,
    )
  : (candidates ?? []);

console.log(
  dueOnly
    ? `Found ${matching.length} due trial(s) (of ${candidates?.length ?? 0} active).`
    : `Found ${matching.length} active trial(s).`,
);

for (const row of matching) {
  console.log(
    `  - profile=${row.profile_id} ends_at=${row.trial_ends_at ?? 'null'}`,
  );
}

if (matching.length === 0) {
  console.log('Nothing to expire.');
  process.exit(0);
}

if (dryRun) {
  console.log('Dry run — no changes written.');
  process.exit(0);
}

let expired;

if (dueOnly) {
  const { data, error } = await admin.rpc('expire_ended_trials');
  if (error) throw error;
  expired = data ?? [];
} else {
  // Force-expire all trialing rows (including future trial_ends_at).
  // Same end state as expire_ended_trials; preserves trial_ends_at / trial_used_at.
  const ids = matching.map((row) => row.id);
  const { data, error } = await admin
    .from('subscriptions')
    .update({
      tier: 'basic',
      status: 'active',
      updated_at: nowIso,
    })
    .in('id', ids)
    .select('id, profile_id, tier, status, trial_ends_at, trial_used_at');

  if (error) throw error;
  expired = data ?? [];
}

console.log(`Expired ${expired.length} trial(s) → tier=basic, status=active.`);
for (const row of expired) {
  console.log(`  - profile=${row.profile_id} tier=${row.tier} status=${row.status}`);
}
