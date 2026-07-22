import {
  buildMuxHlsUrl,
  drillLogInputSchema,
  sessionContentKey,
  type CoachCompletionFilters,
  type DrillLogInput,
  type SessionContentRef,
} from '@coach360/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SessionContentCompletion,
  SessionContentRepository,
} from '../../ports/session-content-repository.js';

/** Public demo clip until marketplace Mux packages ship playback ids. */
export const PURCHASED_PACKAGE_DEMO_VIDEO_URL =
  'https://www.w3schools.com/html/mov_bbb.mp4';

export const LIBRARY_VIDEO_DEMO_URL =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const COMPLETION_SELECT =
  'session_id, player_id, content_key, completed_at, reps, duration_seconds';

function mapCompletionRow(row: {
  session_id: string;
  player_id: string;
  content_key: string;
  completed_at: string;
  reps?: number | null;
  duration_seconds?: number | null;
}): SessionContentCompletion {
  return {
    sessionId: row.session_id,
    playerId: row.player_id,
    contentKey: row.content_key,
    completedAt: row.completed_at,
    reps: row.reps ?? null,
    durationSeconds: row.duration_seconds ?? null,
  };
}

export class SupabaseSessionContentRepository implements SessionContentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listCompletions(sessionId: string, playerId: string): Promise<SessionContentCompletion[]> {
    const { data, error } = await this.client
      .from('session_content_completions')
      .select(COMPLETION_SELECT)
      .eq('session_id', sessionId)
      .eq('player_id', playerId);

    if (error) {
      throw new Error(`session_completions_load_failed:${error.message}`);
    }

    return (data ?? []).map(mapCompletionRow);
  }

  async listPlayerProgress(playerId: string): Promise<SessionContentCompletion[]> {
    const { data, error } = await this.client
      .from('session_content_completions')
      .select(COMPLETION_SELECT)
      .eq('player_id', playerId)
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`player_progress_load_failed:${error.message}`);
    }

    return (data ?? []).map(mapCompletionRow);
  }

  async listCoachCompletions(
    filters?: CoachCompletionFilters,
  ): Promise<SessionContentCompletion[]> {
    let query = this.client
      .from('session_content_completions')
      .select(COMPLETION_SELECT)
      .order('completed_at', { ascending: false });

    if (filters?.playerId) {
      query = query.eq('player_id', filters.playerId);
    }
    if (filters?.from) {
      query = query.gte('completed_at', filters.from);
    }
    if (filters?.to) {
      const end = filters.to.includes('T') ? filters.to : `${filters.to}T23:59:59.999Z`;
      query = query.lte('completed_at', end);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`coach_completions_load_failed:${error.message}`);
    }

    return (data ?? []).map(mapCompletionRow);
  }

  async markComplete(
    sessionId: string,
    playerId: string,
    ref: Pick<SessionContentRef, 'kind' | 'source' | 'id'>,
    drillLog?: DrillLogInput,
  ): Promise<SessionContentCompletion> {
    const contentKey = sessionContentKey(ref);
    const parsedLog = drillLog ? drillLogInputSchema.parse(drillLog) : null;
    const payload: Record<string, unknown> = {
      session_id: sessionId,
      player_id: playerId,
      content_key: contentKey,
      completed_at: new Date().toISOString(),
    };

    if (parsedLog) {
      if (parsedLog.reps !== undefined) {
        payload.reps = parsedLog.reps;
      }
      if (parsedLog.durationSeconds !== undefined) {
        payload.duration_seconds = parsedLog.durationSeconds;
      }
    }

    const { data, error } = await this.client
      .from('session_content_completions')
      .upsert(payload, { onConflict: 'session_id,player_id,content_key' })
      .select(COMPLETION_SELECT)
      .single();

    if (error) {
      throw new Error(`session_completion_save_failed:${error.message}`);
    }

    return mapCompletionRow(data);
  }

  async resolveMediaUrl(ref: SessionContentRef, coachId: string): Promise<string | null> {
    if (ref.kind !== 'video' && ref.kind !== 'package') {
      return null;
    }

    if (ref.source === 'purchase') {
      return PURCHASED_PACKAGE_DEMO_VIDEO_URL;
    }

    if (ref.kind === 'video' && ref.source === 'library') {
      const { data, error } = await this.client
        .from('coach_library_items')
        .select('media_url, kind, mux_playback_id, transcode_status')
        .eq('id', ref.id)
        .eq('owner_id', coachId)
        .maybeSingle();

      if (error) {
        throw new Error(`library_media_resolve_failed:${error.message}`);
      }

      if (data?.transcode_status === 'ready' && data.mux_playback_id) {
        return buildMuxHlsUrl(data.mux_playback_id);
      }

      if (data?.media_url) {
        return data.media_url;
      }

      return LIBRARY_VIDEO_DEMO_URL;
    }

    if (ref.kind === 'package' && ref.source === 'library') {
      return LIBRARY_VIDEO_DEMO_URL;
    }

    return null;
  }
}
