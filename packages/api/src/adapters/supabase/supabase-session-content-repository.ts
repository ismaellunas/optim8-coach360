import type { SessionContentRef } from '@coach360/domain';
import { sessionContentKey } from '@coach360/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SessionContentCompletion,
  SessionContentRepository,
} from '../../ports/session-content-repository.js';

/** Public demo clip until STORY-9.3 Mux playback for purchased packages. */
export const PURCHASED_PACKAGE_DEMO_VIDEO_URL =
  'https://www.w3schools.com/html/mov_bbb.mp4';

export const LIBRARY_VIDEO_DEMO_URL =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

function mapCompletionRow(row: {
  session_id: string;
  player_id: string;
  content_key: string;
  completed_at: string;
}): SessionContentCompletion {
  return {
    sessionId: row.session_id,
    playerId: row.player_id,
    contentKey: row.content_key,
    completedAt: row.completed_at,
  };
}

export class SupabaseSessionContentRepository implements SessionContentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listCompletions(sessionId: string, playerId: string): Promise<SessionContentCompletion[]> {
    const { data, error } = await this.client
      .from('session_content_completions')
      .select('session_id, player_id, content_key, completed_at')
      .eq('session_id', sessionId)
      .eq('player_id', playerId);

    if (error) {
      throw new Error(`session_completions_load_failed:${error.message}`);
    }

    return (data ?? []).map(mapCompletionRow);
  }

  async markComplete(
    sessionId: string,
    playerId: string,
    ref: Pick<SessionContentRef, 'kind' | 'source' | 'id'>,
  ): Promise<SessionContentCompletion> {
    const contentKey = sessionContentKey(ref);
    const { data, error } = await this.client
      .from('session_content_completions')
      .upsert(
        {
          session_id: sessionId,
          player_id: playerId,
          content_key: contentKey,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,player_id,content_key' },
      )
      .select('session_id, player_id, content_key, completed_at')
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
        .select('media_url, kind')
        .eq('id', ref.id)
        .eq('owner_id', coachId)
        .maybeSingle();

      if (error) {
        throw new Error(`library_media_resolve_failed:${error.message}`);
      }

      if (data?.media_url) {
        return data.media_url;
      }

      // Players cannot SELECT coach_library_items (owner-only RLS); session
      // content_refs already carry kind=video — use demo URL until STORY-9.3.
      return LIBRARY_VIDEO_DEMO_URL;
    }

    if (ref.kind === 'package' && ref.source === 'library') {
      return LIBRARY_VIDEO_DEMO_URL;
    }

    return null;
  }
}
