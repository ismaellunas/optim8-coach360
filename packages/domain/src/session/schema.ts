import { z } from 'zod';
import { sessionContentRefsSchema } from './content-refs.js';

export const sessionTypeSchema = z.enum(['practice', 'film', 'individual']);
export const sessionStatusSchema = z.enum(['scheduled', 'cancelled']);

export const sessionSchema = z
  .object({
    id: z.string().uuid(),
    coachId: z.string().uuid(),
    teamId: z.string().uuid().nullable(),
    playerId: z.string().uuid().nullable(),
    title: z.string().trim().min(1),
    notes: z.string().nullable(),
    scheduledAt: z.string().datetime({ offset: true }),
    durationMinutes: z.number().int().min(1),
    sessionType: sessionTypeSchema,
    status: sessionStatusSchema,
    contentRefs: sessionContentRefsSchema.default([]),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .superRefine((data, ctx) => {
    const hasTeam = Boolean(data.teamId);
    const hasPlayer = Boolean(data.playerId);
    if (hasTeam === hasPlayer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'session_recipient_required',
        path: ['teamId'],
      });
    }
    if (data.sessionType === 'individual' && !data.playerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'individual_session_requires_player',
        path: ['playerId'],
      });
    }
    if (data.sessionType !== 'individual' && !data.teamId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'team_session_requires_team',
        path: ['teamId'],
      });
    }
  });

export type Session = z.infer<typeof sessionSchema>;

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
}

export const sessionInputSchema = z
  .object({
    title: z.string().trim().min(1),
    notes: z.preprocess(normalizeOptionalText, z.string().nullable().optional()),
    scheduledAt: z.string().datetime({ offset: true }),
    durationMinutes: z.number().int().min(1).default(60),
    sessionType: sessionTypeSchema,
    teamId: z.string().uuid().nullable().optional(),
    playerId: z.string().uuid().nullable().optional(),
    contentRefs: sessionContentRefsSchema.optional().default([]),
  })
  .superRefine((data, ctx) => {
    const hasTeam = Boolean(data.teamId);
    const hasPlayer = Boolean(data.playerId);
    if (hasTeam === hasPlayer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'session_recipient_required',
        path: ['teamId'],
      });
    }
    if (data.sessionType === 'individual' && !data.playerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'individual_session_requires_player',
        path: ['playerId'],
      });
    }
    if (data.sessionType !== 'individual' && !data.teamId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'team_session_requires_team',
        path: ['teamId'],
      });
    }
  });

export type SessionInput = z.infer<typeof sessionInputSchema>;
