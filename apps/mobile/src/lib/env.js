export function readMobileEnv() {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    apiAdapter: import.meta.env.VITE_API_ADAPTER,
  };
}
