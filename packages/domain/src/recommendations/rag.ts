/**
 * STORY-11.4 — RAG ingest + retrieval helpers (pure; Edge Functions mirror as needed).
 */

import type { AgeRange, PackageRecommendation, RecommendationContext } from './schema.js';

/** Mistral `mistral-embed` default output size. */
export const MISTRAL_EMBEDDING_DIMENSIONS = 1024;

/** AC-4 — retrieve between 5 and 10 candidates by similarity. */
export const RAG_TOP_K_MIN = 5;
export const RAG_TOP_K_MAX = 10;
export const RAG_TOP_K_DEFAULT = 8;

export type PackageEmbeddingDrillMeta = {
  title?: string | null;
  skills?: string[] | null;
  instructions?: string | null;
};

/** Fields ingested into the embedding document (AC-1). */
export type PackageEmbeddingIngestInput = {
  title: string;
  description?: string | null;
  /** Skills tags on the package (treated as tags). */
  skills?: string[] | null;
  /** Optional alias for skills. */
  tags?: string[] | null;
  objectives?: string[] | null;
  moduleIds?: string[] | null;
  drills?: PackageEmbeddingDrillMeta[] | null;
};

export type SimilarityMatchRow = {
  sanityDocumentId: string;
  title: string;
  similarity: number;
  skills?: string[];
  objectives?: string[];
};

function asNonEmptyStrings(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * AC-1 — flatten published package fields into a single embedding document.
 * Includes title, description, tags/skills, and drill metadata.
 */
export function buildPackageEmbeddingDocument(input: PackageEmbeddingIngestInput): string {
  const title = (input.title || '').trim() || 'Untitled package';
  const description = (input.description || '').trim();
  const tags = asNonEmptyStrings([...(input.skills ?? []), ...(input.tags ?? [])]);
  const objectives = asNonEmptyStrings(input.objectives ?? undefined);
  const moduleIds = asNonEmptyStrings(input.moduleIds ?? undefined);

  const drillParts: string[] = [];
  for (const drill of input.drills ?? []) {
    if (!drill || typeof drill !== 'object') continue;
    const drillTitle = (drill.title || '').trim();
    const drillSkills = asNonEmptyStrings(drill.skills ?? undefined);
    const instructions = (drill.instructions || '').trim();
    const chunk = [
      drillTitle ? `Drill: ${drillTitle}` : null,
      drillSkills.length ? `Drill skills: ${drillSkills.join(', ')}` : null,
      instructions ? `Instructions: ${instructions}` : null,
    ]
      .filter(Boolean)
      .join('. ');
    if (chunk) drillParts.push(chunk);
  }

  return [
    `Title: ${title}`,
    description ? `Description: ${description}` : null,
    tags.length ? `Tags: ${tags.join(', ')}` : null,
    objectives.length ? `Objectives: ${objectives.join(', ')}` : null,
    moduleIds.length ? `Modules: ${moduleIds.join(', ')}` : null,
    drillParts.length ? drillParts.join('\n') : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Build the query string embedded for similarity search (recommendation context). */
export function buildRecommendationQueryText(
  context: Pick<RecommendationContext, 'objectives' | 'age' | 'progress'>,
): string {
  const objectives = asNonEmptyStrings(context.objectives);
  const weakAreas = asNonEmptyStrings(context.progress?.weakAreas);
  const age = context.age as AgeRange | null | undefined;
  const agePart =
    age && (age.min != null || age.max != null)
      ? `Age range: ${age.min ?? 0}-${age.max ?? 99}`
      : null;

  return [
    objectives.length ? `Objectives: ${objectives.join(', ')}` : null,
    weakAreas.length ? `Weak areas: ${weakAreas.join(', ')}` : null,
    agePart,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Clamp requested top-k into the AC-4 window [5, 10]. */
export function clampRagTopK(requested?: number | null): number {
  if (typeof requested !== 'number' || !Number.isFinite(requested)) {
    return RAG_TOP_K_DEFAULT;
  }
  const n = Math.trunc(requested);
  if (n < RAG_TOP_K_MIN) return RAG_TOP_K_MIN;
  if (n > RAG_TOP_K_MAX) return RAG_TOP_K_MAX;
  return n;
}

/** Map cosine similarity (−1…1 or 0…1) into a 0–1 matchScore. */
export function similarityToMatchScore(similarity: number): number {
  if (!Number.isFinite(similarity)) return 0;
  // Cosine similarity from pgvector `1 - (a <=> b)` is typically in [0, 1] for normalized embeds.
  const clamped = Math.min(1, Math.max(0, similarity));
  return Math.round(clamped * 1000) / 1000;
}

/**
 * AC-4 — turn similarity rows into recommendation candidates ordered by score,
 * limited to clampRagTopK(limit).
 */
export function mapSimilarityRowsToRecommendations(
  rows: SimilarityMatchRow[],
  limit?: number | null,
): PackageRecommendation[] {
  const topK = clampRagTopK(limit);
  const ranked = rows
    .filter((row) => row.sanityDocumentId && row.title)
    .map((row) => ({
      id: row.sanityDocumentId,
      title: row.title,
      matchScore: similarityToMatchScore(row.similarity),
      skills: row.skills ?? [],
      objectives: row.objectives ?? [],
    }))
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.title.localeCompare(b.title);
    });
  return ranked.slice(0, topK);
}
