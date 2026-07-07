import type { AppRole } from '../user/schema.js';
import type { Team } from './schema.js';

export function needsTeamManagerTeamSetup(teams: Team[]): boolean {
  return teams.length === 0;
}

/** Q11.5 — team managers create and manage age-range team data. */
export function canManageTeamAgeRange(role: AppRole): boolean {
  return role === 'team_manager';
}

export function formatTeamAgeRange(team: Pick<Team, 'ageMin' | 'ageMax'>): string {
  if (team.ageMin != null && team.ageMax != null) {
    return `Ages ${team.ageMin}-${team.ageMax}`;
  }
  if (team.ageMin != null) {
    return `Ages ${team.ageMin}+`;
  }
  if (team.ageMax != null) {
    return `Up to ${team.ageMax}`;
  }
  return 'No age range';
}

export function formatTeamProfileSummary(
  team: Pick<Team, 'ageMin' | 'ageMax' | 'gradeLevel' | 'division'>,
): string {
  const parts: string[] = [];
  const ageLabel = formatTeamAgeRange(team);
  if (ageLabel !== 'No age range') {
    parts.push(ageLabel);
  }
  if (team.gradeLevel) {
    parts.push(team.gradeLevel);
  }
  if (team.division) {
    parts.push(team.division);
  }
  return parts.length > 0 ? parts.join(' · ') : 'No age group set';
}
