import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createRepositories, RepositoryProvider, resolveAdapterMode } from '@coach360/api';
import { AuthProvider } from '@/features/auth/model/auth-context.js';
import { readAdminEnv } from '@/shared/config/env.js';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  const repositories = useMemo(() => {
    const env = readAdminEnv();
    return createRepositories({
      adapter: resolveAdapterMode(env.apiAdapter),
      supabase: {
        url: env.supabaseUrl,
        anonKey: env.supabaseAnonKey,
      },
      restBaseUrl: env.restApiBaseUrl,
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider value={repositories}>
        <AuthProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </AuthProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  );
}
