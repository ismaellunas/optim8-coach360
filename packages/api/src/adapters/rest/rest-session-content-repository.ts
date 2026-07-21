import type {
  CoachCompletionFilters,
  DrillLogInput,
  SessionContentRef,
} from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type {
  SessionContentCompletion,
  SessionContentRepository,
} from '../../ports/session-content-repository.js';

export class RestSessionContentRepository implements SessionContentRepository {
  async listCompletions(sessionId: string, playerId: string): Promise<SessionContentCompletion[]> {
    void sessionId;
    void playerId;
    throw new NotImplementedAdapterError('rest', 'listCompletions');
  }

  async listPlayerProgress(playerId: string): Promise<SessionContentCompletion[]> {
    void playerId;
    throw new NotImplementedAdapterError('rest', 'listPlayerProgress');
  }

  async listCoachCompletions(filters?: CoachCompletionFilters): Promise<SessionContentCompletion[]> {
    void filters;
    throw new NotImplementedAdapterError('rest', 'listCoachCompletions');
  }

  async markComplete(
    sessionId: string,
    playerId: string,
    ref: Pick<SessionContentRef, 'kind' | 'source' | 'id'>,
    drillLog?: DrillLogInput,
  ): Promise<SessionContentCompletion> {
    void sessionId;
    void playerId;
    void ref;
    void drillLog;
    throw new NotImplementedAdapterError('rest', 'markComplete');
  }

  async resolveMediaUrl(ref: SessionContentRef, coachId: string): Promise<string | null> {
    void ref;
    void coachId;
    throw new NotImplementedAdapterError('rest', 'resolveMediaUrl');
  }
}
