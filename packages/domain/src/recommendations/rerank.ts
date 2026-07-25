import type {
  LlmRerankResult,
  PackageRecommendation,
  RecommendationContext,
} from './schema.js';
import { llmRerankResultSchema } from './schema.js';

/** Metadata pool size sent to the LLM before it returns top 3. */
export const LLM_CANDIDATE_POOL = 8;
export const LLM_TOP_K = 3;

/**
 * OQ-6.7 — fields allowed in provider prompts/context.
 * Secrets (Stripe, service role, API keys) must never be included.
 */
export type ProviderIdentityContext = {
  userId?: string | null;
  email?: string | null;
  displayName?: string | null;
  age?: number | null;
  dateOfBirth?: string | null;
  isMinor?: boolean | null;
  teamNames?: string[];
  rosterDetails?: string[];
  chatMessages?: string[];
};

export type ProviderContextPayload = {
  objectives: string[];
  age: RecommendationContext['age'] | null;
  tier: RecommendationContext['tier'];
  progress?: RecommendationContext['progress'];
  purchaseHistory: string[];
  identity: {
    userId?: string;
    email?: string;
    displayName?: string;
    age?: number;
    dateOfBirth?: string;
    isMinor?: boolean;
    teamNames?: string[];
    rosterDetails?: string[];
    chatMessages?: string[];
  };
  candidates: Array<{
    id: string;
    title: string;
    matchScore: number;
    skills: string[];
    objectives: string[];
  }>;
};

const SECRET_KEY_PATTERN =
  /^(stripe|sk_|pk_test|pk_live|whsec_|service_role|supabase_service|mistral_api|api_key|apikey|authorization|password|secret)/i;

/**
 * AC-4 — build allowlisted provider context from recommendation + identity.
 * Extra keys (e.g. stripeSecret) are ignored even if passed.
 */
export function buildProviderContextPayload(
  context: RecommendationContext,
  candidates: PackageRecommendation[],
  identity: ProviderIdentityContext = {},
  _extras?: Record<string, unknown>,
): ProviderContextPayload {
  void _extras;
  const identityOut: ProviderContextPayload['identity'] = {};

  if (typeof identity.userId === 'string' && identity.userId.trim()) {
    identityOut.userId = identity.userId.trim();
  }
  if (typeof identity.email === 'string' && identity.email.trim()) {
    identityOut.email = identity.email.trim();
  }
  if (typeof identity.displayName === 'string' && identity.displayName.trim()) {
    identityOut.displayName = identity.displayName.trim();
  }
  if (typeof identity.age === 'number' && Number.isFinite(identity.age)) {
    identityOut.age = identity.age;
  }
  if (typeof identity.dateOfBirth === 'string' && identity.dateOfBirth.trim()) {
    identityOut.dateOfBirth = identity.dateOfBirth.trim();
  }
  if (typeof identity.isMinor === 'boolean') {
    identityOut.isMinor = identity.isMinor;
  }
  if (Array.isArray(identity.teamNames) && identity.teamNames.length > 0) {
    identityOut.teamNames = identity.teamNames.filter(
      (v): v is string => typeof v === 'string' && v.trim().length > 0,
    );
  }
  if (Array.isArray(identity.rosterDetails) && identity.rosterDetails.length > 0) {
    identityOut.rosterDetails = identity.rosterDetails.filter(
      (v): v is string => typeof v === 'string' && v.trim().length > 0,
    );
  }
  if (Array.isArray(identity.chatMessages) && identity.chatMessages.length > 0) {
    identityOut.chatMessages = identity.chatMessages.filter(
      (v): v is string => typeof v === 'string' && v.trim().length > 0,
    );
  }

  return {
    objectives: context.objectives,
    age: context.age ?? null,
    tier: context.tier,
    progress: context.progress,
    purchaseHistory: context.purchaseHistory,
    identity: identityOut,
    candidates: candidates.map((c) => ({
      id: c.id,
      title: c.title,
      matchScore: c.matchScore,
      skills: c.skills ?? [],
      objectives: c.objectives ?? [],
    })),
  };
}

/** True when a payload object has no secret-looking keys (recursive). */
export function providerPayloadHasNoSecrets(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return true;
  if (Array.isArray(value)) {
    return value.every((item) => providerPayloadHasNoSecrets(item));
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(key)) return false;
    if (!providerPayloadHasNoSecrets(child)) return false;
  }
  return true;
}

export function parseLlmRerankResult(raw: unknown): LlmRerankResult | null {
  const parsed = llmRerankResultSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * AC-2 — apply LLM rankings to metadata candidates; attach why copy.
 * Unknown ids are skipped; missing slots filled from original metadata order.
 */
export function applyLlmRerank(
  candidates: PackageRecommendation[],
  llmResult: LlmRerankResult,
  limit = LLM_TOP_K,
): PackageRecommendation[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const used = new Set<string>();
  const out: PackageRecommendation[] = [];

  for (const row of llmResult.rankings) {
    if (out.length >= limit) break;
    const base = byId.get(row.id);
    if (!base || used.has(row.id)) continue;
    used.add(row.id);
    out.push({
      ...base,
      why: row.why,
    });
  }

  for (const candidate of candidates) {
    if (out.length >= limit) break;
    if (used.has(candidate.id)) continue;
    used.add(candidate.id);
    out.push({ ...candidate });
  }

  return out;
}

/**
 * Prefer LLM re-rank when valid; otherwise keep metadata order (graceful fallback).
 */
export function finalizeRecommendations(
  metadataRanked: PackageRecommendation[],
  llmRaw: unknown | null,
  limit = LLM_TOP_K,
): PackageRecommendation[] {
  const pool = metadataRanked.slice(0, Math.max(limit, LLM_CANDIDATE_POOL));
  if (llmRaw == null) {
    return pool.slice(0, limit);
  }
  const parsed = parseLlmRerankResult(llmRaw);
  if (!parsed) {
    return pool.slice(0, limit);
  }
  return applyLlmRerank(pool, parsed, limit);
}

export function buildRerankPrompt(payload: ProviderContextPayload): string {
  return [
    'You are Coach360 package recommendation assistant.',
    'Re-rank the candidate marketplace packages for this coach/player context.',
    'Return the top 3 package ids from the candidates list only, each with a short why explanation.',
    'Respect business rules: do not suggest owned packages; respect tier and age already filtered.',
    'Context JSON:',
    JSON.stringify(payload),
  ].join('\n');
}
