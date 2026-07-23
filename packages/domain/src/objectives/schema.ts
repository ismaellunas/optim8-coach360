import { z } from 'zod';

/** Flow 6 / OQ-6.1 — player or team goal scope. */
export const objectiveScopeSchema = z.enum(['player', 'team']);

export type ObjectiveScope = z.infer<typeof objectiveScopeSchema>;

/** Optional category tags aligned with Flow 6 (shooting, defense, strategy). */
export const objectiveCategorySchema = z.enum(['shooting', 'defense', 'strategy', 'other']);

export type ObjectiveCategory = z.infer<typeof objectiveCategorySchema>;

export const objectiveSchema = z.object({
  id: z.string().uuid(),
  coachId: z.string().uuid(),
  scope: objectiveScopeSchema,
  playerId: z.string().uuid().nullable(),
  teamId: z.string().uuid().nullable(),
  title: z.string().min(1),
  category: objectiveCategorySchema.nullable(),
  targetCompletions: z.number().int().positive(),
  currentCompletions: z.number().int().min(0),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Objective = z.infer<typeof objectiveSchema>;

export const createObjectiveInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    scope: objectiveScopeSchema,
    playerId: z.string().uuid().nullable().optional(),
    teamId: z.string().uuid().nullable().optional(),
    category: objectiveCategorySchema.nullable().optional(),
    targetCompletions: z.number().int().min(1).max(999).default(10),
  })
  .superRefine(function (data, ctx) {
    if (data.scope === 'player') {
      if (!data.playerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'player_id_required',
          path: ['playerId'],
        });
      }
      if (data.teamId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'team_id_not_allowed_for_player_scope',
          path: ['teamId'],
        });
      }
    }
    if (data.scope === 'team') {
      if (!data.teamId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'team_id_required',
          path: ['teamId'],
        });
      }
      if (data.playerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'player_id_not_allowed_for_team_scope',
          path: ['playerId'],
        });
      }
    }
  });

export type CreateObjectiveInput = z.infer<typeof createObjectiveInputSchema>;

/** Percent complete for progress rings / bars (0–100). */
export function computeObjectiveProgress(
  currentCompletions: number,
  targetCompletions: number,
): number {
  if (targetCompletions <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((currentCompletions / targetCompletions) * 100));
}

export function isPlayerObjective(objective: Pick<Objective, 'scope' | 'playerId'>): boolean {
  return objective.scope === 'player' && objective.playerId != null;
}

export function isTeamObjective(objective: Pick<Objective, 'scope' | 'teamId'>): boolean {
  return objective.scope === 'team' && objective.teamId != null;
}
