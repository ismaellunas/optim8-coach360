// STORY-11.2 — Metadata-based package recommendations (Phase 1)

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FEATURE_TIER_REQUIREMENTS,
  passesHardFilters,
  rankPackageRecommendations,
  recommendationContextSchema,
  scorePackageMatch,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const DOMAIN_RANK = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'recommendations',
  'rank.ts',
);
const DOMAIN_SCHEMA = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'recommendations',
  'schema.ts',
);
const EDGE_HANDLER = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'recommend-packages',
  'handler.ts',
);
const EDGE_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'recommend-packages',
  'index.ts',
);
const REPO_PORT = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'package-recommendations-repository.ts',
);
const SUPABASE_REPO = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-package-recommendations-repository.ts',
);
const DI_PATH = path.join(REPO_ROOT, 'packages', 'api', 'src', 'di', 'create-repositories.ts');
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
const OBJECTIVES_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'objectives',
  'ui',
  'ObjectivesScreen.jsx',
);

const CATALOG = [
  {
    id: 'pkg-shooting',
    title: 'Elite Shooting System',
    description: 'Form and free throws',
    skills: ['shooting', 'form'],
    objectives: ['Improve shooting percentage'],
    ageMin: 12,
    ageMax: 18,
    published: true,
  },
  {
    id: 'pkg-defense',
    title: 'Lockdown Defense',
    description: 'On-ball pressure',
    skills: ['defense', 'footwork'],
    objectives: ['Improve on-ball pressure'],
    ageMin: 13,
    ageMax: 17,
    published: true,
  },
  {
    id: 'pkg-vision',
    title: 'Court Vision Mastery',
    description: 'Decision-making',
    skills: ['conditioning', 'vision', 'passing'],
    objectives: ['Improve decision speed'],
    ageMin: 14,
    ageMax: 18,
    published: true,
  },
  {
    id: 'pkg-pro-only',
    title: 'Pro Analytics Pack',
    skills: ['analytics'],
    objectives: ['Advanced metrics'],
    ageMin: 14,
    ageMax: 18,
    minTier: 'pro',
    published: true,
  },
  {
    id: 'pkg-unpublished',
    title: 'Hidden Draft',
    skills: ['shooting'],
    objectives: ['secret'],
    published: false,
  },
];

describe('STORY_11_2 AC1 — Recommendation API accepts context: objectives, age, tier, purchase history', () => {
  it('test_STORY_11_2_AC1_recommendation_api_accepts_context: schema + edge parse + invoke', () => {
    const parsed = recommendationContextSchema.parse({
      objectives: ['shooting', 'defense'],
      age: { min: 14, max: 16 },
      tier: 'pro',
      purchaseHistory: ['pkg-owned'],
    });
    expect(parsed.objectives).toEqual(['shooting', 'defense']);
    expect(parsed.age).toEqual({ min: 14, max: 16 });
    expect(parsed.tier).toBe('pro');
    expect(parsed.purchaseHistory).toEqual(['pkg-owned']);

    const schemaSrc = readFileSync(DOMAIN_SCHEMA, 'utf8');
    expect(schemaSrc).toMatch(/recommendationContextSchema/);
    expect(schemaSrc).toMatch(/objectives/);
    expect(schemaSrc).toMatch(/purchaseHistory/);

    const handler = readFileSync(EDGE_HANDLER, 'utf8');
    expect(handler).toMatch(/parseRecommendationContext/);
    expect(handler).toMatch(/objectives/);
    expect(handler).toMatch(/purchaseHistory/);

    const index = readFileSync(EDGE_INDEX, 'utf8');
    expect(index).toMatch(/parseRecommendationContext/);
    expect(index).toMatch(/rankPackageRecommendations/);
    expect(index).toMatch(/feature:\s*['"]ai['"]/);

    const port = readFileSync(REPO_PORT, 'utf8');
    expect(port).toMatch(/listRecommendations/);
    const supabaseRepo = readFileSync(SUPABASE_REPO, 'utf8');
    expect(supabaseRepo).toMatch(/functions\.invoke\(['"]recommend-packages['"]/);
    const di = readFileSync(DI_PATH, 'utf8');
    expect(di).toMatch(/packageRecommendations/);
  });
});

describe('STORY_11_2 AC2 — Hard filters exclude owned packages and ineligible tiers', () => {
  it('test_STORY_11_2_AC2_hard_filters_owned_and_ineligible_tiers: owned + minTier excluded', () => {
    expect(FEATURE_TIER_REQUIREMENTS.ai).toEqual({
      coach: 'pro',
      player: 'pro',
      team: 'pro',
    });

    const context = {
      objectives: ['shooting'],
      age: { min: 14, max: 16 },
      tier: 'basic',
      purchaseHistory: ['pkg-shooting'],
    };

    expect(passesHardFilters(CATALOG[0], context)).toBe(false); // owned
    expect(passesHardFilters(CATALOG[3], context)).toBe(false); // pro-only vs basic
    expect(passesHardFilters(CATALOG[4], context)).toBe(false); // unpublished
    expect(passesHardFilters(CATALOG[1], context)).toBe(true);

    const ranked = rankPackageRecommendations(CATALOG, {
      ...context,
      tier: 'basic',
    });
    expect(ranked.map((r) => r.id)).not.toContain('pkg-shooting');
    expect(ranked.map((r) => r.id)).not.toContain('pkg-pro-only');
    expect(ranked.map((r) => r.id)).not.toContain('pkg-unpublished');

    const rankSrc = readFileSync(DOMAIN_RANK, 'utf8');
    expect(rankSrc).toMatch(/passesHardFilters/);
    expect(rankSrc).toMatch(/purchaseHistory/);
    expect(rankSrc).toMatch(/minTier/);
  });
});

describe('STORY_11_2 AC3 — Top 3 packages returned with match score', () => {
  it('test_STORY_11_2_AC3_top_3_with_match_score: ranked length and scores', () => {
    const context = recommendationContextSchema.parse({
      objectives: ['shooting', 'Improve shooting percentage'],
      age: { min: 14, max: 16 },
      tier: 'pro',
      purchaseHistory: [],
    });

    const ranked = rankPackageRecommendations(CATALOG, context, 3);
    expect(ranked.length).toBeLessThanOrEqual(3);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].id).toBe('pkg-shooting');
    for (const row of ranked) {
      expect(row.matchScore).toBeGreaterThanOrEqual(0);
      expect(row.matchScore).toBeLessThanOrEqual(1);
      expect(typeof row.title).toBe('string');
    }
    // Descending scores
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1].matchScore).toBeGreaterThanOrEqual(ranked[i].matchScore);
    }

    const shootingScore = scorePackageMatch(CATALOG[0], context);
    const defenseScore = scorePackageMatch(CATALOG[1], context);
    expect(shootingScore).toBeGreaterThan(defenseScore);

    const index = readFileSync(EDGE_INDEX, 'utf8');
    expect(index).toMatch(/rankPackageRecommendations\(candidates,\s*context,\s*3\)/);
  });
});

describe('STORY_11_2 AC4 — Suggestions surface on marketplace and objectives screens', () => {
  it('test_STORY_11_2_AC4_suggestions_on_marketplace_and_objectives: UI wires recommendations', () => {
    const store = readFileSync(STORE_UI, 'utf8');
    expect(store).toMatch(/marketplace-suggestions/);
    expect(store).toMatch(/packageRecommendations\.listRecommendations/);
    expect(store).toMatch(/canAccess\(user,\s*['"]ai['"]\)/);
    expect(store).toMatch(/suggestion-match-score/);

    const objectives = readFileSync(OBJECTIVES_UI, 'utf8');
    expect(objectives).toMatch(/objectives-suggestions/);
    expect(objectives).toMatch(/packageRecommendations\.listRecommendations/);
    expect(objectives).toMatch(/suggestion-match-score/);
  });
});
