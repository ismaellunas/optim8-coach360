import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { PLAYER_ONBOARDING_COMPLETED_EVENT, needsPlayerOnboarding } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { OnboardingNavigationContext } from '../model/onboarding-navigation-context.jsx';
import { PlayerOnboardingWizard } from './PlayerOnboardingWizard.jsx';

export function PlayerOnboardingGate({ children }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const userId = session?.user.id;
  const isPlayer = session?.user.role === 'player';

  const loadProfile = useCallback(
    async function () {
      if (!userId || !isPlayer) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const nextProfile = await repos.profiles.getById(userId);
        setProfile(nextProfile);
      } catch (cause) {
        setProfile(null);
        setError(cause instanceof Error ? cause.message : 'profile_load_failed');
      } finally {
        setLoading(false);
      }
    },
    [isPlayer, repos.profiles, userId],
  );

  useEffect(function () {
    loadProfile();
  }, [loadProfile]);

  const navigationValue = useMemo(
    function () {
      return {
        redirectToSchedule: false,
        clearRedirectToSchedule: function () {},
      };
    },
    [],
  );

  async function finishOnboarding() {
    if (!userId) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const updatedProfile = await repos.profiles.completePlayerOnboarding(userId);
      repos.analytics.track(PLAYER_ONBOARDING_COMPLETED_EVENT, {
        role: 'player',
        profileId: userId,
      });
      setProfile(updatedProfile);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'player_onboarding_completion_failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogFirstDrill() {
    if (!userId) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const updatedProfile = await repos.profiles.logPlayerFirstDrill(userId);
      setProfile(updatedProfile);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'player_first_drill_log_failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isPlayer) {
    return children;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-coach-t2">
        Loading onboarding…
      </div>
    );
  }

  if (error && profile && needsPlayerOnboarding(profile)) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="mb-4 font-body text-sm text-coach-red">{error}</p>
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

  if (!profile || !needsPlayerOnboarding(profile)) {
    return (
      <OnboardingNavigationContext.Provider value={navigationValue}>
        {children}
      </OnboardingNavigationContext.Provider>
    );
  }

  return (
    <OnboardingNavigationContext.Provider value={navigationValue}>
      <PlayerOnboardingWizard
        displayName={session.user.displayName}
        drillsCompletedCount={profile.playerDrillsCompletedCount}
        submitting={submitting}
        error={error}
        onComplete={finishOnboarding}
        onLogFirstDrill={handleLogFirstDrill}
      />
    </OnboardingNavigationContext.Provider>
  );
}
