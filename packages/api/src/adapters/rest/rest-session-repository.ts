import type { Session, SessionInput } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { SessionRepository } from '../../ports/session-repository.js';

export class RestSessionRepository implements SessionRepository {
  async listForUser(userId: string): Promise<Session[]> {
    void userId;
    throw new NotImplementedAdapterError('rest', 'listSessionsForUser');
  }

  async createSession(userId: string, input: SessionInput): Promise<Session> {
    void userId;
    void input;
    throw new NotImplementedAdapterError('rest', 'createSession');
  }

  async updateSession(sessionId: string, userId: string, input: SessionInput): Promise<Session> {
    void sessionId;
    void userId;
    void input;
    throw new NotImplementedAdapterError('rest', 'updateSession');
  }

  async cancelSession(sessionId: string, userId: string): Promise<void> {
    void sessionId;
    void userId;
    throw new NotImplementedAdapterError('rest', 'cancelSession');
  }
}
