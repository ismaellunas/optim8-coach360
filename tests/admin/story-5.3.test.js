// STORY-5.3 — Admin-configurable feature gating and free content catalog.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FEATURE_TIER_REQUIREMENTS,
  applyFeatureFlagOverrides,
  isFreeAtBasicTier,
  paywallCopyForFeature,
  requiredTierForFeature,
} from '@coach360/domain';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

const MIGRATION_PATH = 'supabase/migrations/20260715120000_feature_gating.sql';
const PORT_PATH = 'packages/api/src/ports/content-repository.ts';
const SUPABASE_REPO_PATH = 'packages/api/src/adapters/supabase/supabase-content-repository.ts';
const REST_REPO_PATH = 'packages/api/src/adapters/rest/rest-content-repository.ts';
const DI_PATH = 'packages/api/src/di/create-repositories.ts';
const ADMIN_CONTENT_PATH = 'apps/admin/src/pages/content/ContentPage.tsx';

describe('STORY_5_3 AC1 — admin can configure which tier unlocks each feature flag', () => {
  it('test_STORY_5_3_AC1_admin_can_configure_feature_tier_per_role', () => {
    // Base matrix unaffected by an empty override set.
    expect(requiredTierForFeature('chat', 'coach')).toBe('advanced');
    expect(requiredTierForFeature('chat', 'player')).toBe('advanced');

    // Overriding chat/coach only changes that (feature, role) pair.
    const overrides = [{ feature: 'chat', role: 'coach', requiredTier: 'pro' }];
    expect(requiredTierForFeature('chat', 'coach', overrides)).toBe('pro');
    expect(requiredTierForFeature('chat', 'player', overrides)).toBe('advanced');

    // Merge helper produces a full requirements-shaped map.
    const merged = applyFeatureFlagOverrides(overrides);
    expect(merged.chat.coach).toBe('pro');
    expect(merged.chat.player).toBe('advanced');
    expect(merged.objectives).toEqual(FEATURE_TIER_REQUIREMENTS.objectives);

    // An override cannot newly gate a role that wasn't gated before.
    const ungatedOverride = [{ feature: 'chat', role: 'team', requiredTier: 'pro' }];
    const mergedUngated = applyFeatureFlagOverrides(ungatedOverride);
    expect(mergedUngated.chat.team).toBeUndefined();

    expect(existsSync(path.join(REPO_ROOT, MIGRATION_PATH))).toBe(true);
    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/create table if not exists public\.feature_flags/);
    expect(sql).toMatch(/primary key \(feature_key, role\)/);
    expect(sql).toMatch(/public\.is_admin\(auth\.uid\(\)\)/);

    const port = read(PORT_PATH);
    expect(port).toMatch(/listFeatureFlags/);
    expect(port).toMatch(/upsertFeatureFlag/);

    const supabaseRepo = read(SUPABASE_REPO_PATH);
    expect(supabaseRepo).toMatch(/from\('feature_flags'\)/);
    expect(supabaseRepo).toMatch(/upsert/);

    const restRepo = read(REST_REPO_PATH);
    expect(restRepo).toMatch(/listFeatureFlags/);
    expect(restRepo).toMatch(/NotImplementedAdapterError/);

    const di = read(DI_PATH);
    expect(di).toMatch(/new SupabaseContentRepository\(appClient\)/);

    const admin = read(ADMIN_CONTENT_PATH);
    expect(admin).toMatch(/listFeatureFlags/);
    expect(admin).toMatch(/upsertFeatureFlag/);
    expect(admin).toMatch(/Feature gating by role/);
  });
});

describe('STORY_5_3 AC2 — paywall messaging editable from admin Content Paywall section', () => {
  it('test_STORY_5_3_AC2_paywall_messaging_editable', () => {
    const withoutOverride = paywallCopyForFeature('ai', 'coach');
    expect(withoutOverride.paywallTitle).toBeNull();
    expect(withoutOverride.paywallMessage).toBeNull();

    const overrides = [
      {
        feature: 'ai',
        role: 'coach',
        requiredTier: 'pro',
        paywallTitle: 'Unlock AI Coaching',
        paywallMessage: 'Upgrade to Pro to access AI-personalized plans.',
      },
    ];
    const withOverride = paywallCopyForFeature('ai', 'coach', overrides);
    expect(withOverride.paywallTitle).toBe('Unlock AI Coaching');
    expect(withOverride.paywallMessage).toBe('Upgrade to Pro to access AI-personalized plans.');

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/paywall_title/);
    expect(sql).toMatch(/paywall_message/);

    const admin = read(ADMIN_CONTENT_PATH);
    expect(admin).toMatch(/Paywall title/);
    expect(admin).toMatch(/Paywall message/);
  });
});

describe('STORY_5_3 AC3 — free content catalog definable for Basic tier browsing', () => {
  it('test_STORY_5_3_AC3_free_content_catalog_definable', () => {
    const catalog = [{ id: 'content-1', title: 'Free Drill', category: 'basics' }];
    expect(isFreeAtBasicTier('content-1', catalog)).toBe(true);
    expect(isFreeAtBasicTier('content-2', catalog)).toBe(false);

    const sql = read(MIGRATION_PATH);
    expect(sql).toMatch(/create table if not exists public\.free_content_catalog/);

    const port = read(PORT_PATH);
    expect(port).toMatch(/listFreeContentCatalog/);
    expect(port).toMatch(/addFreeContentCatalogItem/);
    expect(port).toMatch(/removeFreeContentCatalogItem/);

    const supabaseRepo = read(SUPABASE_REPO_PATH);
    expect(supabaseRepo).toMatch(/from\('free_content_catalog'\)/);

    const admin = read(ADMIN_CONTENT_PATH);
    expect(admin).toMatch(/Free content catalog/);
    expect(admin).toMatch(/addFreeContentCatalogItem/);
    expect(admin).toMatch(/removeFreeContentCatalogItem/);
  });
});

describe('STORY_5_3 AC4 — changes propagate to mobile without app redeploy', () => {
  it('test_STORY_5_3_AC4_changes_propagate_without_redeploy', () => {
    const sql = read(MIGRATION_PATH);

    // Both tables are readable by any authenticated client, not admin-only,
    // so a live client picks up admin edits without shipping a new build.
    expect(sql).toMatch(/feature_flags_select_authenticated[\s\S]*?to authenticated[\s\S]*?using \(true\)/);
    expect(sql).toMatch(
      /free_content_catalog_select_authenticated[\s\S]*?to authenticated[\s\S]*?using \(true\)/,
    );

    // Reads hit Supabase at request time — no bundled constant for these two tables.
    const supabaseRepo = read(SUPABASE_REPO_PATH);
    expect(supabaseRepo).toMatch(/async listFeatureFlags[\s\S]*?this\.client/);
    expect(supabaseRepo).toMatch(/async listFreeContentCatalog[\s\S]*?this\.client/);
  });
});
