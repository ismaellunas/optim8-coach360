import { NotImplementedAdapterError } from '../../client/types.js';
import type {
  ChatConversation,
  ChatMessage,
  DirectMessage,
  DirectMessageThread,
  MessagingRepository,
  SendChannelMessageInput,
} from '../../ports/messaging-repository.js';
import type { ChatVideoAttachment } from '@coach360/domain';

export class RestMessagingRepository implements MessagingRepository {
  async listConversations(userId: string): Promise<ChatConversation[]> {
    void userId;
    throw new NotImplementedAdapterError('rest', 'listConversations');
  }

  async ensureTeamChannel(teamId: string): Promise<ChatConversation> {
    void teamId;
    throw new NotImplementedAdapterError('rest', 'ensureTeamChannel');
  }

  async ensureDmChannel(userA: string, userB: string): Promise<ChatConversation> {
    void userA;
    void userB;
    throw new NotImplementedAdapterError('rest', 'ensureDmChannel');
  }

  async ensureP2pChannel(userA: string, userB: string): Promise<ChatConversation> {
    void userA;
    void userB;
    throw new NotImplementedAdapterError('rest', 'ensureP2pChannel');
  }

  async listChannelMessages(channelId: string): Promise<ChatMessage[]> {
    void channelId;
    throw new NotImplementedAdapterError('rest', 'listChannelMessages');
  }

  async sendChannelMessage(input: SendChannelMessageInput): Promise<ChatMessage> {
    void input;
    throw new NotImplementedAdapterError('rest', 'sendChannelMessage');
  }

  async uploadChatVideo(
    channelId: string,
    file: Blob,
    fileName: string,
  ): Promise<ChatVideoAttachment> {
    void channelId;
    void file;
    void fileName;
    throw new NotImplementedAdapterError('rest', 'uploadChatVideo');
  }

  async markChannelRead(channelId: string): Promise<void> {
    void channelId;
    throw new NotImplementedAdapterError('rest', 'markChannelRead');
  }

  subscribeToChannel(
    channelId: string,
    onMessage: (message: ChatMessage) => void,
  ): () => void {
    void channelId;
    void onMessage;
    return () => {};
  }

  async listDirectMessages(coachId: string, playerId: string): Promise<DirectMessage[]> {
    void coachId;
    void playerId;
    throw new NotImplementedAdapterError('rest', 'listDirectMessages');
  }

  async sendDirectMessage(input: {
    coachId: string;
    playerId: string;
    body: string;
  }): Promise<DirectMessage> {
    void input;
    throw new NotImplementedAdapterError('rest', 'sendDirectMessage');
  }

  async listDirectThreads(coachId: string): Promise<DirectMessageThread[]> {
    void coachId;
    throw new NotImplementedAdapterError('rest', 'listDirectThreads');
  }
}
