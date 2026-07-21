import type { SessionContentCompletion, SessionContentRef } from '@coach360/domain';

export type { SessionContentCompletion };

export type SessionContentRepository = {
  listCompletions(sessionId: string, playerId: string): Promise<SessionContentCompletion[]>;
  markComplete(
    sessionId: string,
    playerId: string,
    ref: Pick<SessionContentRef, 'kind' | 'source' | 'id'>,
  ): Promise<SessionContentCompletion>;
  /** Resolve playback URL for library video or purchased package (STORY-7.1 AC-2). */
  resolveMediaUrl(
    ref: SessionContentRef,
    coachId: string,
  ): Promise<string | null>;
};
