import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeUnreadCount,
  sortMemberPair,
  type ChatChannelType,
} from '@coach360/domain';
import type {
  ChatConversation,
  ChatMessage,
  DirectMessage,
  DirectMessageThread,
  MessagingRepository,
} from '../../ports/messaging-repository.js';

const CHANNEL_SELECT = 'id, type, team_id, member_a, member_b, created_at';
const MESSAGE_SELECT = 'id, channel_id, sender_id, body, created_at';

type ChannelRow = {
  id: string;
  type: ChatChannelType;
  team_id: string | null;
  member_a: string | null;
  member_b: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  channel_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    channelId: row.channel_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function peerIdFor(row: ChannelRow, userId: string): string | null {
  if (row.type === 'team') {
    return null;
  }
  if (row.member_a === userId) {
    return row.member_b;
  }
  if (row.member_b === userId) {
    return row.member_a;
  }
  return row.member_a ?? row.member_b;
}

export class SupabaseMessagingRepository implements MessagingRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listConversations(userId: string): Promise<ChatConversation[]> {
    await this.ensureTeamChannelsForUser(userId);

    const { data: memberships, error: memberError } = await this.client
      .from('chat_channel_members')
      .select('channel_id, last_read_at')
      .eq('profile_id', userId);

    if (memberError) {
      throw new Error(`chat_conversations_load_failed:${memberError.message}`);
    }

    if (!memberships?.length) {
      return [];
    }

    const channelIds = memberships.map((row) => row.channel_id);
    const lastReadByChannel = new Map(
      memberships.map((row) => [row.channel_id, row.last_read_at as string]),
    );

    const { data: channels, error: channelError } = await this.client
      .from('chat_channels')
      .select(CHANNEL_SELECT)
      .in('id', channelIds);

    if (channelError) {
      throw new Error(`chat_conversations_load_failed:${channelError.message}`);
    }

    const conversations: ChatConversation[] = [];

    for (const channel of (channels ?? []) as ChannelRow[]) {
      const lastReadAt = lastReadByChannel.get(channel.id) ?? '1970-01-01T00:00:00Z';
      const summary = await this.loadConversationSummary(channel, userId, lastReadAt);
      conversations.push(summary);
    }

    conversations.sort((a, b) => {
      const aAt = a.lastAt ?? a.id;
      const bAt = b.lastAt ?? b.id;
      return aAt < bAt ? 1 : aAt > bAt ? -1 : 0;
    });

    return conversations;
  }

  async ensureTeamChannel(teamId: string): Promise<ChatConversation> {
    const {
      data: { user },
      error: authError,
    } = await this.client.auth.getUser();

    if (authError || !user) {
      throw new Error('not_authenticated');
    }

    const existing = await this.findTeamChannel(teamId);
    const channel = existing ?? (await this.createTeamChannel(teamId));
    await this.syncTeamMembers(channel.id, teamId);
    return this.toConversation(channel, user.id);
  }

  async ensureDmChannel(userA: string, userB: string): Promise<ChatConversation> {
    return this.ensurePairChannel('dm', userA, userB);
  }

  async ensureP2pChannel(userA: string, userB: string): Promise<ChatConversation> {
    return this.ensurePairChannel('p2p', userA, userB);
  }

  async listChannelMessages(channelId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.client
      .from('chat_messages')
      .select(MESSAGE_SELECT)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`chat_messages_load_failed:${error.message}`);
    }

    return ((data ?? []) as MessageRow[]).map(mapMessageRow);
  }

  async sendChannelMessage(input: {
    channelId: string;
    body: string;
  }): Promise<ChatMessage> {
    const trimmed = input.body.trim();
    if (!trimmed) {
      throw new Error('chat_message_empty');
    }

    const {
      data: { user },
      error: authError,
    } = await this.client.auth.getUser();

    if (authError || !user) {
      throw new Error('not_authenticated');
    }

    const { data, error } = await this.client
      .from('chat_messages')
      .insert({
        channel_id: input.channelId,
        sender_id: user.id,
        body: trimmed,
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error) {
      throw new Error(`chat_message_send_failed:${error.message}`);
    }

    return mapMessageRow(data as MessageRow);
  }

  async markChannelRead(channelId: string): Promise<void> {
    const {
      data: { user },
      error: authError,
    } = await this.client.auth.getUser();

    if (authError || !user) {
      throw new Error('not_authenticated');
    }

    const { error } = await this.client
      .from('chat_channel_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('profile_id', user.id);

    if (error) {
      throw new Error(`chat_mark_read_failed:${error.message}`);
    }
  }

  subscribeToChannel(
    channelId: string,
    onMessage: (message: ChatMessage) => void,
  ): () => void {
    const topic = `chat-messages:${channelId}`;
    const channel = this.client
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          if (!row?.id) {
            return;
          }
          onMessage(mapMessageRow(row));
        },
      )
      .subscribe();

    return () => {
      void this.client.removeChannel(channel);
    };
  }

  async listDirectMessages(coachId: string, playerId: string): Promise<DirectMessage[]> {
    const conversation = await this.ensureDmChannel(coachId, playerId);
    const messages = await this.listChannelMessages(conversation.id);
    return messages.map((message) => ({
      id: message.id,
      coachId,
      playerId,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt,
    }));
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
    if (senderId !== input.coachId && senderId !== input.playerId) {
      throw new Error('not_authorized');
    }

    try {
      const conversation = await this.ensureDmChannel(input.coachId, input.playerId);
      const message = await this.sendChannelMessage({
        channelId: conversation.id,
        body: trimmed,
      });

      return {
        id: message.id,
        coachId: input.coachId,
        playerId: input.playerId,
        senderId: message.senderId,
        body: message.body,
        createdAt: message.createdAt,
      };
    } catch (cause) {
      if (cause instanceof Error && cause.message === 'direct_message_empty') {
        throw cause;
      }
      if (cause instanceof Error && (cause.message === 'not_authenticated' || cause.message === 'not_authorized')) {
        throw cause;
      }
      const detail = cause instanceof Error ? cause.message : 'unknown';
      throw new Error(`direct_message_send_failed:${detail}`);
    }
  }

  async listDirectThreads(coachId: string): Promise<DirectMessageThread[]> {
    const conversations = await this.listConversations(coachId);
    return conversations
      .filter((row) => row.type === 'dm' && row.peerId)
      .map((row) => ({
        playerId: row.peerId as string,
        lastMessage: row.lastMessage ?? '',
        lastAt: row.lastAt ?? new Date(0).toISOString(),
      }));
  }

  private async ensurePairChannel(
    type: 'dm' | 'p2p',
    userA: string,
    userB: string,
  ): Promise<ChatConversation> {
    const {
      data: { user },
      error: authError,
    } = await this.client.auth.getUser();

    if (authError || !user) {
      throw new Error('not_authenticated');
    }

    if (userA === userB) {
      throw new Error('chat_channel_invalid_pair');
    }

    const [memberA, memberB] = sortMemberPair(userA, userB);
    const existing = await this.findPairChannel(type, memberA, memberB);
    const channel = existing ?? (await this.createPairChannel(type, memberA, memberB));
    await this.ensureMembers(channel.id, [memberA, memberB]);
    return this.toConversation(channel, user.id);
  }

  private async findTeamChannel(teamId: string): Promise<ChannelRow | null> {
    const { data, error } = await this.client
      .from('chat_channels')
      .select(CHANNEL_SELECT)
      .eq('type', 'team')
      .eq('team_id', teamId)
      .maybeSingle();

    if (error) {
      throw new Error(`chat_channel_lookup_failed:${error.message}`);
    }

    return (data as ChannelRow | null) ?? null;
  }

  private async createTeamChannel(teamId: string): Promise<ChannelRow> {
    const { data, error } = await this.client
      .from('chat_channels')
      .insert({
        type: 'team',
        team_id: teamId,
      })
      .select(CHANNEL_SELECT)
      .single();

    if (error) {
      // Concurrent create — re-read
      const existing = await this.findTeamChannel(teamId);
      if (existing) {
        return existing;
      }
      throw new Error(`chat_channel_create_failed:${error.message}`);
    }

    return data as ChannelRow;
  }

  private async findPairChannel(
    type: 'dm' | 'p2p',
    memberA: string,
    memberB: string,
  ): Promise<ChannelRow | null> {
    const { data, error } = await this.client
      .from('chat_channels')
      .select(CHANNEL_SELECT)
      .eq('type', type)
      .eq('member_a', memberA)
      .eq('member_b', memberB)
      .maybeSingle();

    if (error) {
      throw new Error(`chat_channel_lookup_failed:${error.message}`);
    }

    return (data as ChannelRow | null) ?? null;
  }

  private async createPairChannel(
    type: 'dm' | 'p2p',
    memberA: string,
    memberB: string,
  ): Promise<ChannelRow> {
    const { data, error } = await this.client
      .from('chat_channels')
      .insert({
        type,
        member_a: memberA,
        member_b: memberB,
      })
      .select(CHANNEL_SELECT)
      .single();

    if (error) {
      const existing = await this.findPairChannel(type, memberA, memberB);
      if (existing) {
        return existing;
      }
      throw new Error(`chat_channel_create_failed:${error.message}`);
    }

    return data as ChannelRow;
  }

  private async ensureMembers(channelId: string, profileIds: string[]): Promise<void> {
    const rows = profileIds.map((profileId) => ({
      channel_id: channelId,
      profile_id: profileId,
    }));

    const { error } = await this.client
      .from('chat_channel_members')
      .upsert(rows, { onConflict: 'channel_id,profile_id', ignoreDuplicates: true });

    if (error) {
      throw new Error(`chat_members_sync_failed:${error.message}`);
    }
  }

  private async syncTeamMembers(channelId: string, teamId: string): Promise<void> {
    const { data: roster, error } = await this.client
      .from('rosters')
      .select('profile_id')
      .eq('team_id', teamId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`chat_team_members_load_failed:${error.message}`);
    }

    const profileIds = (roster ?? []).map((row) => row.profile_id as string);

    const { data: team } = await this.client
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .maybeSingle();

    if (team?.created_by && !profileIds.includes(team.created_by)) {
      profileIds.push(team.created_by);
    }

    if (profileIds.length > 0) {
      await this.ensureMembers(channelId, profileIds);
    }
  }

  private async ensureTeamChannelsForUser(userId: string): Promise<void> {
    const { data: roster, error } = await this.client
      .from('rosters')
      .select('team_id')
      .eq('profile_id', userId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`chat_team_list_failed:${error.message}`);
    }

    const { data: owned } = await this.client
      .from('teams')
      .select('id')
      .eq('created_by', userId);

    const teamIds = new Set<string>([
      ...(roster ?? []).map((row) => row.team_id as string),
      ...(owned ?? []).map((row) => row.id as string),
    ]);

    for (const teamId of teamIds) {
      await this.ensureTeamChannel(teamId);
    }
  }

  private async loadConversationSummary(
    channel: ChannelRow,
    userId: string,
    lastReadAt: string,
  ): Promise<ChatConversation> {
    const { data: lastRows } = await this.client
      .from('chat_messages')
      .select(MESSAGE_SELECT)
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const last = (lastRows?.[0] as MessageRow | undefined) ?? null;

    const { count } = await this.client
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', channel.id)
      .gt('created_at', lastReadAt)
      .neq('sender_id', userId);

    const title = await this.resolveTitle(channel, userId);

    return {
      id: channel.id,
      type: channel.type,
      teamId: channel.team_id,
      peerId: peerIdFor(channel, userId),
      title,
      lastMessage: last?.body ?? null,
      lastAt: last?.created_at ?? null,
      unreadCount: computeUnreadCount(count ?? 0),
    };
  }

  private async toConversation(channel: ChannelRow, userId: string): Promise<ChatConversation> {
    const { data: membership } = await this.client
      .from('chat_channel_members')
      .select('last_read_at')
      .eq('channel_id', channel.id)
      .eq('profile_id', userId)
      .maybeSingle();

    const lastReadAt = (membership?.last_read_at as string | undefined) ?? '1970-01-01T00:00:00Z';
    return this.loadConversationSummary(channel, userId, lastReadAt);
  }

  private async resolveTitle(channel: ChannelRow, userId: string): Promise<string> {
    if (channel.type === 'team' && channel.team_id) {
      const { data } = await this.client
        .from('teams')
        .select('name')
        .eq('id', channel.team_id)
        .maybeSingle();
      return (data?.name as string | undefined) ?? 'Team chat';
    }

    const peerId = peerIdFor(channel, userId);
    if (!peerId) {
      return channel.type === 'p2p' ? 'Peer chat' : 'Direct message';
    }

    const { data } = await this.client
      .from('profiles')
      .select('display_name')
      .eq('id', peerId)
      .maybeSingle();

    return (data?.display_name as string | undefined) ?? 'Conversation';
  }
}
