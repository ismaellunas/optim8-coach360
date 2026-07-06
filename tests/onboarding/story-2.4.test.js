// STORY-2.4 — First-time coach guided onboarding (Flow 15).

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  COACH_ONBOARDING_COMPLETED_EVENT,
  COACH_ONBOARDING_STEP_COUNT,
  needsCoachOnboarding,
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
  'CoachOnboardingGate.jsx',
);
const WIZARD_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'onboarding',
  'ui',
  'CoachOnboardingWizard.jsx',
);
const PROGRESS_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'onboarding',
  'ui',
  'CoachOnboardingProgress.jsx',
);
const STEPS_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'onboarding',
  'lib',
  'coach-onboarding-steps.js',
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
const NAV_CONTEXT_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'onboarding',
  'model',
  'onboarding-navigation-context.jsx',
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
  '20260706130000_coach_onboarding.sql',
);

function coachProfile(overrides = {}) {
  return profileSchema.parse({
    id: '00000000-0000-4000-8000-000000000010',
    role: 'coach',
    displayName: 'Coach Pat',
    avatarUrl: null,
    bio: null,
    coachContext: 'independent',
    age: null,
    position: null,
    profileCompletedAt: new Date().toISOString(),
    teamSetupPathEnteredAt: null,
    coachOnboardingCompletedAt: null,
    ...overrides,
  });
}

describe('STORY_2_4 AC1 — progress indicator shows onboarding steps', () => {
  it('test_STORY_2_4_AC1_progress_indicator_shows_steps: wizard renders segmented progress for all steps', () => {
    expect(COACH_ONBOARDING_STEP_COUNT).toBe(5);
    expect(existsSync(PROGRESS_PATH)).toBe(true);
    expect(existsSync(STEPS_PATH)).toBe(true);

    const progress = readFileSync(PROGRESS_PATH, 'utf8');
    expect(progress).toMatch(/coach-onboarding-progress/);
    expect(progress).toMatch(/stepCount/);

    const wizard = readFileSync(WIZARD_PATH, 'utf8');
    expect(wizard).toMatch(/CoachOnboardingProgress/);
    expect(wizard).toMatch(/COACH_ONBOARDING_STEPS/);
  });
});

describe('STORY_2_4 AC2 — coach can skip team creation and player invites', () => {
  it('test_STORY_2_4_AC2_skip_team_and_invites: copy and actions defer team setup', () => {
    const wizard = readFileSync(WIZARD_PATH, 'utf8');
    expect(wizard).toMatch(/Skip for now/);
    expect(wizard).toMatch(/Skip team creation and player invites/);
    expect(wizard).toMatch(/invite players[\s\S]*later from Roster/);
    expect(wizard).toMatch(/optional/i);
    expect(wizard).not.toMatch(/go\("teams"\)/);
  });
});

describe('STORY_2_4 AC3 — marketplace browse without purchase', () => {
  it('test_STORY_2_4_AC3_marketplace_browse_without_purchase: catalog preview is browse-only', () => {
    expect(existsSync(CATALOG_PATH)).toBe(true);

    const catalog = readFileSync(CATALOG_PATH, 'utf8');
    expect(catalog).toMatch(/MOCK_MARKETPLACE_CATALOG/);
    expect(catalog).toMatch(/Elite Shooting System/);

    const wizard = readFileSync(WIZARD_PATH, 'utf8');
    expect(wizard).toMatch(/MOCK_MARKETPLACE_CATALOG/);
    expect(wizard).toMatch(/Browse only — no purchase required/);
    expect(wizard).not.toMatch(/Purchase/);
    expect(wizard).not.toMatch(/onUpgrade/);
  });
});

describe('STORY_2_4 AC4 — create-first-session links to scheduling flow', () => {
  it('test_STORY_2_4_AC4_session_step_links_to_schedule: open schedule wires navigation redirect', () => {
    const wizard = readFileSync(WIZARD_PATH, 'utf8');
    expect(wizard).toMatch(/Open schedule/);
    expect(wizard).toMatch(/onOpenSchedule/);

    const gate = readFileSync(GATE_PATH, 'utf8');
    expect(gate).toMatch(/openSchedule:\s*true/);
    expect(gate).toMatch(/setRedirectToSchedule\(true\)/);

    const nav = readFileSync(NAV_CONTEXT_PATH, 'utf8');
    expect(nav).toMatch(/redirectToSchedule/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/CoachOnboardingGate/);
    expect(app).toMatch(/redirectToSchedule/);
    expect(app).toMatch(/setScreen\("schedule"\)/);
  });
});

describe('STORY_2_4 AC5 — onboarding completion recorded for analytics', () => {
  it('test_STORY_2_4_AC5_onboarding_completion_recorded: completion persists and analytics event fires', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/coach_onboarding_completed_at/);
    expect(sql).toMatch(/complete_coach_onboarding/);

    expect(existsSync(PROFILE_REPO_PATH)).toBe(true);
    const repo = readFileSync(PROFILE_REPO_PATH, 'utf8');
    expect(repo).toMatch(/completeCoachOnboarding/);
    expect(repo).toMatch(/complete_coach_onboarding/);

    expect(existsSync(ANALYTICS_PORT_PATH)).toBe(true);
    const gate = readFileSync(GATE_PATH, 'utf8');
    expect(gate).toMatch(/completeCoachOnboarding/);
    expect(gate).toMatch(/COACH_ONBOARDING_COMPLETED_EVENT/);
    expect(gate).toMatch(/repos\.analytics\.track/);
    expect(COACH_ONBOARDING_COMPLETED_EVENT).toBe('coach_onboarding_completed');

    const incomplete = coachProfile();
    expect(needsCoachOnboarding(incomplete)).toBe(true);

    const complete = coachProfile({
      coachOnboardingCompletedAt: new Date().toISOString(),
    });
    expect(needsCoachOnboarding(complete)).toBe(false);
  });
});
