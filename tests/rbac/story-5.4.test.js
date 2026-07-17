// STORY-5.4 — Mobile consumption of admin gating overrides.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FEATURE_TIER_REQUIREMENTS,
  applyFeatureFlagOverrides,
  checkFeatureAccess,
  paywallCopyForFeature,
  paywallTierOptionsForFeature,
} from '@coach360/domain';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

const OVERRIDE_MIGRATION = 'supabase/migrations/20260717130000_has_feature_access_overrides.sql';
const POLICY_PATH = 'packages/domain/src/rbac/policy.ts';
const LAUNCH_MATRIX_PATH = 'packages/domain/src/rbac/launch-matrix.ts';
const APP_PATH = 'apps/mobile/src/App.jsx';
const PAYWALL_MODAL_PATH = 'apps/mobile/src/features/subscription/ui/PaywallModal.jsx';

describe('STORY_5_4 AC1 — mobile fetches merged feature-tier map at session load and on refresh', () => {
  it('test_STORY_5_4_AC1_mobile_fetches_merged_map_at_session_load_and_refresh', () => {
    const overrides = [{ feature: 'chat', role: 'coach', requiredTier: 'pro' }];
    const merged = applyFeatureFlagOverrides(overrides);
    expect(merged.chat.coach).toBe('pro');
    expect(merged.chat.player).toBe(FEATURE_TIER_REQUIREMENTS.chat.player);

    const app = read(APP_PATH);
    expect(app).toMatch(/listFeatureFlags/);
    expect(app).toMatch(/applyFeatureFlagOverrides/);
    expect(app).toMatch(/function refreshFeatureFlags/);
    // Session load triggers refresh.
    expect(app).toMatch(/refreshFeatureFlags\(\)/);
    expect(app).toMatch(/session\?\.user\?\.id/);
    // Refresh also runs after subscription refresh paths.
    expect(app).toMatch(/await refreshFeatureFlags\(\)/);
  });
});

describe('STORY_5_4 AC2 — checkFeatureAccess accepts injected map; static fallback when unfetched', () => {
  it('test_STORY_5_4_AC2_check_feature_access_injected_map_with_static_fallback', () => {
    // Static fallback (no requirements) — coach basic denied for chat.
    const without = checkFeatureAccess({ role: 'coach', tier: 'basic', feature: 'chat' });
    expect(without).toMatchObject({
      allowed: false,
      reason: 'tier_insufficient',
      requiredTier: 'advanced',
    });

    // Injected map raises chat/coach to pro → still denied at advanced, but requiredTier is pro.
    const merged = applyFeatureFlagOverrides([
      { feature: 'chat', role: 'coach', requiredTier: 'pro' },
    ]);
    const withInjected = checkFeatureAccess({
      role: 'coach',
      tier: 'advanced',
      feature: 'chat',
      requirements: merged,
    });
    expect(withInjected).toMatchObject({
      allowed: false,
      reason: 'tier_insufficient',
      requiredTier: 'pro',
    });

    // Same map: coach at pro is allowed.
    expect(
      checkFeatureAccess({
        role: 'coach',
        tier: 'pro',
        feature: 'chat',
        requirements: merged,
      }).allowed,
    ).toBe(true);

    // Explicit null requirements uses static FEATURE_TIER_REQUIREMENTS.
    expect(
      checkFeatureAccess({
        role: 'coach',
        tier: 'advanced',
        feature: 'chat',
        requirements: null,
      }).allowed,
    ).toBe(true);

    const policy = read(POLICY_PATH);
    expect(policy).toMatch(/requirements\?:/);
    expect(policy).toMatch(/input\.requirements \?\? FEATURE_TIER_REQUIREMENTS/);

    const launch = read(LAUNCH_MATRIX_PATH);
    expect(launch).toMatch(/requirements\?:/);
    expect(launch).toMatch(/input\.requirements \?\? FEATURE_TIER_REQUIREMENTS/);
  });
});

describe('STORY_5_4 AC3 — has_feature_access consults feature_flags overrides', () => {
  it('test_STORY_5_4_AC3_has_feature_access_consults_feature_flags', () => {
    expect(existsSync(path.join(REPO_ROOT, OVERRIDE_MIGRATION))).toBe(true);
    const sql = read(OVERRIDE_MIGRATION);
    expect(sql).toMatch(/create or replace function public\.has_feature_access/);
    expect(sql).toMatch(/from public\.feature_flags/);
    expect(sql).toMatch(/feature_key = p_feature/);
    // team_manager maps to feature_flags role 'team'.
    expect(sql).toMatch(/team_manager' then 'team'/);
    // Falls back to CASE defaults when no override row.
    expect(sql).toMatch(/v_override is not null/);
    expect(sql).toMatch(/when p_feature = 'chat' and v_role = 'coach' then 'advanced'/);
  });
});

describe('STORY_5_4 AC4 — paywall copy sources admin-configured messaging when present', () => {
  it('test_STORY_5_4_AC4_paywall_copy_sources_admin_messaging', () => {
    const without = paywallCopyForFeature('ai', 'coach');
    expect(without.paywallTitle).toBeNull();
    expect(without.paywallMessage).toBeNull();

    const overrides = [
      {
        feature: 'ai',
        role: 'coach',
        requiredTier: 'pro',
        paywallTitle: 'Unlock AI Coaching',
        paywallMessage: 'Upgrade to Pro for personalized AI plans.',
      },
    ];
    const withCopy = paywallCopyForFeature('ai', 'coach', overrides);
    expect(withCopy.paywallTitle).toBe('Unlock AI Coaching');
    expect(withCopy.paywallMessage).toBe('Upgrade to Pro for personalized AI plans.');

    // Tier options also honor override (pro floor).
    const plan = paywallTierOptionsForFeature('chat', 'coach', [
      { feature: 'chat', role: 'coach', requiredTier: 'pro' },
    ]);
    expect(plan.requiredTier).toBe('pro');

    const modal = read(PAYWALL_MODAL_PATH);
    expect(modal).toMatch(/paywallCopyForFeature/);
    expect(modal).toMatch(/featureFlagOverrides/);
    expect(modal).toMatch(/copy\?\.paywallTitle/);
    expect(modal).toMatch(/copy\?\.paywallMessage/);

    const app = read(APP_PATH);
    expect(app).toMatch(/featureFlagOverrides=\{featureFlagOverrides\}/);
  });
});

describe('STORY_5_4 AC5 — admin gating change reflects on mobile without app redeploy', () => {
  it('test_STORY_5_4_AC5_admin_change_reflects_without_redeploy', () => {
    // Runtime fetch + merge — no hardcoded override constants in the client path.
    const app = read(APP_PATH);
    expect(app).toMatch(/repos\.content\s*[\s\S]*?listFeatureFlags/);
    expect(app).toMatch(/applyFeatureFlagOverrides\(overrides\)/);
    expect(app).not.toMatch(/const HARDCODED_FEATURE_OVERRIDES/);

    // Re-fetch on refresh picks up admin edits without shipping a new build.
    expect(app).toMatch(/function refreshFeatureFlags/);
    expect(app).toMatch(/await refreshFeatureFlags\(\)/);

    // Before fetch / on error, requirements stay null → static defaults (offline fallback).
    expect(app).toMatch(/setFeatureRequirements\(null\)/);
    expect(app).toMatch(/static FEATURE_TIER_REQUIREMENTS remains the fallback/);
  });
});
