/**
 * Normalize VITE_SUPABASE_URL for @supabase/supabase-js.
 * PostgREST returns PGRST125 when the base URL includes paths like /rest/v1.
 */
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed) {
    throw new Error('missing_env:VITE_SUPABASE_URL');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('invalid_env:VITE_SUPABASE_URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('invalid_env:VITE_SUPABASE_URL must use http or https');
  }

  let pathname = url.pathname.replace(/\/$/, '');
  pathname = pathname.replace(/\/rest\/v1$/i, '').replace(/\/auth\/v1$/i, '');

  if (pathname && pathname !== '/') {
    throw new Error(
      'invalid_env:VITE_SUPABASE_URL must be the project root (https://<ref>.supabase.co), not a subpath',
    );
  }

  return url.origin;
}
