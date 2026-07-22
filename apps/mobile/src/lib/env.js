export function readMobileEnv() {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    apiAdapter: import.meta.env.VITE_API_ADAPTER,
    sanityProjectId: import.meta.env.VITE_SANITY_PROJECT_ID ?? '',
    sanityDataset: import.meta.env.VITE_SANITY_DATASET ?? 'production',
    /** Viewer token for private datasets (preferred). Falls back empty → public CDN. */
    sanityReadToken: import.meta.env.VITE_SANITY_READ_TOKEN ?? '',
  };
}
