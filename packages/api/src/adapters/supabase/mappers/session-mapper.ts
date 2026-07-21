import {
  normalizeContentRefs,
  sessionContentRefsSchema,
  sessionSchema,
  type Session,
  type SessionContentRef,
} from '@coach360/domain';

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
  content_refs: unknown;
  created_at: string;
  updated_at: string;
};

function mapContentRefs(raw: unknown): SessionContentRef[] {
  const parsed = sessionContentRefsSchema.safeParse(raw ?? []);
  if (!parsed.success) {
    return [];
  }
  return normalizeContentRefs(parsed.data);
}

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
    // Cancel is a hard delete in MVP — rows that exist are always scheduled.
    status: 'scheduled',
    contentRefs: mapContentRefs(row.content_refs),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export const SESSION_SELECT =
  'id, coach_id, team_id, player_id, title, notes, scheduled_at, duration_minutes, session_type, content_refs, created_at, updated_at';
