// STORY-11.4 — RAG pipeline: ingest, Mistral embeddings, pgvector, retrieval

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RAG_TOP_K_DEFAULT,
  RAG_TOP_K_MAX,
  RAG_TOP_K_MIN,
  buildPackageEmbeddingDocument,
  buildRecommendationQueryText,
  clampRagTopK,
  mapSimilarityRowsToRecommendations,
  similarityToMatchScore,
} from '@coach360/domain';
import {
  buildPackageEmbeddingDocument as edgeBuildDoc,
  formatPgvectorLiteral,
  prepareRagEmbeddingJob,
} from '../../supabase/functions/process-rag-embeddings/handler.ts';
import {
  drillsFromDoc,
  mapSanityWebhookPayload,
} from '../../supabase/functions/sanity-webhook/handler.ts';
import {
  clampRagTopK as edgeClampRagTopK,
  mapSimilarityRowsToRecommendations as edgeMapSimilarity,
} from '../../supabase/functions/recommend-packages/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const DOMAIN_RAG = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'recommendations', 'rag.ts');
const MIGRATION = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260725120000_package_embeddings_pgvector.sql',
);
const PROCESS_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'process-rag-embeddings',
  'index.ts',
);
const PROCESS_MISTRAL = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'process-rag-embeddings',
  'mistral-embed.ts',
);
const PROCESS_HANDLER = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'process-rag-embeddings',
  'handler.ts',
);
const WEBHOOK_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'sanity-webhook',
  'index.ts',
);
const WEBHOOK_HANDLER = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'sanity-webhook',
  'handler.ts',
);
const WEBHOOK_GROQ = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'sanity-webhook',
  'webhook-projection.groq',
);
const RECOMMEND_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'recommend-packages',
  'index.ts',
);
const RECOMMEND_MISTRAL = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'recommend-packages',
  'mistral.ts',
);
const ENV_EXAMPLE = path.join(REPO_ROOT, '.env.example');
const PACKAGE_JSON = path.join(REPO_ROOT, 'package.json');

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

const INGEST_FIXTURE = {
  title: 'Elite Shooting System',
  description: 'Form and range shooting progression.',
  skills: ['shooting', 'form'],
  tags: ['offense'],
  objectives: ['Improve shooting'],
  moduleIds: ['mod-1', 'mod-2'],
  drills: [
    {
      title: 'Catch and Shoot',
      skills: ['catch', 'release'],
      instructions: 'Square up and shoot in under 2 seconds.',
    },
  ],
};

describe('STORY_11_4 AC1 — Published packages ingested with title, description, tags, drill metadata', () => {
  it('test_STORY_11_4_AC1_ingest_title_description_tags_drill_metadata', () => {
    expect(existsSync(DOMAIN_RAG)).toBe(true);

    const doc = buildPackageEmbeddingDocument(INGEST_FIXTURE);
    expect(doc).toMatch(/Title: Elite Shooting System/);
    expect(doc).toMatch(/Description: Form and range/);
    expect(doc).toMatch(/Tags:.*shooting/);
    expect(doc).toMatch(/Tags:.*offense/);
    expect(doc).toMatch(/Drill: Catch and Shoot/);
    expect(doc).toMatch(/Drill skills:.*catch/);
    expect(doc).toMatch(/Instructions: Square up/);

    const edgeDoc = edgeBuildDoc({
      title: INGEST_FIXTURE.title,
      description: INGEST_FIXTURE.description,
      skills: INGEST_FIXTURE.skills,
      tags: INGEST_FIXTURE.tags,
      objectives: INGEST_FIXTURE.objectives,
      module_ids: INGEST_FIXTURE.moduleIds,
      drills: INGEST_FIXTURE.drills,
    });
    expect(edgeDoc).toMatch(/Title: Elite Shooting System/);
    expect(edgeDoc).toMatch(/Drill: Catch and Shoot/);

    const prepared = prepareRagEmbeddingJob({
      id: 'job-1',
      sanity_document_id: 'pkg-shooting',
      status: 'pending',
      payload: {
        title: INGEST_FIXTURE.title,
        description: INGEST_FIXTURE.description,
        skills: INGEST_FIXTURE.skills,
        drills: INGEST_FIXTURE.drills,
      },
    });
    expect(prepared.ok).toBe(true);
    expect(prepared.contentText).toMatch(/Tags:.*shooting/);
  });
});

describe('STORY_11_4 AC2 — Embeddings generated via Mistral or dedicated embedding model', () => {
  it('test_STORY_11_4_AC2_embeddings_via_mistral', () => {
    expect(existsSync(PROCESS_MISTRAL)).toBe(true);
    const embedSrc = read(PROCESS_MISTRAL);
    expect(embedSrc).toMatch(/@ai-sdk\/mistral/);
    expect(embedSrc).toMatch(/createMistral/);
    expect(embedSrc).toMatch(/embed\(/);
    expect(embedSrc).toMatch(/mistral\.embedding/);
    expect(embedSrc).toMatch(/mistral-embed/);
    expect(embedSrc).toMatch(/MISTRAL_API_KEY/);
    expect(embedSrc).toMatch(/embedTextWithMistral/);

    const processIndex = read(PROCESS_INDEX);
    expect(processIndex).toMatch(/embedTextWithMistral/);
    expect(processIndex).toMatch(/from ['"]\.\/mistral-embed\.ts['"]/);

    const recommendMistral = read(RECOMMEND_MISTRAL);
    expect(recommendMistral).toMatch(/embedTextWithMistral/);
    expect(recommendMistral).toMatch(/mistral\.embedding/);

    const envExample = read(ENV_EXAMPLE);
    expect(envExample).toMatch(/MISTRAL_EMBEDDING_MODEL/);
    expect(envExample).toMatch(/mistral-embed/);
  });
});

describe('STORY_11_4 AC3 — Vectors stored in Supabase pgvector table', () => {
  it('test_STORY_11_4_AC3_vectors_in_pgvector_table', () => {
    expect(existsSync(MIGRATION)).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create extension if not exists vector/);
    expect(sql).toMatch(/create table if not exists public\.package_embeddings/);
    expect(sql).toMatch(/extensions\.vector\(1024\)/);
    expect(sql).toMatch(/match_package_embeddings/);

    const processIndex = read(PROCESS_INDEX);
    expect(processIndex).toMatch(/from\('package_embeddings'\)\.upsert/);
    expect(processIndex).toMatch(/sanity_document_id/);
    expect(processIndex).toMatch(/content_text/);
    expect(processIndex).toMatch(/embedding/);

    expect(formatPgvectorLiteral([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
    expect(existsSync(PROCESS_HANDLER)).toBe(true);
  });
});

describe('STORY_11_4 AC4 — Query returns top 5–10 candidates by similarity', () => {
  it('test_STORY_11_4_AC4_query_top_5_to_10_by_similarity', () => {
    expect(clampRagTopK(3)).toBe(RAG_TOP_K_MIN);
    expect(clampRagTopK(12)).toBe(RAG_TOP_K_MAX);
    expect(clampRagTopK(null)).toBe(RAG_TOP_K_DEFAULT);
    expect(edgeClampRagTopK(7)).toBe(7);

    const query = buildRecommendationQueryText({
      objectives: ['Improve shooting'],
      age: { min: 14, max: 18 },
      progress: { weakAreas: ['form'] },
    });
    expect(query).toMatch(/Objectives: Improve shooting/);
    expect(query).toMatch(/Weak areas: form/);
    expect(query).toMatch(/Age range: 14-18/);

    const rows = Array.from({ length: 12 }, (_, i) => ({
      sanityDocumentId: `pkg-${i}`,
      title: `Package ${i}`,
      similarity: 1 - i * 0.05,
      skills: ['shooting'],
      objectives: ['Improve shooting'],
    }));
    const mapped = mapSimilarityRowsToRecommendations(rows, 8);
    expect(mapped).toHaveLength(8);
    expect(mapped[0].id).toBe('pkg-0');
    expect(mapped[0].matchScore).toBe(similarityToMatchScore(1));
    expect(mapped.every((r) => r.matchScore >= 0 && r.matchScore <= 1)).toBe(true);

    const edgeMapped = edgeMapSimilarity(rows, 10);
    expect(edgeMapped).toHaveLength(10);

    const sql = read(MIGRATION);
    expect(sql).toMatch(/greatest\(5,\s*least\(/);
    expect(sql).toMatch(/match_package_embeddings/);

    const recommendIndex = read(RECOMMEND_INDEX);
    expect(recommendIndex).toMatch(/match_package_embeddings/);
    expect(recommendIndex).toMatch(/embedTextWithMistral/);
    expect(recommendIndex).toMatch(/mapSimilarityRowsToRecommendations/);
    expect(recommendIndex).toMatch(/retrieval/);
    expect(recommendIndex).toMatch(/RAG_TOP_K_DEFAULT/);
  });
});

describe('STORY_11_4 AC5 — Re-index triggered on Sanity publish webhook', () => {
  it('test_STORY_11_4_AC5_reindex_on_sanity_publish_webhook', () => {
    const groq = read(WEBHOOK_GROQ);
    expect(groq).toMatch(/drills/);
    expect(groq).toMatch(/_type == "drill"/);
    expect(groq).toMatch(/instructions/);

    const published = mapSanityWebhookPayload({
      _id: 'pkg-shooting',
      _type: 'trainingPackage',
      title: 'Elite Shooting',
      description: 'Desc',
      skills: ['shooting'],
      objectives: ['Improve shooting'],
      published: true,
      modules: [{ _ref: 'mod-1' }],
      drills: [
        {
          title: 'Catch and Shoot',
          skills: ['catch'],
          instructions: 'Square up.',
        },
      ],
    });
    expect(published.kind).toBe('upsert_and_queue');
    expect(published.ragJob.payload.drills).toEqual([
      {
        title: 'Catch and Shoot',
        skills: ['catch'],
        instructions: 'Square up.',
      },
    ]);
    expect(drillsFromDoc({ drills: [{ title: 'X', skills: ['y'] }] })).toEqual([
      { title: 'X', skills: ['y'], instructions: null },
    ]);

    const webhookIndex = read(WEBHOOK_INDEX);
    expect(webhookIndex).toMatch(/from\('rag_embedding_jobs'\)\.insert/);
    expect(webhookIndex).toMatch(/process-rag-embeddings/);
    expect(webhookIndex).toMatch(/reindexTriggered/);
    expect(webhookIndex).toMatch(/from\('package_embeddings'\)[\s\S]*\.delete/);

    const processIndex = read(PROCESS_INDEX);
    expect(processIndex).toMatch(/rag_embedding_jobs/);
    expect(processIndex).toMatch(/status:\s*'processing'/);
    expect(processIndex).toMatch(/package_embeddings/);

    expect(read(WEBHOOK_HANDLER)).toMatch(/drillsFromDoc/);

    const pkg = JSON.parse(read(PACKAGE_JSON));
    expect(pkg.scripts['test:story-11.4']).toMatch(/STORY_11_4/);
  });
});
