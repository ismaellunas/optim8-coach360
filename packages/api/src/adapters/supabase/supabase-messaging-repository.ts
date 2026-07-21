import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DirectMessage,
  DirectMessageThread,
  MessagingRepository,
} from '../../ports/messaging-repository.js';

const MESSAGE_SELECT = 'id, coach_id, player_id, sender_id, body, created_at';

function mapMessageRow(row: {
  id: string;
  coach_id: string;
  player_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}): DirectMessage {
  return {
    id: row.id,
    coachId: row.coach_id,
    playerId: row.player_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export class SupabaseMessagingRepository implements MessagingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listDirectMessages(coachId: string, playerId: string): Promise<DirectMessage[]> {
    const { data, error } = await this.client
      .from('direct_messages')
      .select(MESSAGE_SELECT)
      .eq('coach_id', coachId)
      .eq('player_id', playerId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`direct_messages_load_failed:${error.message}`);
    }

    return (data ?? []).map(mapMessageRow);
  }

  async sendDirectMessage(input: {
    coachId: string;
    playerId: string;
    body: string;
  }): Promise<DirectMessage> {
    const trimmed = input.body.trim();
    if (!trimmed) {
      throw new Error('direct_message_empty');
    }

    const {
      data: { user },
      error: authError,
    } = await this.client.auth.getUser();

    if (authError || !user) {
      throw new Error('not_authenticated');
    }

    const senderId = user.id;
    const coachId = input.coachId;
    const playerId = input.playerId;

    if (senderId !== coachId && senderId !== playerId) {
      throw new Error('not_authorized');
    }

    const { data, error } = await this.client
      .from('direct_messages')
      .insert({
        coach_id: coachId,
        player_id: playerId,
        sender_id: senderId,
        body: trimmed,
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error) {
      throw new Error(`direct_message_send_failed:${error.message}`);
    }

    return mapMessageRow(data);
  }

  async listDirectThreads(coachId: string): Promise<DirectMessageThread[]> {
    const { data, error } = await this.client
      .from('direct_messages')
      .select('player_id, body, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`direct_threads_load_failed:${error.message}`);
    }

    const seen = new Set<string>();
    const threads: DirectMessageThread[] = [];

    for (const row of data ?? []) {
      if (seen.has(row.player_id)) {
        continue;
      }
      seen.add(row.player_id);
      threads.push({
        playerId: row.player_id,
        lastMessage: row.body,
        lastAt: row.created_at,
      });
    }

    return threads;
  }
}
