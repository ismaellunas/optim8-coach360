import { z } from 'zod';
import { subscriptionTierSchema } from '../subscription/schema.js';

/** Age range used for recommendation context and package metadata. */
export const ageRangeSchema = z.object({
  min: z.number().int().min(0).max(99).nullable().optional(),
  max: z.number().int().min(0).max(99).nullable().optional(),
});

export type AgeRange = z.infer<typeof ageRangeSchema>;

/**
 * STORY-11.2 AC-1 — recommendation context inputs.
 * Server may override tier / purchaseHistory from auth + DB.
 */
export const recommendationContextSchema = z.object({
  objectives: z.array(z.string().trim().min(1)).default([]),
  age: ageRangeSchema.nullable().optional(),
  tier: subscriptionTierSchema,
  purchaseHistory: z.array(z.string().trim().min(1)).default([]),
  /** Optional progress signals (ranking boost only; not required for AC-1). */
  progress: z
    .object({
      weakAreas: z.array(z.string().trim().min(1)).optional(),
      completionRate: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export type RecommendationContext = z.infer<typeof recommendationContextSchema>;

/** Candidate package for metadata ranking (from package_metadata or fixtures). */
export const recommendationCandidateSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  skills: z.array(z.string()).default([]),
  objectives: z.array(z.string()).default([]),
  ageMin: z.number().int().nullable().optional(),
  ageMax: z.number().int().nullable().optional(),
  /** Optional package floor; defaults to basic when omitted (AC-2). */
  minTier: subscriptionTierSchema.optional(),
  published: z.boolean().default(true),
});

export type RecommendationCandidate = z.infer<typeof recommendationCandidateSchema>;

export const packageRecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  matchScore: z.number().min(0).max(1),
  skills: z.array(z.string()).default([]),
  objectives: z.array(z.string()).default([]),
  /** STORY-11.3 — optional LLM "why" copy (UI display not required for MVP / OQ-6.6). */
  why: z.string().trim().min(1).optional(),
});

export type PackageRecommendation = z.infer<typeof packageRecommendationSchema>;

/** Structured LLM re-rank result (Vercel AI SDK generateObject). */
export const llmRerankResultSchema = z.object({
  rankings: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        why: z.string().trim().min(1),
      }),
    )
    .min(1)
    .max(3),
});

export type LlmRerankResult = z.infer<typeof llmRerankResultSchema>;
