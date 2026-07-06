import type { Profile } from '../profile/schema.js';

export const COACH_ONBOARDING_COMPLETED_EVENT = 'coach_onboarding_completed';

export const COACH_ONBOARDING_STEP_COUNT = 5;

export function needsCoachOnboarding(profile: Profile): boolean {
  return profile.role === 'coach' && profile.coachOnboardingCompletedAt === null;
}
