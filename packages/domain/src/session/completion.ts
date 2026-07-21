import type { SessionContentRef } from './content-refs.js';

/** Stable key for per-player completion rows: kind:source:id */
export function sessionContentKey(
  ref: Pick<SessionContentRef, 'kind' | 'source' | 'id'>,
): string {
  return `${ref.kind}:${ref.source}:${ref.id}`;
}

export type SessionContentCompletion = {
  sessionId: string;
  playerId: string;
  contentKey: string;
  completedAt: string;
};
