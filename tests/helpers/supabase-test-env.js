import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

function parseEnvLines(source) {
  const env = {};
  for (const line of source.split('\n')) {
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
    env[key] = value;
  }
  return env;
}

function readDotEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  return parseEnvLines(readFileSync(filePath, 'utf8'));
}

function readLocalSupabaseEnv() {
  try {
    const raw = execSync('supabase status -o env', {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
    }).toString();
    return parseEnvLines(raw);
  } catch {
    return null;
  }
}

/**
 * Resolve Supabase credentials for integration tests.
 * Prefers local `supabase status`, then repo `.env` / `.env.local` (cloud projects).
 */
export function readSupabaseTestEnv() {
  const local = readLocalSupabaseEnv();
  const fileEnv = {
    ...readDotEnvFile(path.join(REPO_ROOT, '.env')),
    ...readDotEnvFile(path.join(REPO_ROOT, '.env.local')),
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.startsWith('VITE_') || key.includes('SUPABASE')),
    ),
  };

  const apiUrl = local?.API_URL ?? fileEnv.VITE_SUPABASE_URL;
  const anonKey = local?.ANON_KEY ?? fileEnv.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = local?.SERVICE_ROLE_KEY ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = local?.DB_URL ?? fileEnv.SUPABASE_DB_URL ?? fileEnv.DATABASE_URL;

  if (!apiUrl || !anonKey || !serviceRoleKey) {
    return null;
  }

  return {
    API_URL: apiUrl,
    ANON_KEY: anonKey,
    SERVICE_ROLE_KEY: serviceRoleKey,
    DB_URL: dbUrl,
    source: local?.API_URL ? 'local' : 'cloud',
  };
}
