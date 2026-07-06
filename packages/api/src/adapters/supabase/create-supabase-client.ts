import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import { normalizeSupabaseUrl } from '../../client/normalize-supabase-url.js';

export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export type CreateSupabaseClientOptions = {
  storage?: SupportedStorage;
  detectSessionInUrl?: boolean;
  persistSession?: boolean;
  autoRefreshToken?: boolean;
};

export function createSupabaseClient(
  env: SupabaseEnv,
  options: CreateSupabaseClientOptions = {},
): SupabaseClient {
  return createClient(normalizeSupabaseUrl(env.url), env.anonKey, {
    auth: {
      persistSession: options.persistSession ?? true,
      autoRefreshToken: options.autoRefreshToken ?? true,
      detectSessionInUrl: options.detectSessionInUrl ?? true,
      storage: options.storage,
    },
  });
}
