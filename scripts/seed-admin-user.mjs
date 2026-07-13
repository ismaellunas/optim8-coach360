#!/usr/bin/env node
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
  console.log(`Seed or promote an admin user in Supabase.

Usage:
  npm run seed:admin -- --email you@example.com --password "StrongPass123!"

Options:
  --email         Admin email. Defaults to ADMIN_SEED_EMAIL or admin@coach360.local
  --password      Password for new users. Defaults to ADMIN_SEED_PASSWORD
  --display-name  Profile display name. Defaults to ADMIN_SEED_DISPLAY_NAME or Local Admin
  --help          Show this message

Required env:
  VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY from \`supabase status -o env\`)
`);
}

async function listAllUsers(admin) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    users.push(...data.users);
    if (data.users.length < 200) break;
    page += 1;
  }

  return users;
}

const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') {
  printHelp();
  process.exit(0);
}

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

const email = args.email ?? env.ADMIN_SEED_EMAIL ?? 'admin@coach360.local';
const password = args.password ?? env.ADMIN_SEED_PASSWORD;
const displayName = args['display-name'] ?? env.ADMIN_SEED_DISPLAY_NAME ?? 'Local Admin';

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const users = await listAllUsers(admin);
let user = users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());

if (!user) {
  if (!password) {
    console.error(`No existing user found for ${email}. Pass --password or set ADMIN_SEED_PASSWORD.`);
    process.exit(1);
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, role: 'admin' },
  });

  if (created.error) throw created.error;
  user = created.data.user;
  console.log(`Created auth user ${email}.`);
} else {
  console.log(`Found existing auth user ${email}.`);
}

const profile = await admin.from('profiles').upsert(
  {
    id: user.id,
    role: 'admin',
    display_name: displayName,
    is_suspended: false,
  },
  { onConflict: 'id' }
);

if (profile.error) throw profile.error;

console.log(`Admin profile ensured for ${email} (${user.id}).`);
