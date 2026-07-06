import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { isProfileComplete } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { ProfileSetupFlow } from './ProfileSetupFlow.jsx';

function StaleSessionScreen({ onSignOut }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mb-3 font-display text-2xl font-bold text-coach-t1">SESSION EXPIRED</div>
      <p className="mb-6 font-body text-sm leading-relaxed text-coach-t2">
        Your account was not found. This usually happens after a local database reset.
        Sign out and create a new account to continue.
      </p>
      <button
        type="button"
        onClick={onSignOut}
        className="w-full cursor-pointer rounded-xl border-none bg-coach-orange px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider text-white"
      >
        Sign out
      </button>
    </div>
  );
}

export function ProfileGate({ children }) {
  const { session, isLoading: authLoading, signOut } = useAuth();
  const repos = useRepositories();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadProfile = useCallback(
    async function () {
      if (!session?.user.id) {
        setProfile(null);
        setLoadError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      try {
        const nextProfile = await repos.profiles.getById(session.user.id);
        if (!nextProfile) {
          setProfile(null);
          setLoadError('profile_not_found');
          return;
        }
        setProfile(nextProfile);
      } catch (cause) {
        setProfile(null);
        setLoadError(cause instanceof Error ? cause.message : 'profile_load_failed');
      } finally {
        setLoading(false);
      }
    },
    [repos.profiles, session?.user.id],
  );

  useEffect(function () {
    if (authLoading) {
      return;
    }
    loadProfile();
  }, [authLoading, loadProfile]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-coach-t2">
        Loading profile…
      </div>
    );
  }

  if (loadError === 'profile_not_found') {
    return <StaleSessionScreen onSignOut={signOut} />;
  }

  if (loadError) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="mb-4 font-body text-sm text-coach-red">{loadError}</p>
        <button
          type="button"
          onClick={loadProfile}
          className="cursor-pointer rounded-xl border-none bg-coach-orange-glow px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider text-coach-orange"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isProfileComplete(profile)) {
    return (
      <ProfileSetupFlow
        onComplete={function (updatedProfile) {
          setProfile(updatedProfile);
        }}
        onProfileMissing={signOut}
      />
    );
  }

  return children;
}
