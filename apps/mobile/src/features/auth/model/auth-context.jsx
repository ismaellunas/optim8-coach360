import { useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { registerAppUrlOpenHandler } from '../../../lib/capacitor.js';
import { AuthContext } from './auth-context-value.js';

export function AuthProvider({ children }) {
  const repos = useRepositories();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [justRegistered, setJustRegistered] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

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

  useEffect(
    function () {
      return registerAppUrlOpenHandler(function (url) {
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return;
        const params = new URLSearchParams(url.slice(hashIndex + 1));
        if (params.get('type') !== 'recovery') return;
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken || !refreshToken) return;

        repos.appAuth
          .establishRecoverySession({ accessToken, refreshToken })
          .then(function (nextSession) {
            setSession(nextSession);
            setRecoveryMode(true);
          })
          .catch(function (cause) {
            setError(cause instanceof Error ? cause.message : 'recovery_link_failed');
          });
      });
    },
    [repos.appAuth],
  );

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
          setRecoveryMode(false);
        },
        requestPasswordReset: async function (input) {
          setError(null);
          await repos.appAuth.requestPasswordReset(input);
        },
        completePasswordReset: async function (input) {
          setError(null);
          const nextSession = await repos.appAuth.completePasswordReset(input);
          setSession(nextSession);
          setRecoveryMode(false);
          return nextSession;
        },
        recoveryMode,
        clearJustRegistered: function () {
          setJustRegistered(false);
        },
        justRegistered,
      };
    },
    [error, isLoading, justRegistered, recoveryMode, repos.appAuth, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
