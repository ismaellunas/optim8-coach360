import type { Profile } from './schema.js';

export function isProfileComplete(profile: Profile): boolean {
  if (profile.profileCompletedAt) {
    return true;
  }

  if (profile.role === 'coach') {
    return profile.coachContext !== null;
  }

  if (profile.role === 'player') {
    return profile.age !== null && profile.position !== null && profile.position.length > 0;
  }

  if (profile.role === 'team_manager') {
    return profile.teamSetupPathEnteredAt !== null;
  }

  // Admin and other roles provisioned outside self-signup.
  return true;
}
