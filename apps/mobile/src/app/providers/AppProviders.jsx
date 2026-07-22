import { useMemo } from 'react';
import { createRepositories, RepositoryProvider, resolveAdapterMode } from '@coach360/api';
import { AuthProvider } from '@/features/auth/model/auth-context.jsx';
import { readMobileEnv } from '@/lib/env.js';
import { createSupabaseAuthStorage } from '@/lib/supabase-storage.js';

export function AppProviders({ children }) {
  const repositories = useMemo(function () {
    const env = readMobileEnv();
    return createRepositories({
      adapter: resolveAdapterMode(env.apiAdapter),
      supabase: {
        url: env.supabaseUrl,
        anonKey: env.supabaseAnonKey,
      },
      supabaseClientAuth: {
        storage: createSupabaseAuthStorage(),
        detectSessionInUrl: false,
      },
      sanity: env.sanityProjectId
        ? {
            projectId: env.sanityProjectId,
            dataset: env.sanityDataset || 'production',
            token: env.sanityReadToken || undefined,
            useCdn: !env.sanityReadToken,
          }
        : undefined,
    });
  }, []);

  return (
    <RepositoryProvider value={repositories}>
      <AuthProvider>{children}</AuthProvider>
    </RepositoryProvider>
  );
}
