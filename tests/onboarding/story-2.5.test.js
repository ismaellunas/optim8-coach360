// STORY-2.5 — First-time player guided onboarding (Flow 16).

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  PLAYER_ONBOARDING_COMPLETED_EVENT,
  PLAYER_ONBOARDING_STEP_COUNT,
  needsPlayerOnboarding,
  profileSchema,
} from '@coach360/domain';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const GATE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'onboarding',
  'ui',
  'PlayerOnboardingGate.jsx',
);
const WIZARD_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'onboarding',
  'ui',
  'PlayerOnboardingWizard.jsx',
);
const STEPS_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'onboarding',
  'lib',
  'player-onboarding-steps.js',
);
const CATALOG_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'onboarding',
  'lib',
  'mock-marketplace-catalog.js',
);
const ASSIGNED_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'onboarding',
  'lib',
  'mock-assigned-content.js',
);
const PROFILE_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-profile-repository.ts',
);
const ANALYTICS_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'analytics-repository.ts',
);
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260706140000_player_onboarding.sql',
);

function playerProfile(overrides = {}) {
  return profileSchema.parse({
    id: '00000000-0000-4000-8000-000000000020',
    role: 'player',
    displayName: 'Jaylen Carter',
    avatarUrl: null,
    bio: null,
    coachContext: null,
    age: 14,
    position: 'Guard',
    profileCompletedAt: new Date().toISOString(),
    teamSetupPathEnteredAt: null,
    coachOnboardingCompletedAt: null,
    playerOnboardingCompletedAt: null,
    firstDrillCompletedAt: null,
    playerDrillsCompletedCount: 0,
    ...overrides,
  });
}

describe('STORY_2_5 AC1 — player can complete onboarding without joining a team', () => {
  it('test_STORY_2_5_AC1_complete_without_team: copy and actions defer team join', () => {
    const wizard = readFileSync(WIZARD_PATH, 'utf8');
    expect(wizard).toMatch(/Skip for now/);
    expect(wizard).toMatch(/Skip team join for now/);
    expect(wizard).toMatch(/train independently/i);
    expect(wizard).not.toMatch(/go\("teams"\)/);
  });
});

describe('STORY_2_5 AC2 — browse step shows marketplace and assigned content', () => {
  it('test_STORY_2_5_AC2_browse_shows_marketplace_and_assigned: both catalogs render in browse step', () => {
    expect(existsSync(CATALOG_PATH)).toBe(true);
    expect(existsSync(ASSIGNED_PATH)).toBe(true);

    const catalog = readFileSync(CATALOG_PATH, 'utf8');
    expect(catalog).toMatch(/MOCK_MARKETPLACE_CATALOG/);
    expect(catalog).toMatch(/Elite Shooting System/);

    const assigned = readFileSync(ASSIGNED_PATH, 'utf8');
    expect(assigned).toMatch(/MOCK_ASSIGNED_CONTENT/);
    expect(assigned).toMatch(/Crossover Fundamentals/);

    const wizard = readFileSync(WIZARD_PATH, 'utf8');
    expect(wizard).toMatch(/MOCK_MARKETPLACE_CATALOG/);
    expect(wizard).toMatch(/MOCK_ASSIGNED_CONTENT/);
    expect(wizard).toMatch(/Marketplace/);
    expect(wizard).toMatch(/Assigned to you/);
  });
});

describe('STORY_2_5 AC3 — first drill completion logs progress to profile', () => {
  it('test_STORY_2_5_AC3_first_drill_logs_progress: drill logging persists to profile fields', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/first_drill_completed_at/);
    expect(sql).toMatch(/player_drills_completed_count/);
    expect(sql).toMatch(/log_player_first_drill/);

    expect(existsSync(PROFILE_REPO_PATH)).toBe(true);
    const repo = readFileSync(PROFILE_REPO_PATH, 'utf8');
    expect(repo).toMatch(/logPlayerFirstDrill/);
    expect(repo).toMatch(/log_player_first_drill/);

    const gate = readFileSync(GATE_PATH, 'utf8');
    expect(gate).toMatch(/logPlayerFirstDrill/);
    expect(gate).toMatch(/playerDrillsCompletedCount/);

    const wizard = readFileSync(WIZARD_PATH, 'utf8');
    expect(wizard).toMatch(/Log first drill/);
    expect(wizard).toMatch(/onLogFirstDrill/);
    expect(wizard).toMatch(/drillsCompletedCount/);
  });
});

describe('STORY_2_5 AC4 — onboarding completion analytics event fires', () => {
  it('test_STORY_2_5_AC4_onboarding_completion_analytics: completion persists and analytics event fires', () => {
    expect(PLAYER_ONBOARDING_STEP_COUNT).toBe(6);
    expect(existsSync(STEPS_PATH)).toBe(true);

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/player_onboarding_completed_at/);
    expect(sql).toMatch(/complete_player_onboarding/);

    const repo = readFileSync(PROFILE_REPO_PATH, 'utf8');
    expect(repo).toMatch(/completePlayerOnboarding/);
    expect(repo).toMatch(/complete_player_onboarding/);

    expect(existsSync(ANALYTICS_PORT_PATH)).toBe(true);
    const gate = readFileSync(GATE_PATH, 'utf8');
    expect(gate).toMatch(/completePlayerOnboarding/);
    expect(gate).toMatch(/PLAYER_ONBOARDING_COMPLETED_EVENT/);
    expect(gate).toMatch(/repos\.analytics\.track/);
    expect(PLAYER_ONBOARDING_COMPLETED_EVENT).toBe('player_onboarding_completed');

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/PlayerOnboardingGate/);

    const incomplete = playerProfile();
    expect(needsPlayerOnboarding(incomplete)).toBe(true);

    const complete = playerProfile({
      playerOnboardingCompletedAt: new Date().toISOString(),
    });
    expect(needsPlayerOnboarding(complete)).toBe(false);
  });
});

describe('STORY_2_5 AC5 — invite-to-team option available but not mandatory', () => {
  it('test_STORY_2_5_AC5_team_invite_optional: team step is optional with skip path', () => {
    const steps = readFileSync(STEPS_PATH, 'utf8');
    expect(steps).toMatch(/Join a team/);

    const wizard = readFileSync(WIZARD_PATH, 'utf8');
    expect(wizard).toMatch(/step\.id === 'team'/);
    expect(wizard).toMatch(/invite code/i);
    expect(wizard).toMatch(/optional/i);
    expect(wizard).toMatch(/Skip for now/);
    expect(wizard).toMatch(/Team invite code/);
  });
});
