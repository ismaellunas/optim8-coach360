/**
 * STORY-12.4 AC-3 — admin-configurable AI recommendation parameters.
 */

import { LLM_CANDIDATE_POOL, LLM_TOP_K } from './rerank.js';
import { clampRagTopK, RAG_TOP_K_DEFAULT } from './rag.js';

export const AI_RECOMMENDATION_CONFIG_SETTING_KEY = 'ai_recommendation_config';

export type AiRecommendationConfig = {
  llmTopK: number;
  candidatePool: number;
  ragTopK: number;
  llmRerankEnabled: boolean;
};

export const DEFAULT_AI_RECOMMENDATION_CONFIG: AiRecommendationConfig = {
  llmTopK: LLM_TOP_K,
  candidatePool: LLM_CANDIDATE_POOL,
  ragTopK: RAG_TOP_K_DEFAULT,
  llmRerankEnabled: true,
};

function asInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return fallback;
}

function clampPositive(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Parse / normalize AI recommendation config from platform_settings JSON.
 * - ragTopK clamped to [RAG_TOP_K_MIN, RAG_TOP_K_MAX]
 * - candidatePool >= llmTopK
 * - garbage input falls back to defaults
 */
export function parseAiRecommendationConfig(raw: unknown): AiRecommendationConfig {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_AI_RECOMMENDATION_CONFIG };
  }

  const row = raw as Record<string, unknown>;
  const llmTopK = clampPositive(
    asInt(row.llmTopK ?? row.llm_top_k, DEFAULT_AI_RECOMMENDATION_CONFIG.llmTopK),
    1,
    20,
  );
  let candidatePool = clampPositive(
    asInt(
      row.candidatePool ?? row.candidate_pool,
      DEFAULT_AI_RECOMMENDATION_CONFIG.candidatePool,
    ),
    1,
    50,
  );
  if (candidatePool < llmTopK) {
    candidatePool = llmTopK;
  }

  const ragTopK = clampRagTopK(
    asInt(row.ragTopK ?? row.rag_top_k, DEFAULT_AI_RECOMMENDATION_CONFIG.ragTopK),
  );

  const llmRerankEnabled =
    typeof (row.llmRerankEnabled ?? row.llm_rerank_enabled) === 'boolean'
      ? Boolean(row.llmRerankEnabled ?? row.llm_rerank_enabled)
      : DEFAULT_AI_RECOMMENDATION_CONFIG.llmRerankEnabled;

  return {
    llmTopK,
    candidatePool,
    ragTopK,
    llmRerankEnabled,
  };
}

/** Snake_case shape stored in platform_settings / returned by RPCs. */
export function normalizeAiRecommendationConfigInput(
  config: AiRecommendationConfig,
): Record<string, unknown> {
  const parsed = parseAiRecommendationConfig(config);
  return {
    llm_top_k: parsed.llmTopK,
    candidate_pool: parsed.candidatePool,
    rag_top_k: parsed.ragTopK,
    llm_rerank_enabled: parsed.llmRerankEnabled,
  };
}
