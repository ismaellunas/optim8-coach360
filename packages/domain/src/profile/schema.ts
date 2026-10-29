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

const displayNameSchema = z.string().trim().min(1).max(120);
const bioSchema = z.string().trim().max(500);
const avatarUrlSchema = z.string().url().nullable();

export const coachProfileInputSchema = z.object({
  coachContext: coachContextSchema,
  bio: bioSchema.optional(),
  displayName: displayNameSchema.optional(),
  avatarUrl: avatarUrlSchema.optional(),
});

export type CoachProfileInput = z.infer<typeof coachProfileInputSchema>;

export const playerProfileInputSchema = z.object({
  age: z.number().int().min(5).max(99),
  position: z.string().trim().min(1).max(80),
  avatarUrl: avatarUrlSchema.optional(),
  bio: bioSchema.optional(),
  displayName: displayNameSchema.optional(),
});

export type PlayerProfileInput = z.infer<typeof playerProfileInputSchema>;

export const teamManagerProfileInputSchema = z.object({
  bio: bioSchema.optional(),
  displayName: displayNameSchema.optional(),
  avatarUrl: avatarUrlSchema.optional(),
});

export type TeamManagerProfileInput = z.infer<typeof teamManagerProfileInputSchema>;

/** Shared identity fields any role may change. Email is not included. */
export const selfProfileInputSchema = z.object({
  displayName: displayNameSchema,
  bio: bioSchema,
  avatarUrl: avatarUrlSchema,
});

export type SelfProfileInput = z.infer<typeof selfProfileInputSchema>;
