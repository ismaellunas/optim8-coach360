import { NotImplementedAdapterError } from '../../client/types.js';
import type {
  DirectMessage,
  DirectMessageThread,
  MessagingRepository,
} from '../../ports/messaging-repository.js';

export class RestMessagingRepository implements MessagingRepository {
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
