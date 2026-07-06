import type { Profile } from '../profile/schema.js';

export const COACH_ONBOARDING_COMPLETED_EVENT = 'coach_onboarding_completed';

export const COACH_ONBOARDING_STEP_COUNT = 5;

export const PLAYER_ONBOARDING_COMPLETED_EVENT = 'player_onboarding_completed';

export const PLAYER_ONBOARDING_STEP_COUNT = 6;

export function needsCoachOnboarding(profile: Profile): boolean {
  return profile.role === 'coach' && profile.coachOnboardingCompletedAt === null;
}

export function needsPlayerOnboarding(profile: Profile): boolean {
  return profile.role === 'player' && profile.playerOnboardingCompletedAt === null;
}
