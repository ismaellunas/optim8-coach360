import type { SupabaseClient } from '@supabase/supabase-js';
import { sessionInputSchema, type SessionInput } from '@coach360/domain';
import type { SessionRepository } from '../../ports/session-repository.js';
import { mapSessionRow, SESSION_SELECT } from './mappers/session-mapper.js';

function mapSessionInsert(input: SessionInput) {
  const parsed = sessionInputSchema.parse(input);
  return {
    team_id: parsed.teamId ?? null,
    player_id: parsed.playerId ?? null,
    title: parsed.title,
    notes: parsed.notes ?? null,
    scheduled_at: parsed.scheduledAt,
    duration_minutes: parsed.durationMinutes,
    session_type: parsed.sessionType,
  };
}

function mapSessionError(error: unknown, action: string): Error {
  if (error instanceof Error) {
    return new Error(`session_${action}_failed:${error.message}`);
  }
  return new Error(`session_${action}_failed`);
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
    const { data, error } = await this.client
      .from('sessions')
      .insert({
        coach_id: userId,
        ...mapSessionInsert(input),
      })
      .select(SESSION_SELECT)
      .single();

    if (error) {
      throw mapSessionError(error, 'create');
    }

    return mapSessionRow(data as Parameters<typeof mapSessionRow>[0]);
  }

  async updateSession(sessionId: string, userId: string, input: SessionInput) {
    const { data, error } = await this.client
      .from('sessions')
      .update({
        ...mapSessionInsert(input),
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
