import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const repos = useRepositories();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(function () {
    let active = true;

    repos.appAuth
      .getSession()
      .then(function (nextSession) {
        if (active) {
          setSession(nextSession);
        }
      })
      .catch(function (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'session_restore_failed');
        }
      })
      .finally(function () {
        if (active) {
          setIsLoading(false);
        }
      });

    return function () {
      active = false;
    };
  }, [repos.appAuth]);

  const value = useMemo(
    function () {
      return {
        session,
        isLoading,
        isAuthenticated: session !== null,
        error,
        clearError: function () {
          setError(null);
        },
        signUp: async function (input) {
          setError(null);
          const result = await repos.appAuth.signUp(input);
          if (result.session) {
            setSession(result.session);
            setJustRegistered(true);
          }
          return result;
        },
        signIn: async function (input) {
          setError(null);
          const nextSession = await repos.appAuth.signIn(input);
          setSession(nextSession);
          return nextSession;
        },
        signOut: async function () {
          setError(null);
          await repos.appAuth.signOut();
          setSession(null);
          setJustRegistered(false);
        },
        clearJustRegistered: function () {
          setJustRegistered(false);
        },
        justRegistered,
      };
    },
    [error, isLoading, justRegistered, repos.appAuth, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthProvider is missing');
  }
  return ctx;
}
