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
