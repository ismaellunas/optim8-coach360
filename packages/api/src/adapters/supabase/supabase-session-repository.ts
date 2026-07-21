import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeContentRefs,
  sessionInputSchema,
  type SessionInput,
} from '@coach360/domain';
import type { SessionRepository } from '../../ports/session-repository.js';
import { mapSessionError } from './map-session-error.js';
import { mapSessionRow, SESSION_SELECT } from './mappers/session-mapper.js';

function mapSessionInsert(input: SessionInput) {
  const parsed = sessionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw mapSessionError(parsed.error, 'create');
  }
  return {
    team_id: parsed.data.teamId ?? null,
    player_id: parsed.data.playerId ?? null,
    title: parsed.data.title,
    notes: parsed.data.notes ?? null,
    scheduled_at: parsed.data.scheduledAt,
    duration_minutes: parsed.data.durationMinutes,
    session_type: parsed.data.sessionType,
    content_refs: normalizeContentRefs(parsed.data.contentRefs ?? []),
  };
}

export class SupabaseSessionRepository implements SessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listForUser(userId: string) {
    void userId;
    const { data, error } = await this.client
      .from('sessions')
      .select(SESSION_SELECT)
      .order('scheduled_at', { ascending: true });

    if (error) {
      throw mapSessionError(error, 'load');
    }

    return (data ?? []).map((row) =>
      mapSessionRow(row as Parameters<typeof mapSessionRow>[0]),
    );
  }

  async createSession(userId: string, input: SessionInput) {
    const payload = mapSessionInsert(input);
    const { data, error } = await this.client
      .from('sessions')
      .insert({
        coach_id: userId,
        ...payload,
      })
      .select(SESSION_SELECT)
      .single();

    if (error) {
      throw mapSessionError(error, 'create');
    }

    return mapSessionRow(data as Parameters<typeof mapSessionRow>[0]);
  }

  async updateSession(sessionId: string, userId: string, input: SessionInput) {
    const payload = mapSessionInsert(input);
    const { data, error } = await this.client
      .from('sessions')
      .update({
        ...payload,
        coach_id: userId,
      })
      .eq('id', sessionId)
      .select(SESSION_SELECT)
      .single();

    if (error) {
      throw mapSessionError(error, 'update');
    }

    return mapSessionRow(data as Parameters<typeof mapSessionRow>[0]);
  }

  async cancelSession(sessionId: string, userId: string) {
    const { error } = await this.client
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('coach_id', userId);

    if (error) {
      throw mapSessionError(error, 'cancel');
    }
  }
}
