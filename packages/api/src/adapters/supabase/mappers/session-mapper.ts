import { sessionSchema, type Session } from '@coach360/domain';

type SessionRow = {
  id: string;
  coach_id: string;
  team_id: string | null;
  player_id: string | null;
  title: string;
  notes: string | null;
  scheduled_at: string;
  duration_minutes: number;
  session_type: 'practice' | 'film' | 'individual';
  status: 'scheduled' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export function mapSessionRow(row: SessionRow): Session {
  return sessionSchema.parse({
    id: row.id,
    coachId: row.coach_id,
    teamId: row.team_id,
    playerId: row.player_id,
    title: row.title,
    notes: row.notes,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    sessionType: row.session_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export const SESSION_SELECT =
  'id, coach_id, team_id, player_id, title, notes, scheduled_at, duration_minutes, session_type, status, created_at, updated_at';
