import type { Session, SessionInput } from '@coach360/domain';

export type SessionRepository = {
  listForUser(userId: string): Promise<Session[]>;
  createSession(userId: string, input: SessionInput): Promise<Session>;
  updateSession(sessionId: string, userId: string, input: SessionInput): Promise<Session>;
  cancelSession(sessionId: string, userId: string): Promise<void>;
};
