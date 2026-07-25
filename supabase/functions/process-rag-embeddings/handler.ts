/**
 * STORY-11.4 — pure RAG embedding job helpers (Deno edge + vitest).
 */

export type RagDrillMeta = {
  title?: string | null;
  skills?: string[] | null;
  instructions?: string | null;
};

export type RagJobPayload = {
  title?: string | null;
  description?: string | null;
  skills?: string[] | null;
  tags?: string[] | null;
  objectives?: string[] | null;
  module_ids?: string[] | null;
  drills?: RagDrillMeta[] | null;
};

export type RagEmbeddingJobRow = {
  id: string;
  sanity_document_id: string;
  status: 'pending' | 'processing' | 'done' | 'canceled' | 'failed';
  payload: RagJobPayload;
};

function asNonEmptyStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * AC-1 — flatten title, description, tags/skills, and drill metadata into embed text.
 * Mirrors packages/domain/src/recommendations/rag.ts (keep in sync for Deno).
 */
export function buildPackageEmbeddingDocument(payload: RagJobPayload): string {
  const title = (payload.title || '').trim() || 'Untitled package';
  const description = (payload.description || '').trim();
  const tags = asNonEmptyStrings([...(payload.skills ?? []), ...(payload.tags ?? [])]);
  const objectives = asNonEmptyStrings(payload.objectives);
  const moduleIds = asNonEmptyStrings(payload.module_ids);

  const drillParts: string[] = [];
  for (const drill of payload.drills ?? []) {
    if (!drill || typeof drill !== 'object') continue;
    const drillTitle = (drill.title || '').trim();
    const drillSkills = asNonEmptyStrings(drill.skills);
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

export type ProcessRagJobResult =
  | {
      ok: true;
      jobId: string;
      sanityDocumentId: string;
      contentText: string;
      status: 'done';
    }
  | {
      ok: false;
      jobId: string;
      sanityDocumentId: string;
      reason: string;
      status: 'failed' | 'canceled' | 'skipped';
    };

/** Validate + prepare a claimed job for embedding (no network). */
export function prepareRagEmbeddingJob(job: RagEmbeddingJobRow): ProcessRagJobResult & {
  contentText?: string;
} {
  if (job.status === 'canceled') {
    return {
      ok: false,
      jobId: job.id,
      sanityDocumentId: job.sanity_document_id,
      reason: 'canceled',
      status: 'canceled',
    };
  }
  if (!job.sanity_document_id?.trim()) {
    return {
      ok: false,
      jobId: job.id,
      sanityDocumentId: job.sanity_document_id || '',
      reason: 'missing_document_id',
      status: 'failed',
    };
  }
  const contentText = buildPackageEmbeddingDocument(job.payload ?? {});
  if (!contentText.trim()) {
    return {
      ok: false,
      jobId: job.id,
      sanityDocumentId: job.sanity_document_id,
      reason: 'empty_document',
      status: 'failed',
    };
  }
  return {
    ok: true,
    jobId: job.id,
    sanityDocumentId: job.sanity_document_id,
    contentText,
    status: 'done',
  };
}

/** Format a float embedding array for pgvector insert (`[1,2,3]` literal). */
export function formatPgvectorLiteral(embedding: number[]): string {
  return `[${embedding.map((n) => (Number.isFinite(n) ? n : 0)).join(',')}]`;
}
