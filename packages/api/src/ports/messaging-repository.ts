import type { ChatChannelType, MvpChatMessageType } from '@coach360/domain';
import type {
  ChatAchievementAttachment,
  ChatContentLinkAttachment,
  ChatInsightAttachment,
  ChatVideoAttachment,
} from '@coach360/domain';

export type DirectMessage = {
  id: string;
  coachId: string;
  playerId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type DirectMessageThread = {
  playerId: string;
  lastMessage: string;
  lastAt: string;
};

export type ChatConversation = {
  id: string;
  type: ChatChannelType;
  teamId: string | null;
  peerId: string | null;
  title: string;
  lastMessage: string | null;
  lastAt: string | null;
  unreadCount: number;
};

export type ChatMessageAttachment =
  | ChatContentLinkAttachment
  | ChatVideoAttachment
  | ChatAchievementAttachment
  | ChatInsightAttachment;

export type ChatMessage = {
  id: string;
  channelId: string;
  senderId: string;
  body: string;
  messageType: MvpChatMessageType;
  attachment: ChatMessageAttachment | null;
  createdAt: string;
};

export type SendChannelMessageInput = {
  channelId: string;
  body?: string;
  messageType?: MvpChatMessageType;
  attachment?: ChatMessageAttachment | null;
};

export type MessagingRepository = {
  listConversations(userId: string): Promise<ChatConversation[]>;
  ensureTeamChannel(teamId: string): Promise<ChatConversation>;
  ensureDmChannel(userA: string, userB: string): Promise<ChatConversation>;
  ensureP2pChannel(userA: string, userB: string): Promise<ChatConversation>;
  listChannelMessages(channelId: string): Promise<ChatMessage[]>;
  sendChannelMessage(input: SendChannelMessageInput): Promise<ChatMessage>;
  /** STORY-8.3 — peer achievement/insight messages on a team channel. */
  listTeamPeerShares(teamId: string): Promise<ChatMessage[]>;
  uploadChatVideo(
    channelId: string,
    file: Blob,
    fileName: string,
  ): Promise<ChatVideoAttachment>;
  markChannelRead(channelId: string): Promise<void>;
  subscribeToChannel(
    channelId: string,
    onMessage: (message: ChatMessage) => void,
  ): () => void;

  listDirectMessages(coachId: string, playerId: string): Promise<DirectMessage[]>;
  sendDirectMessage(input: {
    coachId: string;
    playerId: string;
    body: string;
  }): Promise<DirectMessage>;
  listDirectThreads(coachId: string): Promise<DirectMessageThread[]>;
};
