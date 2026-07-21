import type {
  CoachCompletionFilters,
  DrillLogInput,
  SessionContentCompletion,
  SessionContentRef,
} from '@coach360/domain';

export type { SessionContentCompletion };

export type SessionContentRepository = {
  listCompletions(sessionId: string, playerId: string): Promise<SessionContentCompletion[]>;
  /** All completion rows for a player — coach dashboard consumption (STORY-7.2 AC-4). */
  listPlayerProgress(playerId: string): Promise<SessionContentCompletion[]>;
  /** Coach-owned session completions for progress review dashboard (STORY-7.3). */
  listCoachCompletions(filters?: CoachCompletionFilters): Promise<SessionContentCompletion[]>;
  markComplete(
    sessionId: string,
    playerId: string,
    ref: Pick<SessionContentRef, 'kind' | 'source' | 'id'>,
    drillLog?: DrillLogInput,
  ): Promise<SessionContentCompletion>;
  /** Resolve playback URL for library video or purchased package (STORY-7.1 AC-2). */
  resolveMediaUrl(
    ref: SessionContentRef,
    coachId: string,
  ): Promise<string | null>;
};
