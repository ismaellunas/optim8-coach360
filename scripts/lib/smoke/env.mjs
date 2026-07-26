import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));

export { ROOT };

export async function readDotEnv(filePath = path.join(ROOT, '.env')) {
  try {
    const source = await readFile(filePath, 'utf8');
    const values = {};
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const i = trimmed.indexOf('=');
      if (i === -1) continue;
      let value = trimmed.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[trimmed.slice(0, i).trim()] = value;
    }
    return values;
  } catch {
    return {};
  }
}

export async function loadEnv() {
  return { ...(await readDotEnv()), ...process.env };
}

export function firstEnv(env, keys) {
  for (const key of keys) {
    const value = (env[key] || '').trim();
    if (value) return value;
  }
  return '';
}

/**
 * Resolve functions base URL + service role for --target local|cloud.
 * Guards against using local demo JWT against cloud.
 */
export function resolveTarget(env, target) {
  const localUrl = 'http://127.0.0.1:54321';
  const cloudUrl = (
    firstEnv(env, ['SMOKE_SUPABASE_URL', 'SUPABASE_URL', 'VITE_SUPABASE_URL']) ||
    'https://rvmcfxizrlgtcilihowa.supabase.co'
  ).replace(/\/$/, '');

  if (target === 'local') {
    const serviceRoleKey = firstEnv(env, ['SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']);
    return {
      target: 'local',
      supabaseUrl: localUrl,
      functionsBaseUrl: `${localUrl}/functions/v1`,
      serviceRoleKey,
      anonKey: firstEnv(env, ['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY']),
    };
  }

  // Prefer explicit cloud keys so local SERVICE_ROLE_KEY is not accidentally used.
  const serviceRoleKey = firstEnv(env, [
    'SMOKE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SERVICE_ROLE_KEY',
  ]);
  const resolvedCloud =
    cloudUrl.includes('127.0.0.1') || cloudUrl.includes('localhost')
      ? 'https://rvmcfxizrlgtcilihowa.supabase.co'
      : cloudUrl;

  return {
    target: 'cloud',
    supabaseUrl: resolvedCloud,
    functionsBaseUrl: `${resolvedCloud}/functions/v1`,
    serviceRoleKey,
    anonKey: firstEnv(env, ['SMOKE_ANON_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY']),
  };
}

export function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const pad = '='.repeat((4 - (parts[1].length % 4)) % 4);
    return JSON.parse(Buffer.from(parts[1] + pad, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function assertTargetKeyMatch(ctx) {
  if (!ctx.serviceRoleKey) {
    return { ok: false, detail: 'missing_service_role_key' };
  }
  const payload = decodeJwtPayload(ctx.serviceRoleKey);
  if (!payload) {
    // New-style non-JWT secret keys — allow
    return { ok: true, detail: 'non_jwt_key' };
  }
  if (ctx.target === 'cloud' && payload.iss === 'supabase-demo') {
    return {
      ok: false,
      detail:
        'local SERVICE_ROLE_KEY (iss=supabase-demo) cannot call cloud; set SMOKE_SERVICE_ROLE_KEY to the cloud service_role',
    };
  }
  if (ctx.target === 'local' && payload.ref && payload.iss !== 'supabase-demo') {
    return {
      ok: false,
      detail: 'cloud service_role key pointed at --target local; use local SERVICE_ROLE_KEY',
    };
  }
  return { ok: true, detail: `role=${payload.role || 'unknown'}` };
}
