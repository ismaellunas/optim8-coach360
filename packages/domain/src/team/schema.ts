import { z } from 'zod';

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function normalizeOptionalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const datePart = trimmed.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
  }
  return null;
}

const optionalDateSchema = z.preprocess(normalizeOptionalDate, dateStringSchema.nullable());

export const teamSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  ageMin: z.number().int().nullable(),
  ageMax: z.number().int().nullable(),
  gradeLevel: z.string().nullable(),
  division: z.string().nullable(),
  seasonStart: z.string().nullable(),
  seasonEnd: z.string().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Team = z.infer<typeof teamSchema>;

export const teamProfileInputSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
    ageMin: z.number().int().min(5).max(99).nullable().optional(),
    ageMax: z.number().int().min(5).max(99).nullable().optional(),
    gradeLevel: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      z.string().trim().min(1).nullable().optional(),
    ),
    division: z.preprocess(
      (value) => (value === '' || value === undefined ? null : value),
      z.string().trim().min(1).nullable().optional(),
    ),
    seasonStart: optionalDateSchema.optional(),
    seasonEnd: optionalDateSchema.optional(),
    logoUrl: z.string().url().nullable().optional(),
  })
  .superRefine(function (data, ctx) {
    if (data.ageMin != null && data.ageMax != null && data.ageMin > data.ageMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'age_range_invalid',
        path: ['ageMax'],
      });
    }
    if (data.seasonStart && data.seasonEnd && data.seasonStart > data.seasonEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'season_range_invalid',
        path: ['seasonEnd'],
      });
    }
  });

export type TeamProfileInput = z.infer<typeof teamProfileInputSchema>;

export const rosterRoleSchema = z.enum(['player', 'assistant_coach', 'manager']);
export const rosterStatusSchema = z.enum(['invited', 'active', 'removed']);
export const inviteStatusSchema = z.enum(['active', 'revoked', 'consumed']);

export type RosterRole = z.infer<typeof rosterRoleSchema>;
export type RosterStatus = z.infer<typeof rosterStatusSchema>;
export type InviteStatus = z.infer<typeof inviteStatusSchema>;

export const rosterMemberSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  profileId: z.string().uuid(),
  displayName: z.string().nullable(),
  rosterRole: rosterRoleSchema,
  status: rosterStatusSchema,
  joinedAt: z.string().datetime({ offset: true }),
});

export type RosterMember = z.infer<typeof rosterMemberSchema>;

export const teamInviteSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  code: z.string().min(4),
  invitedEmail: z.string().email().nullable(),
  status: inviteStatusSchema,
  expiresAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
});

export type TeamInvite = z.infer<typeof teamInviteSchema>;

export const teamInviteWithLinkSchema = teamInviteSchema.extend({
  inviteUrl: z.string().url(),
});

export type TeamInviteWithLink = z.infer<typeof teamInviteWithLinkSchema>;

export const teamInvitePreviewSchema = teamInviteSchema.extend({
  teamName: z.string(),
});

export type TeamInvitePreview = z.infer<typeof teamInvitePreviewSchema>;
