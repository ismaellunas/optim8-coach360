import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { COACH_ONBOARDING_COMPLETED_EVENT, needsCoachOnboarding } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { OnboardingNavigationContext } from '../model/onboarding-navigation-context.jsx';
import { CoachOnboardingWizard } from './CoachOnboardingWizard.jsx';

export function CoachOnboardingGate({ children }) {
  const { session } = useAuth();
  const repos = useRepositories();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [redirectToSchedule, setRedirectToSchedule] = useState(false);

  const userId = session?.user.id;
  const isCoach = session?.user.role === 'coach';

  const loadProfile = useCallback(
    async function () {
      if (!userId || !isCoach) {
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
    [isCoach, repos.profiles, userId],
  );

  useEffect(function () {
    loadProfile();
  }, [loadProfile]);

  const navigationValue = useMemo(
    function () {
      return {
        redirectToSchedule,
        clearRedirectToSchedule: function () {
          setRedirectToSchedule(false);
        },
      };
    },
    [redirectToSchedule],
  );

  async function finishOnboarding(options = {}) {
    if (!userId) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const updatedProfile = await repos.profiles.completeCoachOnboarding(userId);
      repos.analytics.track(COACH_ONBOARDING_COMPLETED_EVENT, {
        role: 'coach',
        profileId: userId,
      });
      setProfile(updatedProfile);
      if (options.openSchedule) {
        setRedirectToSchedule(true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'coach_onboarding_completion_failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isCoach) {
    return children;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-coach-t2">
        Loading onboarding…
      </div>
    );
  }

  if (error && profile && needsCoachOnboarding(profile)) {
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

  if (!profile || !needsCoachOnboarding(profile)) {
    return (
      <OnboardingNavigationContext.Provider value={navigationValue}>
        {children}
      </OnboardingNavigationContext.Provider>
    );
  }

  return (
    <OnboardingNavigationContext.Provider value={navigationValue}>
      <CoachOnboardingWizard
        displayName={session.user.displayName}
        submitting={submitting}
        error={error}
        onComplete={function () {
          finishOnboarding();
        }}
        onOpenSchedule={function () {
          finishOnboarding({ openSchedule: true });
        }}
      />
    </OnboardingNavigationContext.Provider>
  );
}
