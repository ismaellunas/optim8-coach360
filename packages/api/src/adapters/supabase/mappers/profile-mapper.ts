import { profileSchema, type Profile } from '@coach360/domain';

type ProfileRow = {
  id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  coach_context: string | null;
  age: number | null;
  position: string | null;
  profile_completed_at: string | null;
  team_setup_path_entered_at: string | null;
  coach_onboarding_completed_at: string | null;
  player_onboarding_completed_at: string | null;
  first_drill_completed_at: string | null;
  player_drills_completed_count: number;
};

export function mapProfileRow(row: ProfileRow): Profile {
  return profileSchema.parse({
    id: row.id,
    role: row.role,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    coachContext: row.coach_context,
    age: row.age,
    position: row.position,
    profileCompletedAt: row.profile_completed_at,
    teamSetupPathEnteredAt: row.team_setup_path_entered_at,
    coachOnboardingCompletedAt: row.coach_onboarding_completed_at,
    playerOnboardingCompletedAt: row.player_onboarding_completed_at,
    firstDrillCompletedAt: row.first_drill_completed_at,
    playerDrillsCompletedCount: row.player_drills_completed_count,
  });
}

export const PROFILE_SELECT =
  'id, role, display_name, avatar_url, bio, coach_context, age, position, profile_completed_at, team_setup_path_entered_at, coach_onboarding_completed_at, player_onboarding_completed_at, first_drill_completed_at, player_drills_completed_count';
