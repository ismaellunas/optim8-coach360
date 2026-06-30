import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { canAccessAdmin, type User } from '@coach360/domain';
import { useRepositories } from '@coach360/api';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const sessionQueryKey = ['admin', 'session'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const repos = useRepositories();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: () => repos.auth.getSession(),
    retry: false,
  });

  const user = sessionQuery.data?.user ?? null;
  const access = canAccessAdmin(user);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: access.ok ? access.user : null,
      isLoading: sessionQuery.isLoading,
      isAdmin: access.ok,
      signIn: async (email, password) => {
        await repos.auth.signIn({ email, password });
        await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      },
      signOut: async () => {
        await repos.auth.signOut();
        queryClient.setQueryData(sessionQueryKey, null);
      },
    }),
    [access, queryClient, repos.auth, sessionQuery.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthProvider is missing');
  }
  return ctx;
}
