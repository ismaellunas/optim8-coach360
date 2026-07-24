import { meetsTierMinimum } from '../subscription/expiry.js';
import type { SubscriptionTier } from '../subscription/schema.js';
import type {
  AgeRange,
  PackageRecommendation,
  RecommendationCandidate,
  RecommendationContext,
} from './schema.js';

const DEFAULT_MIN_TIER: SubscriptionTier = 'basic';
const TOP_K = 3;

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function tokenSet(values: string[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const value of values ?? []) {
    if (typeof value !== 'string') continue;
    const token = normalizeToken(value);
    if (token) out.add(token);
  }
  return out;
}

/** True when ranges overlap, or either side is unconstrained. */
export function ageRangesOverlap(
  contextAge: AgeRange | null | undefined,
  packageAge: { min?: number | null; max?: number | null },
): boolean {
  if (!contextAge) return true;
  const cMin = contextAge.min ?? null;
  const cMax = contextAge.max ?? null;
  const pMin = packageAge.min ?? null;
  const pMax = packageAge.max ?? null;
  if (cMin == null && cMax == null) return true;
  if (pMin == null && pMax == null) return true;
  const left = Math.max(cMin ?? 0, pMin ?? 0);
  const right = Math.min(cMax ?? 99, pMax ?? 99);
  return left <= right;
}

function ageFitScore(
  contextAge: AgeRange | null | undefined,
  packageAge: { min?: number | null; max?: number | null },
): number {
  if (!contextAge || (contextAge.min == null && contextAge.max == null)) {
    return 0.5;
  }
  if (packageAge.min == null && packageAge.max == null) {
    return 0.5;
  }
  if (!ageRangesOverlap(contextAge, packageAge)) {
    return 0;
  }
  // Prefer packages whose midpoint is closer to context midpoint.
  const cMid = ((contextAge.min ?? 0) + (contextAge.max ?? 99)) / 2;
  const pMid = ((packageAge.min ?? 0) + (packageAge.max ?? 99)) / 2;
  const distance = Math.abs(cMid - pMid);
  return Math.max(0, 1 - distance / 20);
}

function overlapRatio(query: Set<string>, haystack: Set<string>): number {
  if (query.size === 0) return 0;
  let hits = 0;
  for (const token of query) {
    if (haystack.has(token)) {
      hits += 1;
      continue;
    }
    // Soft match: substring / shared word stem for "shooting" vs "Improve shooting %"
    for (const h of haystack) {
      if (h.includes(token) || token.includes(h)) {
        hits += 1;
        break;
      }
    }
  }
  return hits / query.size;
}

/**
 * AC-2 — hard filters: unpublished, owned, ineligible tier, non-overlapping age.
 */
export function passesHardFilters(
  candidate: RecommendationCandidate,
  context: Pick<RecommendationContext, 'tier' | 'purchaseHistory' | 'age'>,
): boolean {
  if (candidate.published === false) return false;
  if (context.purchaseHistory.includes(candidate.id)) return false;

  const minTier = candidate.minTier ?? DEFAULT_MIN_TIER;
  const effectiveTier = context.tier === 'trial' ? 'pro' : context.tier;
  if (!meetsTierMinimum(effectiveTier, minTier)) return false;

  if (
    !ageRangesOverlap(context.age, {
      min: candidate.ageMin ?? null,
      max: candidate.ageMax ?? null,
    })
  ) {
    return false;
  }

  return true;
}

/**
 * Metadata match score in [0, 1] from objectives/skills + age fit (+ weak areas).
 */
export function scorePackageMatch(
  candidate: RecommendationCandidate,
  context: RecommendationContext,
): number {
  const objectiveQuery = tokenSet([
    ...context.objectives,
    ...(context.progress?.weakAreas ?? []),
  ]);
  const packageTokens = tokenSet([
    ...candidate.skills,
    ...candidate.objectives,
    candidate.title,
    candidate.description ?? '',
  ]);

  const objectiveScore = overlapRatio(objectiveQuery, packageTokens);
  const ageScore = ageFitScore(context.age, {
    min: candidate.ageMin ?? null,
    max: candidate.ageMax ?? null,
  });

  // Weight objectives higher; age is a secondary signal (OQ-4.5: ranking).
  let score = objectiveQuery.size === 0 ? 0.35 * ageScore + 0.2 : 0.7 * objectiveScore + 0.3 * ageScore;

  if (typeof context.progress?.completionRate === 'number' && context.progress.completionRate < 0.4) {
    // Slight boost when completion is low (suggest more foundational content).
    score = Math.min(1, score + 0.05);
  }

  return Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000;
}

/**
 * AC-2 + AC-3 — filter, score, return top 3 with matchScore.
 */
export function rankPackageRecommendations(
  candidates: RecommendationCandidate[],
  context: RecommendationContext,
  limit = TOP_K,
): PackageRecommendation[] {
  const ranked: PackageRecommendation[] = [];

  for (const candidate of candidates) {
    if (!passesHardFilters(candidate, context)) continue;
    const matchScore = scorePackageMatch(candidate, context);
    ranked.push({
      id: candidate.id,
      title: candidate.title,
      matchScore,
      skills: candidate.skills ?? [],
      objectives: candidate.objectives ?? [],
    });
  }

  ranked.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.title.localeCompare(b.title);
  });

  return ranked.slice(0, Math.max(0, limit));
}
