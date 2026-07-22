/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ADAPTER?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_REST_API_BASE_URL?: string;
  readonly VITE_SANITY_STUDIO_URL?: string;
  readonly VITE_SANITY_PROJECT_ID?: string;
  readonly VITE_SANITY_DATASET?: string;
  readonly VITE_ADMIN_STAGING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
