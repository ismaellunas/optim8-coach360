import { z } from 'zod';
import { appRoleSchema } from '../user/schema.js';

export const coachContextSchema = z.enum(['independent', 'team']);
export type CoachContext = z.infer<typeof coachContextSchema>;

export const profileSchema = z.object({
  id: z.string().uuid(),
  role: appRoleSchema,
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  coachContext: coachContextSchema.nullable(),
  age: z.number().int().nullable(),
  position: z.string().nullable(),
  profileCompletedAt: z.string().datetime({ offset: true }).nullable(),
  teamSetupPathEnteredAt: z.string().datetime({ offset: true }).nullable(),
  coachOnboardingCompletedAt: z.string().datetime({ offset: true }).nullable(),
  playerOnboardingCompletedAt: z.string().datetime({ offset: true }).nullable(),
  firstDrillCompletedAt: z.string().datetime({ offset: true }).nullable(),
  playerDrillsCompletedCount: z.number().int().min(0),
});

export type Profile = z.infer<typeof profileSchema>;

export const coachProfileInputSchema = z.object({
  coachContext: coachContextSchema,
  bio: z.string().trim().optional(),
});

export type CoachProfileInput = z.infer<typeof coachProfileInputSchema>;

export const playerProfileInputSchema = z.object({
  age: z.number().int().min(5).max(99),
  position: z.string().trim().min(1),
  avatarUrl: z.string().url().nullable().optional(),
});

export type PlayerProfileInput = z.infer<typeof playerProfileInputSchema>;

export const teamManagerProfileInputSchema = z.object({
  bio: z.string().trim().optional(),
});

export type TeamManagerProfileInput = z.infer<typeof teamManagerProfileInputSchema>;
