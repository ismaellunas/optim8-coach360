// STORY-9.5 — Sanity webhook sync to Supabase + mobile Sanity catalog.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  dripLabelFromSchedule,
  mapSanityPackageToCatalog,
  primarySkillTag,
  PUBLISHED_PACKAGES_GROQ,
} from '@coach360/domain';
import {
  encodeSanityWebhookSignature,
  mapSanityWebhookPayload,
  verifySanityWebhookSignature,
} from '../../supabase/functions/sanity-webhook/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const HANDLER = path.join(REPO_ROOT, 'supabase', 'functions', 'sanity-webhook', 'handler.ts');
const INDEX = path.join(REPO_ROOT, 'supabase', 'functions', 'sanity-webhook', 'index.ts');
const PROJECTION = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'sanity-webhook',
  'webhook-projection.groq',
);
const MIGRATION = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260723000000_sanity_package_metadata_sync.sql',
);
const SANITY_REPO = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'sanity',
  'sanity-marketplace-catalog-repository.ts',
);
const STORE_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'marketplace',
  'ui',
  'StoreScreen.jsx',
);
const APP_PROVIDERS = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'app',
  'providers',
  'AppProviders.jsx',
);

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

const publishedDoc = {
  _id: 'seed.coach360.elite-shooting.package',
  _type: 'trainingPackage',
  title: 'Elite Shooting System',
  description: 'Progressive shooting program',
  skills: ['shooting', 'form'],
  ageRange: { min: 12, max: 18 },
  objectives: ['Improve shooting percentage'],
  stripePriceId: null,
  dripSchedule: { intervalDays: 7 },
  status: 'approved',
  published: true,
  modules: [{ _ref: 'seed.coach360.elite-shooting.module' }],
};

describe('STORY_9_5 AC1 — Sanity webhook fires on document publish event', () => {
  it('test_STORY_9_5_AC1_publish_payload_accepted', async () => {
    expect(existsSync(HANDLER)).toBe(true);
    expect(existsSync(INDEX)).toBe(true);
    expect(existsSync(PROJECTION)).toBe(true);

    const projection = read(PROJECTION);
    expect(projection).toMatch(/_type == "trainingPackage"/);
    expect(projection).toMatch(/published/);

    const indexSrc = read(INDEX);
    expect(indexSrc).toMatch(/mapSanityWebhookPayload/);
    expect(indexSrc).toMatch(/SANITY_WEBHOOK_SECRET/);
    expect(indexSrc).toMatch(/SANITY_SIGNATURE_HEADER/);
    expect(indexSrc).toMatch(/verifySanityWebhookSignature/);

    const raw = JSON.stringify(publishedDoc);
    const secret = 'test-sanity-webhook-secret';
    const signature = await encodeSanityWebhookSignature(raw, secret);
    expect(
      await verifySanityWebhookSignature({
        rawBody: raw,
        signatureHeader: signature,
        secret,
      }),
    ).toBe(true);
    expect(
      await verifySanityWebhookSignature({
        rawBody: raw,
        signatureHeader: signature,
        secret: 'wrong',
      }),
    ).toBe(false);

    const mapped = mapSanityWebhookPayload(publishedDoc, {
      idempotencyKey: 'evt-publish-1',
    });
    expect(mapped.kind).toBe('upsert_and_queue');
  });
});

describe('STORY_9_5 AC2 — Edge function upserts package metadata to Supabase', () => {
  it('test_STORY_9_5_AC2_upserts_package_metadata', () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.package_metadata/);
    expect(sql).toMatch(/sanity_document_id text primary key/);

    const mapped = mapSanityWebhookPayload(publishedDoc);
    expect(mapped.kind).toBe('upsert_and_queue');
    expect(mapped.metadata).toEqual({
      sanity_document_id: 'seed.coach360.elite-shooting.package',
      title: 'Elite Shooting System',
      description: 'Progressive shooting program',
      skills: ['shooting', 'form'],
      age_min: 12,
      age_max: 18,
      objectives: ['Improve shooting percentage'],
      stripe_price_id: null,
      drip_schedule: { intervalDays: 7 },
      workflow_status: 'approved',
      published: true,
      module_ids: ['seed.coach360.elite-shooting.module'],
    });

    const indexSrc = read(INDEX);
    expect(indexSrc).toMatch(/from\('package_metadata'\)\.upsert/);
  });
});

describe('STORY_9_5 AC3 — RAG embedding job queued for published packages', () => {
  it('test_STORY_9_5_AC3_queues_rag_embedding_job', () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.rag_embedding_jobs/);
    expect(sql).toMatch(/rag_embedding_job_status/);

    const published = mapSanityWebhookPayload(publishedDoc);
    expect(published.kind).toBe('upsert_and_queue');
    expect(published.ragJob).toMatchObject({
      sanity_document_id: 'seed.coach360.elite-shooting.package',
      status: 'pending',
    });

    const unpublished = mapSanityWebhookPayload({
      ...publishedDoc,
      published: false,
    });
    expect(unpublished.kind).toBe('upsert_only');
    expect(unpublished.reason).toBe('unpublished');

    const indexSrc = read(INDEX);
    expect(indexSrc).toMatch(/from\('rag_embedding_jobs'\)\.insert/);
  });
});

describe('STORY_9_5 AC4 — Mobile app reads published content via Sanity CDN/API', () => {
  it('test_STORY_9_5_AC4_mobile_reads_sanity_cdn', () => {
    expect(existsSync(SANITY_REPO)).toBe(true);
    expect(existsSync(STORE_UI)).toBe(true);

    const sanityRepo = read(SANITY_REPO);
    expect(sanityRepo).toMatch(/listPublished/);
    expect(sanityRepo).toMatch(/apicdn\.sanity\.io|api\.sanity\.io/);
    expect(sanityRepo).toMatch(/PUBLISHED_PACKAGES_GROQ|published == true/);

    expect(PUBLISHED_PACKAGES_GROQ).toMatch(/trainingPackage/);
    expect(PUBLISHED_PACKAGES_GROQ).toMatch(/published == true/);

    const store = read(STORE_UI);
    expect(store).toMatch(/marketplaceCatalog\.listPublished/);
    expect(store).toMatch(/export function StoreScreen/);

    const providers = read(APP_PROVIDERS);
    expect(providers).toMatch(/sanity:/);
    expect(providers).toMatch(/VITE_SANITY|sanityProjectId|projectId/);

    // Trial coaches must get readonly browse via accessLevel(role, tier), not a
    // mistaken featureAccessLevel(user, feature) call (would lock Store).
    expect(store).toMatch(/accessLevel\(user,\s*['"]browseMarketplace['"]\)/);
    expect(store).not.toMatch(/featureAccessLevel\(user,/);
    expect(store).toMatch(/canAccess\(user,\s*['"]ai['"]\)/);
    expect(store).not.toMatch(/checkFeatureAccess\(user,/);

    const mapped = mapSanityPackageToCatalog({
      _id: 'pkg-1',
      title: 'Elite Shooting System',
      skills: ['shooting'],
      dripSchedule: { intervalDays: 7 },
      moduleCount: 1,
    });
    expect(mapped?.tag).toBe('shooting');
    expect(primarySkillTag(['defense'])).toBe('defense');
    expect(dripLabelFromSchedule({ intervalDays: 7 })).toBe('1 week');
  });
});
