import { resolveAdapterMode } from '@coach360/api';

export type AdminEnv = {
  apiAdapter: 'supabase' | 'rest';
  supabaseUrl: string;
  supabaseAnonKey: string;
  restApiBaseUrl: string;
  sanityStudioUrl: string;
  adminStagingUrl: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`missing_env:${name}`);
  }
  return value;
}

export function readAdminEnv(): AdminEnv {
  return {
    apiAdapter: resolveAdapterMode(import.meta.env.VITE_API_ADAPTER),
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    restApiBaseUrl: import.meta.env.VITE_REST_API_BASE_URL ?? '',
    sanityStudioUrl: import.meta.env.VITE_SANITY_STUDIO_URL ?? '',
    adminStagingUrl: import.meta.env.VITE_ADMIN_STAGING_URL ?? '',
  };
}

export function readSupabaseEnvForRuntime(): { url: string; anonKey: string } {
  const env = readAdminEnv();
  return {
    url: required('VITE_SUPABASE_URL', env.supabaseUrl),
    anonKey: required('VITE_SUPABASE_ANON_KEY', env.supabaseAnonKey),
  };
}

export function readSanityStudioUrl(): string {
  return required('VITE_SANITY_STUDIO_URL', readAdminEnv().sanityStudioUrl);
}

/** Returns null when unset — Content page gating works without Sanity configured. */
export function tryReadSanityStudioUrl(): string | null {
  const url = readAdminEnv().sanityStudioUrl.trim();
  return url || null;
}
