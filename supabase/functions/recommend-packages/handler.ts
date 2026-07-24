/**
 * STORY-11.2 — metadata package recommendations (Deno-safe copy of domain ranking).
 * Canonical unit tests live against packages/domain; keep filters/scoring in sync.
 */

export type SubscriptionTier = 'trial' | 'basic' | 'advanced' | 'pro';

export type AgeRange = {
  min?: number | null;
  max?: number | null;
};

export type RecommendationContext = {
  objectives: string[];
  age?: AgeRange | null;
  tier: SubscriptionTier;
  purchaseHistory: string[];
  progress?: {
    weakAreas?: string[];
    completionRate?: number;
  };
};

export type RecommendationCandidate = {
  id: string;
  title: string;
  description?: string | null;
  skills?: string[];
  objectives?: string[];
  ageMin?: number | null;
  ageMax?: number | null;
  minTier?: SubscriptionTier;
  published?: boolean;
};

export type PackageRecommendation = {
  id: string;
  title: string;
  matchScore: number;
  skills: string[];
  objectives: string[];
};

const TIER_ORDER: SubscriptionTier[] = ['trial', 'basic', 'advanced', 'pro'];
const DEFAULT_MIN_TIER: SubscriptionTier = 'basic';
const TOP_K = 3;

function tierIndex(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier);
}

function meetsTierMinimum(effectiveTier: SubscriptionTier, minimum: SubscriptionTier): boolean {
  const effective = effectiveTier === 'trial' ? 'pro' : effectiveTier;
  return tierIndex(effective) >= tierIndex(minimum);
}

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
  if (!contextAge || (contextAge.min == null && contextAge.max == null)) return 0.5;
  if (packageAge.min == null && packageAge.max == null) return 0.5;
  if (!ageRangesOverlap(contextAge, packageAge)) return 0;
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
    for (const h of haystack) {
      if (h.includes(token) || token.includes(h)) {
        hits += 1;
        break;
      }
    }
  }
  return hits / query.size;
}

export function passesHardFilters(
  candidate: RecommendationCandidate,
  context: Pick<RecommendationContext, 'tier' | 'purchaseHistory' | 'age'>,
): boolean {
  if (candidate.published === false) return false;
  if (context.purchaseHistory.includes(candidate.id)) return false;
  const minTier = candidate.minTier ?? DEFAULT_MIN_TIER;
  if (!meetsTierMinimum(context.tier, minTier)) return false;
  if (
    !ageRangesOverlap(context.age, {
      min: candidate.ageMin,
      max: candidate.ageMax,
    })
  ) {
    return false;
  }
  return true;
}

export function scorePackageMatch(
  candidate: RecommendationCandidate,
  context: RecommendationContext,
): number {
  const objectiveQuery = tokenSet([
    ...context.objectives,
    ...(context.progress?.weakAreas ?? []),
  ]);
  const packageTokens = tokenSet([
    ...(candidate.skills ?? []),
    ...(candidate.objectives ?? []),
    candidate.title,
    candidate.description ?? '',
  ]);
  const objectiveScore = overlapRatio(objectiveQuery, packageTokens);
  const ageScore = ageFitScore(context.age, {
    min: candidate.ageMin,
    max: candidate.ageMax,
  });
  let score =
    objectiveQuery.size === 0 ? 0.35 * ageScore + 0.2 : 0.7 * objectiveScore + 0.3 * ageScore;
  if (typeof context.progress?.completionRate === 'number' && context.progress.completionRate < 0.4) {
    score = Math.min(1, score + 0.05);
  }
  return Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000;
}

export function rankPackageRecommendations(
  candidates: RecommendationCandidate[],
  context: RecommendationContext,
  limit = TOP_K,
): PackageRecommendation[] {
  const ranked: PackageRecommendation[] = [];
  for (const candidate of candidates) {
    if (!passesHardFilters(candidate, context)) continue;
    ranked.push({
      id: candidate.id,
      title: candidate.title,
      matchScore: scorePackageMatch(candidate, context),
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

export type RecommendPackagesRequestBody = {
  objectives?: string[];
  age?: AgeRange | null;
  tier?: string;
  purchaseHistory?: string[];
  progress?: {
    weakAreas?: string[];
    completionRate?: number;
  };
};

const TIERS = new Set<string>(['trial', 'basic', 'advanced', 'pro']);

export function parseRecommendationContext(
  body: RecommendPackagesRequestBody,
  serverTier: SubscriptionTier,
  serverPurchaseHistory: string[],
): RecommendationContext {
  const objectives = Array.isArray(body.objectives)
    ? body.objectives.filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
    : [];
  const age =
    body.age && typeof body.age === 'object'
      ? {
          min: typeof body.age.min === 'number' ? body.age.min : null,
          max: typeof body.age.max === 'number' ? body.age.max : null,
        }
      : null;

  // Prefer server tier/purchases for trust; accept body as fallback for AC-1 contract.
  const tier =
    (TIERS.has(serverTier) ? serverTier : null) ||
    (typeof body.tier === 'string' && TIERS.has(body.tier) ? (body.tier as SubscriptionTier) : 'basic');

  const purchaseHistory =
    serverPurchaseHistory.length > 0
      ? serverPurchaseHistory
      : Array.isArray(body.purchaseHistory)
        ? body.purchaseHistory.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : [];

  return {
    objectives,
    age,
    tier,
    purchaseHistory,
    progress: body.progress,
  };
}
