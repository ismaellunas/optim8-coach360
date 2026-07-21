// STORY-5.1 — Core RBAC middleware and policy layer (DEP-06).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FEATURE_TIER_REQUIREMENTS,
  canAccessFeature,
  checkFeatureAccess,
  featureAccessDenial,
} from '@coach360/domain';
import {
  FEATURE_TIER_REQUIREMENTS as EDGE_FEATURE_TIER_REQUIREMENTS,
  effectiveTierForAccess as edgeEffectiveTierForAccess,
  featureAccessDeniedResponse,
  requireFeatureAccess,
} from '../../supabase/functions/_shared/rbac.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260721120100_view_schedule_feature_access.sql',
);
const RBAC_HELPERS_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260715120000_rbac_tier_policies.sql',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');

describe('STORY_5_1 AC1 — utility accepts role, tier, feature key and returns allow/deny', () => {
  it('test_STORY_5_1_AC1_check_feature_access_allow_deny: allow and deny per role/tier/feature', () => {
    // Allow at or above the minimum tier.
    expect(checkFeatureAccess({ role: 'coach', tier: 'advanced', feature: 'chat' })).toMatchObject({
      allowed: true,
    });
    expect(checkFeatureAccess({ role: 'player', tier: 'pro', feature: 'ai' }).allowed).toBe(true);
    expect(
      checkFeatureAccess({ role: 'team_manager', tier: 'basic', feature: 'invitePlayers' }).allowed,
    ).toBe(true);

    // Legacy mobile role key 'team' resolves like 'team_manager'.
    expect(
      checkFeatureAccess({ role: 'team', tier: 'basic', feature: 'invitePlayers' }).allowed,
    ).toBe(true);

    // Active trial maps to Pro access (Flow 2).
    expect(checkFeatureAccess({ role: 'coach', tier: 'trial', feature: 'ai' }).allowed).toBe(true);

    // Deny below the minimum tier, with the required tier reported.
    const tierDenied = checkFeatureAccess({ role: 'coach', tier: 'basic', feature: 'chat' });
    expect(tierDenied).toMatchObject({
      allowed: false,
      reason: 'tier_insufficient',
      requiredTier: 'advanced',
    });

    // Deny features the role can never unlock, at any tier.
    const roleDenied = checkFeatureAccess({ role: 'player', tier: 'pro', feature: 'createContent' });
    expect(roleDenied).toMatchObject({ allowed: false, reason: 'role_not_permitted' });

    // Unknown feature keys deny (fail closed).
    expect(checkFeatureAccess({ role: 'coach', tier: 'pro', feature: 'nope' }).allowed).toBe(false);

    // Boolean wrapper for UI guards.
    expect(canAccessFeature('player', 'basic', 'purchase')).toBe(true);
    expect(canAccessFeature('player', 'basic', 'chat')).toBe(false);

    // Mobile guard delegates to this centralized utility (no local copy).
    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/checkFeatureAccess/);
    expect(app).not.toMatch(/const FEATURE_REQS =/);
  });
});

describe('STORY_5_1 AC2 — Supabase RLS policies align with application RBAC rules', () => {
  it('test_STORY_5_1_AC2_rls_policies_align_with_rbac_rules: SQL helpers mirror domain rules', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    expect(existsSync(RBAC_HELPERS_MIGRATION_PATH)).toBe(true);
    // Current has_feature_access CASE lives in the latest RBAC sync migration.
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    const helpersSql = readFileSync(RBAC_HELPERS_MIGRATION_PATH, 'utf8');

    // Every application rule appears verbatim in has_feature_access, and the
    // SQL contains no extra rules beyond the application map.
    let ruleCount = 0;
    for (const [feature, requirements] of Object.entries(FEATURE_TIER_REQUIREMENTS)) {
      for (const [role, minimumTier] of Object.entries(requirements)) {
        const sqlRole = role === 'team' ? 'team_manager' : role;
        expect(
          sql,
          `RLS rule for feature "${feature}" role "${sqlRole}" should require '${minimumTier}'`,
        ).toContain(`when p_feature = '${feature}' and v_role = '${sqlRole}' then '${minimumTier}'`);
        ruleCount += 1;
      }
    }
    expect(sql.match(/when p_feature = /g)).toHaveLength(ruleCount);

    // effective_tier mirrors effectiveTierForAccess: active trial → pro,
    // stale/expired trial → basic, no subscription row → basic.
    expect(helpersSql).toMatch(/create or replace function public\.effective_tier/);
    expect(helpersSql).toMatch(
      /s\.tier = 'trial'\s+and s\.status = 'trialing'\s+and \(s\.trial_ends_at is null or s\.trial_ends_at > now\(\)\)\s+then 'pro'/,
    );
    expect(helpersSql).toMatch(/when s\.tier = 'trial'\s+then 'basic'/);
    expect(helpersSql).toMatch(/'basic'::public\.subscription_tier\s*\n\s*\);/);

    // Admin bypasses tier restrictions in SQL, like the application layer.
    expect(sql).toMatch(/if v_role = 'admin' then\s+return true;/);

    // Representative policies enforce the same feature keys server-side.
    expect(helpersSql).toMatch(/drop policy "sessions_coach_insert" on public\.sessions/);
    expect(helpersSql).toMatch(/public\.has_feature_access\(auth\.uid\(\), 'createSession'\)/);
    expect(helpersSql).toMatch(/drop policy "team_invites_coach_insert" on public\.team_invites/);
    expect(helpersSql).toMatch(/public\.has_feature_access\(auth\.uid\(\), 'invitePlayers'\)/);

    // Edge middleware carries the identical tier map (no drift between the
    // Deno copy and the domain source of truth).
    expect(EDGE_FEATURE_TIER_REQUIREMENTS).toEqual(FEATURE_TIER_REQUIREMENTS);

    // Edge effective-tier logic matches the domain trial semantics.
    const now = new Date('2026-07-15T00:00:00.000Z');
    expect(
      edgeEffectiveTierForAccess(
        { tier: 'trial', status: 'trialing', trialEndsAt: '2026-07-20T00:00:00.000Z' },
        now,
      ),
    ).toBe('pro');
    expect(
      edgeEffectiveTierForAccess(
        { tier: 'trial', status: 'trialing', trialEndsAt: '2026-07-01T00:00:00.000Z' },
        now,
      ),
    ).toBe('basic');
    expect(edgeEffectiveTierForAccess({ tier: 'advanced', status: 'active' }, now)).toBe(
      'advanced',
    );
    expect(edgeEffectiveTierForAccess(null, now)).toBe('basic');
  });
});

describe('STORY_5_1 AC3 — deny responses return 403 with tier upgrade hint where applicable', () => {
  it('test_STORY_5_1_AC3_deny_403_with_upgrade_hint: 403 body carries required tier and hint', async () => {
    // Tier-insufficient denials: 403 + upgrade hint naming the required tier.
    const denied = requireFeatureAccess({ role: 'coach', tier: 'basic', feature: 'chat' });
    expect(denied.ok).toBe(false);
    expect(denied.status).toBe(403);
    expect(denied.body).toEqual({
      error: 'tier_insufficient',
      feature: 'chat',
      required_tier: 'advanced',
      hint: 'Upgrade to Advanced to unlock chat.',
    });

    // Role-level denials: still 403, but no upgrade hint applies.
    const roleDenied = requireFeatureAccess({
      role: 'player',
      tier: 'pro',
      feature: 'createSession',
    });
    expect(roleDenied.ok).toBe(false);
    expect(roleDenied.status).toBe(403);
    expect(roleDenied.body.error).toBe('role_not_permitted');
    expect(roleDenied.body.hint).toBeNull();

    // Allowed callers pass through the guard.
    expect(requireFeatureAccess({ role: 'coach', tier: 'pro', feature: 'chat' })).toEqual({
      ok: true,
    });

    // The guard renders an actual 403 HTTP response for edge functions.
    const response = featureAccessDeniedResponse(denied, { 'Access-Control-Allow-Origin': '*' });
    expect(response.status).toBe(403);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(await response.json()).toEqual(denied.body);

    // Domain-side denial payload matches for API adapters.
    const domainDenial = featureAccessDenial({ role: 'coach', tier: 'basic', feature: 'chat' });
    expect(domainDenial).toEqual({
      status: 403,
      error: 'tier_insufficient',
      feature: 'chat',
      requiredTier: 'advanced',
      hint: 'Upgrade to Advanced to unlock chat.',
    });
    expect(featureAccessDenial({ role: 'coach', tier: 'pro', feature: 'chat' })).toBeNull();
  });
});

describe('STORY_5_1 AC4 — unit tests cover Player, Coach, Team Manager, Admin for sample features', () => {
  it('test_STORY_5_1_AC4_role_matrix_player_coach_team_manager_admin: matrix matches Part 3', () => {
    // Minimum tier per role for sample features, per Part 3 of flows.md
    // (null = feature never available to the role).
    const SAMPLE_FEATURES = {
      chat: { player: 'advanced', coach: 'advanced', team_manager: 'advanced' },
      ai: { player: 'pro', coach: 'pro', team_manager: 'pro' },
      createContent: { player: null, coach: 'advanced', team_manager: null },
      invitePlayers: { player: null, coach: 'advanced', team_manager: 'basic' },
    };
    const TIERS = ['basic', 'advanced', 'pro'];
    const RANK = { basic: 1, advanced: 2, pro: 3 };

    for (const [feature, minimums] of Object.entries(SAMPLE_FEATURES)) {
      for (const [role, minimum] of Object.entries(minimums)) {
        for (const tier of TIERS) {
          const expected = minimum !== null && RANK[tier] >= RANK[minimum];
          const label = `${role} @ ${tier} → ${feature}`;

          const domainDecision = checkFeatureAccess({ role, tier, feature });
          expect(domainDecision.allowed, `domain: ${label}`).toBe(expected);

          const edgeDecision = requireFeatureAccess({ role, tier, feature });
          expect(edgeDecision.ok, `edge: ${label}`).toBe(expected);
        }
      }

      // Admin bypasses tier restrictions everywhere.
      for (const tier of TIERS) {
        expect(checkFeatureAccess({ role: 'admin', tier, feature }).allowed).toBe(true);
        expect(requireFeatureAccess({ role: 'admin', tier, feature })).toEqual({ ok: true });
      }
    }
  });
});
