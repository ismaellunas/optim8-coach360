// STORY-11.3 — Mistral AI integration via Vercel AI SDK (LLM re-rank)

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FEATURE_TIER_REQUIREMENTS,
  applyLlmRerank,
  buildProviderContextPayload,
  finalizeRecommendations,
  packageRecommendationSchema,
  providerPayloadHasNoSecrets,
  rankPackageRecommendations,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const DOMAIN_RERANK = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'recommendations',
  'rerank.ts',
);
const DOMAIN_SCHEMA = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'recommendations',
  'schema.ts',
);
const EDGE_MISTRAL = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'recommend-packages',
  'mistral.ts',
);
const EDGE_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'recommend-packages',
  'index.ts',
);
const EDGE_HANDLER = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'recommend-packages',
  'handler.ts',
);
const ENV_EXAMPLE = path.join(REPO_ROOT, '.env.example');

const CANDIDATES = [
  {
    id: 'pkg-shooting',
    title: 'Elite Shooting System',
    matchScore: 0.9,
    skills: ['shooting'],
    objectives: ['Improve shooting'],
  },
  {
    id: 'pkg-defense',
    title: 'Lockdown Defense',
    matchScore: 0.8,
    skills: ['defense'],
    objectives: ['Improve defense'],
  },
  {
    id: 'pkg-vision',
    title: 'Court Vision Mastery',
    matchScore: 0.7,
    skills: ['vision'],
    objectives: ['Improve decisions'],
  },
  {
    id: 'pkg-conditioning',
    title: 'Conditioning Base',
    matchScore: 0.6,
    skills: ['conditioning'],
    objectives: ['Build stamina'],
  },
];

describe('STORY_11_3 AC1 — Mistral API integrated through Vercel AI SDK', () => {
  it('test_STORY_11_3_AC1_mistral_via_vercel_ai_sdk: createMistral + generateObject wiring', () => {
    const mistralSrc = readFileSync(EDGE_MISTRAL, 'utf8');
    expect(mistralSrc).toMatch(/@ai-sdk\/mistral/);
    expect(mistralSrc).toMatch(/createMistral/);
    expect(mistralSrc).toMatch(/generateText/);
    expect(mistralSrc).toMatch(/Output\.object/);
    expect(mistralSrc).toMatch(/from ['"]npm:ai/);
    expect(mistralSrc).toMatch(/MISTRAL_API_KEY/);
    expect(mistralSrc).toMatch(/rerankPackagesWithMistral/);

    const index = readFileSync(EDGE_INDEX, 'utf8');
    expect(index).toMatch(/rerankPackagesWithMistral/);
    expect(index).toMatch(/from ['"]\.\/mistral\.ts['"]/);

    const envExample = readFileSync(ENV_EXAMPLE, 'utf8');
    expect(envExample).toMatch(/MISTRAL_API_KEY/);
    expect(envExample).not.toMatch(/VITE_MISTRAL/);
  });
});

describe('STORY_11_3 AC2 — Recommendation endpoint re-ranks top candidates and generates why copy', () => {
  it('test_STORY_11_3_AC2_rerank_and_why_copy: applyLlmRerank + schema why', () => {
    const reranked = applyLlmRerank(CANDIDATES, {
      rankings: [
        { id: 'pkg-vision', why: 'Matches decision-making objective' },
        { id: 'pkg-shooting', why: 'Strong shooting skill overlap' },
        { id: 'pkg-defense', why: 'Secondary defensive need' },
      ],
    });

    expect(reranked.map((r) => r.id)).toEqual([
      'pkg-vision',
      'pkg-shooting',
      'pkg-defense',
    ]);
    expect(reranked[0].why).toBe('Matches decision-making objective');
    expect(reranked[1].why).toBe('Strong shooting skill overlap');

    const parsed = packageRecommendationSchema.parse({
      id: 'pkg-vision',
      title: 'Court Vision Mastery',
      matchScore: 0.7,
      skills: ['vision'],
      objectives: ['Improve decisions'],
      why: 'Matches decision-making objective',
    });
    expect(parsed.why).toBe('Matches decision-making objective');

    const fallback = finalizeRecommendations(CANDIDATES, null, 3);
    expect(fallback.map((r) => r.id)).toEqual([
      'pkg-shooting',
      'pkg-defense',
      'pkg-vision',
    ]);
    expect(fallback.every((r) => r.why === undefined)).toBe(true);

    const index = readFileSync(EDGE_INDEX, 'utf8');
    expect(index).toMatch(/finalizeRecommendations/);
    expect(index).toMatch(/LLM_CANDIDATE_POOL/);

    const schemaSrc = readFileSync(DOMAIN_SCHEMA, 'utf8');
    expect(schemaSrc).toMatch(/\bwhy\b/);
    expect(readFileSync(DOMAIN_RERANK, 'utf8')).toMatch(/applyLlmRerank/);
  });
});

describe('STORY_11_3 AC3 — AI calls blocked for users below Pro tier', () => {
  it('test_STORY_11_3_AC3_ai_blocked_below_pro: gate before Mistral', () => {
    expect(FEATURE_TIER_REQUIREMENTS.ai).toEqual({
      coach: 'pro',
      player: 'pro',
      team: 'pro',
    });

    const index = readFileSync(EDGE_INDEX, 'utf8');
    const gateIdx = index.indexOf("feature: 'ai'");
    const mistralCallIdx = index.indexOf('await rerankPackagesWithMistral');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(mistralCallIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(mistralCallIdx);

    // Gate failure returns before LLM — requireFeatureAccess denial path still present.
    expect(index).toMatch(/featureAccessDeniedResponse/);
    expect(index).toMatch(/requireFeatureAccess/);
    // Import of Mistral helper is fine at top; call must remain after the gate.
    expect(index).toMatch(/from ['"]\.\/mistral\.ts['"]/);
  });
});

describe('STORY_11_3 AC4 — PII sent to provider complies with OQ-6.7 privacy decision', () => {
  it('test_STORY_11_3_AC4_provider_payload_oq_6_7: allowlist only, no secrets', () => {
    const context = {
      objectives: ['Improve shooting'],
      age: { min: 14, max: 16 },
      tier: 'pro',
      purchaseHistory: ['pkg-owned'],
      progress: { weakAreas: ['defense'], completionRate: 0.3 },
    };

    const payload = buildProviderContextPayload(
      context,
      CANDIDATES.slice(0, 3),
      {
        userId: 'user-1',
        email: 'coach@example.com',
        displayName: 'Alex Coach',
        age: 15,
        dateOfBirth: '2011-01-01',
        isMinor: true,
        teamNames: ['U16 Lions'],
        rosterDetails: ['Player A', 'Player B'],
        chatMessages: ['Need help with free throws'],
      },
      {
        stripeSecret: 'sk_test_SHOULD_NOT_APPEAR',
        STRIPE_SECRET_KEY: 'sk_live_nope',
        MISTRAL_API_KEY: 'secret-key',
        service_role: 'eyJhbGciOi...',
      },
    );

    expect(payload.identity.userId).toBe('user-1');
    expect(payload.identity.email).toBe('coach@example.com');
    expect(payload.identity.displayName).toBe('Alex Coach');
    expect(payload.identity.age).toBe(15);
    expect(payload.identity.dateOfBirth).toBe('2011-01-01');
    expect(payload.identity.isMinor).toBe(true);
    expect(payload.identity.teamNames).toEqual(['U16 Lions']);
    expect(payload.identity.rosterDetails).toEqual(['Player A', 'Player B']);
    expect(payload.identity.chatMessages).toEqual(['Need help with free throws']);
    expect(payload.objectives).toEqual(['Improve shooting']);
    expect(payload.progress?.weakAreas).toEqual(['defense']);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('sk_test_SHOULD_NOT_APPEAR');
    expect(serialized).not.toContain('STRIPE_SECRET_KEY');
    expect(serialized).not.toContain('secret-key');
    expect(serialized).not.toContain('service_role');
    expect(providerPayloadHasNoSecrets(payload)).toBe(true);

    expect(
      providerPayloadHasNoSecrets({
        identity: { userId: 'x' },
        stripeSecret: 'sk_test',
      }),
    ).toBe(false);

    const handler = readFileSync(EDGE_HANDLER, 'utf8');
    expect(handler).toMatch(/buildProviderContextPayload/);
    expect(readFileSync(DOMAIN_RERANK, 'utf8')).toMatch(/OQ-6\.7/);
  });
});

describe('STORY_11_3 — metadata ranking still available as LLM input pool', () => {
  it('test_STORY_11_3_metadata_pool_feeds_rerank: rank then finalize', () => {
    const catalog = [
      {
        id: 'pkg-a',
        title: 'A Shooting',
        skills: ['shooting'],
        objectives: ['shooting'],
        published: true,
      },
      {
        id: 'pkg-b',
        title: 'B Defense',
        skills: ['defense'],
        objectives: ['defense'],
        published: true,
      },
      {
        id: 'pkg-c',
        title: 'C Vision',
        skills: ['vision'],
        objectives: ['vision'],
        published: true,
      },
    ];
    const ranked = rankPackageRecommendations(
      catalog,
      {
        objectives: ['shooting'],
        tier: 'pro',
        purchaseHistory: [],
      },
      8,
    );
    const withWhy = finalizeRecommendations(ranked, {
      rankings: [{ id: ranked[0].id, why: 'Best objective match' }],
    });
    expect(withWhy).toHaveLength(3);
    expect(withWhy[0].why).toBe('Best objective match');
  });
});
