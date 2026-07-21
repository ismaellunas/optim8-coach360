import { z } from 'zod';
import type { SessionContentRef } from './content-refs.js';

/** Stable key for per-player completion rows: kind:source:id */
export function sessionContentKey(
  ref: Pick<SessionContentRef, 'kind' | 'source' | 'id'>,
): string {
  return `${ref.kind}:${ref.source}:${ref.id}`;
}

export const drillLogInputSchema = z.object({
  reps: z.number().int().min(0).nullable().optional(),
  durationSeconds: z.number().int().min(0).nullable().optional(),
});

export type DrillLogInput = z.infer<typeof drillLogInputSchema>;

export type SessionContentCompletion = {
  sessionId: string;
  playerId: string;
  contentKey: string;
  completedAt: string;
  reps?: number | null;
  durationSeconds?: number | null;
};
