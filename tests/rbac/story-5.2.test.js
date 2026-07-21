// STORY-5.2 — Launch-critical access matrix rules (DEP-06 / Part 3 subset).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FEATURE_TIER_REQUIREMENTS,
  FULL_MATRIX_DEFERRED,
  LAUNCH_ACCESS_BANDS,
  LAUNCH_CRITICAL_FEATURE_KEYS,
  canAccessFeature,
  checkFeatureAccess,
  countLaunchCriticalRules,
  featureAccessLevel,
  resolveLaunchFeatureAccess,
} from '@coach360/domain';
import {
  FEATURE_TIER_REQUIREMENTS as EDGE_FEATURE_TIER_REQUIREMENTS,
  requireFeatureAccess,
} from '../../supabase/functions/_shared/rbac.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const LAUNCH_MATRIX_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260717120000_rbac_launch_matrix.sql',
);
const CURRENT_RBAC_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260721120100_view_schedule_feature_access.sql',
);
/** @deprecated alias — AC1–AC4 still assert against the original launch-matrix file. */
const MIGRATION_PATH = LAUNCH_MATRIX_MIGRATION_PATH;
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const LAUNCH_MATRIX_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'rbac',
  'launch-matrix.ts',
);

describe('STORY_5_2 AC1 — chat features gated at Advanced+ for all roles per matrix', () => {
  it('test_STORY_5_2_AC1_chat_gated_advanced_plus_all_roles', () => {
    const roles = ['coach', 'player', 'team', 'team_manager'];
    for (const role of roles) {
      expect(canAccessFeature(role, 'basic', 'chat'), `${role} @ basic`).toBe(false);
      expect(canAccessFeature(role, 'advanced', 'chat'), `${role} @ advanced`).toBe(true);
      expect(canAccessFeature(role, 'pro', 'chat'), `${role} @ pro`).toBe(true);
      expect(canAccessFeature(role, 'trial', 'chat'), `${role} @ trial→pro`).toBe(true);
    }

    expect(FEATURE_TIER_REQUIREMENTS.chat).toEqual({
      coach: 'advanced',
      player: 'advanced',
      team: 'advanced',
    });

    expect(checkFeatureAccess({ role: 'admin', tier: 'basic', feature: 'chat' }).allowed).toBe(
      true,
    );

    // Edge + SQL stay aligned with the domain map for chat/team.
    expect(EDGE_FEATURE_TIER_REQUIREMENTS.chat).toEqual(FEATURE_TIER_REQUIREMENTS.chat);
    expect(requireFeatureAccess({ role: 'team_manager', tier: 'basic', feature: 'chat' }).ok).toBe(
      false,
    );
    expect(requireFeatureAccess({ role: 'team_manager', tier: 'advanced', feature: 'chat' })).toEqual(
      { ok: true },
    );

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toContain(
      "when p_feature = 'chat' and v_role = 'team_manager' then 'advanced'",
    );
  });
});

describe('STORY_5_2 AC2 — AI features gated at Pro per resolved OQ-6.5 decision', () => {
  it('test_STORY_5_2_AC2_ai_gated_pro_oq_6_5', () => {
    const roles = ['coach', 'player', 'team', 'team_manager'];
    for (const role of roles) {
      expect(canAccessFeature(role, 'basic', 'ai')).toBe(false);
      expect(canAccessFeature(role, 'advanced', 'ai')).toBe(false);
      expect(canAccessFeature(role, 'pro', 'ai')).toBe(true);
      expect(canAccessFeature(role, 'trial', 'ai')).toBe(true);
    }

    expect(FEATURE_TIER_REQUIREMENTS.ai).toEqual({
      coach: 'pro',
      player: 'pro',
      team: 'pro',
    });

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toContain("when p_feature = 'ai' and v_role = 'team_manager' then 'pro'");
    expect(EDGE_FEATURE_TIER_REQUIREMENTS.ai).toEqual(FEATURE_TIER_REQUIREMENTS.ai);
  });
});

describe('STORY_5_2 AC3 — coach content creation gated at Advanced+', () => {
  it('test_STORY_5_2_AC3_coach_create_content_advanced_plus', () => {
    expect(canAccessFeature('coach', 'basic', 'createContent')).toBe(false);
    expect(canAccessFeature('coach', 'advanced', 'createContent')).toBe(true);
    expect(canAccessFeature('coach', 'pro', 'createContent')).toBe(true);

    expect(
      checkFeatureAccess({ role: 'player', tier: 'pro', feature: 'createContent' }),
    ).toMatchObject({ allowed: false, reason: 'role_not_permitted' });
    expect(
      checkFeatureAccess({ role: 'team_manager', tier: 'pro', feature: 'createContent' }),
    ).toMatchObject({ allowed: false, reason: 'role_not_permitted' });

    expect(FEATURE_TIER_REQUIREMENTS.createContent).toEqual({ coach: 'advanced' });
  });
});

describe('STORY_5_2 AC4 — ◎ read-only and ○ higher-tier behaviors documented and implemented', () => {
  it('test_STORY_5_2_AC4_readonly_and_higher_tier_behaviors', () => {
    // ◎ = read-only (documented in launch-matrix + stakeholder AC.2 answer).
    const launchSrc = readFileSync(LAUNCH_MATRIX_PATH, 'utf8');
    expect(launchSrc).toMatch(/◎\s+read-only/);
    expect(launchSrc).toMatch(/○\s+available at higher tier/);
    expect(LAUNCH_ACCESS_BANDS.browseMarketplace.player.readonlyTiers).toContain('trial');
    expect(LAUNCH_ACCESS_BANDS.viewProgress.player).toMatchObject({
      minTier: 'basic',
      fullFrom: 'pro',
    });

    // Trial marketplace browse is ◎ read-only; paid Basic+ is full.
    expect(featureAccessLevel('player', 'trial', 'browseMarketplace')).toBe('readonly');
    expect(resolveLaunchFeatureAccess({ role: 'player', tier: 'trial', feature: 'browseMarketplace' }))
      .toMatchObject({ allowed: true, accessLevel: 'readonly' });
    expect(featureAccessLevel('player', 'basic', 'browseMarketplace')).toBe('full');

    // Player progress: Basic ◎, Advanced ○ (deny until Pro), Pro ✓.
    expect(featureAccessLevel('player', 'basic', 'viewProgress')).toBe('readonly');
    expect(checkFeatureAccess({ role: 'player', tier: 'advanced', feature: 'viewProgress' })).toMatchObject({
      allowed: false,
      reason: 'tier_insufficient',
      requiredTier: 'pro',
    });
    expect(featureAccessLevel('player', 'pro', 'viewProgress')).toBe('full');

    // Coach roster / progress: Basic ◎, Advanced+ ✓.
    expect(featureAccessLevel('coach', 'basic', 'teamRoster')).toBe('readonly');
    expect(featureAccessLevel('coach', 'advanced', 'teamRoster')).toBe('full');
    expect(featureAccessLevel('coach', 'basic', 'viewProgress')).toBe('readonly');
    expect(featureAccessLevel('coach', 'advanced', 'viewProgress')).toBe('full');

    // Training materials / shared video: player Basic ◎, Advanced+ ✓.
    expect(featureAccessLevel('player', 'basic', 'viewTrainingMaterials')).toBe('readonly');
    expect(featureAccessLevel('player', 'advanced', 'viewTrainingMaterials')).toBe('full');
    expect(featureAccessLevel('player', 'basic', 'watchSharedVideo')).toBe('readonly');

    // Mobile wires browseMarketplace access level (◎ trial banner / gate).
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/featureAccessLevel/);
    expect(app).toMatch(/browseMarketplace/);
    expect(app).toMatch(/Browse only/);
  });
});

describe('STORY_5_2 AC5 — full 223-rule matrix expansion deferred post-MVP', () => {
  it('test_STORY_5_2_AC5_full_matrix_deferred_post_mvp', () => {
    expect(FULL_MATRIX_DEFERRED).toBe(true);
    const ruleCount = countLaunchCriticalRules();
    expect(ruleCount).toBeGreaterThan(0);
    expect(ruleCount).toBeLessThan(223);
    expect(LAUNCH_CRITICAL_FEATURE_KEYS.length).toBe(Object.keys(FEATURE_TIER_REQUIREMENTS).length);

    // SQL launch migration exists and documents the deferral boundary.
    expect(existsSync(LAUNCH_MATRIX_MIGRATION_PATH)).toBe(true);
    const launchSql = readFileSync(LAUNCH_MATRIX_MIGRATION_PATH, 'utf8');
    expect(launchSql).toMatch(/STORY-5\.2/);
    expect(launchSql).toMatch(/Launch-critical access matrix/);

    // Current has_feature_access CASE stays in sync with FEATURE_TIER_REQUIREMENTS.
    expect(existsSync(CURRENT_RBAC_MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(CURRENT_RBAC_MIGRATION_PATH, 'utf8');

    // Every domain rule appears in the current SQL helper (binary allow-at-minimum).
    let expectedWhen = 0;
    for (const [feature, requirements] of Object.entries(FEATURE_TIER_REQUIREMENTS)) {
      for (const [role, minimumTier] of Object.entries(requirements)) {
        const sqlRole = role === 'team' ? 'team_manager' : role;
        expect(sql).toContain(
          `when p_feature = '${feature}' and v_role = '${sqlRole}' then '${minimumTier}'`,
        );
        expectedWhen += 1;
      }
    }
    expect(sql.match(/when p_feature = /g)).toHaveLength(expectedWhen);
  });
});
