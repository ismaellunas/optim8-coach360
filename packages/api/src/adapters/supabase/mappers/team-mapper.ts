import { teamSchema, type Team } from '@coach360/domain';

type TeamRow = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  age_min: number | null;
  age_max: number | null;
  grade_level: string | null;
  division: string | null;
  season_start: string | null;
  season_end: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function mapTeamRow(row: TeamRow): Team {
  return teamSchema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    logoUrl: row.logo_url,
    ageMin: row.age_min,
    ageMax: row.age_max,
    gradeLevel: row.grade_level,
    division: row.division,
    seasonStart: row.season_start,
    seasonEnd: row.season_end,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export const TEAM_SELECT =
  'id, name, description, logo_url, age_min, age_max, grade_level, division, season_start, season_end, created_by, created_at, updated_at';
