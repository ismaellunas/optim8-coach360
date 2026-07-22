import { z } from 'zod';

/**
 * Stakeholder Q 12.6 (2026-07-22): Path A distribution is roster-only.
 * Individual clients must be on a (possibly single-player) team first.
 */
export const ALLOW_NON_ROSTER_CONTENT_DISTRIBUTION = false;

export const contentRecipientModeSchema = z.enum(['team', 'player']);
export type ContentRecipientMode = z.infer<typeof contentRecipientModeSchema>;

export const assignContentInputSchema = z
  .object({
    libraryItemId: z.string().uuid(),
    teamId: z.string().uuid().nullable().optional(),
    playerId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const hasTeam = Boolean(data.teamId);
    const hasPlayer = Boolean(data.playerId);
    if (hasTeam === hasPlayer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'content_recipient_required',
        path: hasTeam ? ['playerId'] : ['teamId'],
      });
    }
  });

export type AssignContentInput = z.infer<typeof assignContentInputSchema>;

/** Product gate for AC-4 / Q 12.6 — currently never allowed. */
export function canDistributeToNonRosterPlayer(): boolean {
  return ALLOW_NON_ROSTER_CONTENT_DISTRIBUTION;
}

/**
 * Ensures an individual recipient is on the coach's roster set.
 * Throws `non_roster_distribution_forbidden` when Q 12.6 roster-only rule applies.
 */
export function assertPlayerOnRosterForDistribution(
  playerId: string,
  rosterPlayerIds: ReadonlyArray<string>,
): void {
  if (rosterPlayerIds.includes(playerId)) {
    return;
  }
  if (canDistributeToNonRosterPlayer()) {
    return;
  }
  throw new Error('non_roster_distribution_forbidden');
}
