// STORY-11.1 — Objectives UI — coach set, player view

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeObjectiveProgress,
  createObjectiveInputSchema,
  objectiveSchema,
  FEATURE_TIER_REQUIREMENTS,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const OBJECTIVES_UI_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'objectives',
  'ui',
  'ObjectivesScreen.jsx',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const DOMAIN_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'objectives',
  'schema.ts',
);
const SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260723220000_objectives.sql',
);
const REPO_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'objectives-repository.ts',
);
const SUPABASE_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-objectives-repository.ts',
);
const DI_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'di',
  'create-repositories.ts',
);

describe('STORY_11_1 AC1 — coach at Pro sets objectives for individual players and teams', () => {
  it('test_STORY_11_1_AC1_coach_pro_sets_player_and_team_objectives: create schema, Pro gate, coach UI', () => {
    expect(FEATURE_TIER_REQUIREMENTS.objectives).toEqual({ coach: 'pro', player: 'pro' });

    const playerGoal = createObjectiveInputSchema.parse({
      title: 'Improve 3PT to 40%',
      scope: 'player',
      playerId: '11111111-1111-4111-8111-111111111111',
      targetCompletions: 12,
      category: 'shooting',
    });
    expect(playerGoal.scope).toBe('player');
    expect(playerGoal.playerId).toBe('11111111-1111-4111-8111-111111111111');

    const teamGoal = createObjectiveInputSchema.parse({
      title: 'Defensive rotations',
      scope: 'team',
      teamId: '22222222-2222-4222-8222-222222222222',
      targetCompletions: 20,
      category: 'defense',
    });
    expect(teamGoal.scope).toBe('team');
    expect(teamGoal.teamId).toBe('22222222-2222-4222-8222-222222222222');

    expect(() =>
      createObjectiveInputSchema.parse({
        title: 'Missing player',
        scope: 'player',
        targetCompletions: 5,
      }),
    ).toThrow();

    expect(() =>
      createObjectiveInputSchema.parse({
        title: 'Missing team',
        scope: 'team',
        targetCompletions: 5,
      }),
    ).toThrow();

    const ui = readFileSync(OBJECTIVES_UI_PATH, 'utf8');
    expect(ui).toMatch(/objective-add/);
    expect(ui).toMatch(/objective-create-form/);
    expect(ui).toMatch(/objective-scope-player/);
    expect(ui).toMatch(/objective-scope-team/);
    expect(ui).toMatch(/repos\.objectives\.create/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/from "\.\/features\/objectives\/ui\/ObjectivesScreen\.jsx"/);
    expect(app).toMatch(/canAccess\(user, "objectives"\)/);
    expect(app).not.toMatch(/function ObjectivesScreen/);
  });
});

describe('STORY_11_1 AC2 — player at Pro views assigned objectives and progress rings', () => {
  it('test_STORY_11_1_AC2_player_pro_views_objectives_with_progress_rings: ring UI and list', () => {
    expect(computeObjectiveProgress(7, 10)).toBe(70);
    expect(computeObjectiveProgress(0, 10)).toBe(0);
    expect(computeObjectiveProgress(15, 10)).toBe(100);

    const ui = readFileSync(OBJECTIVES_UI_PATH, 'utf8');
    expect(ui).toMatch(/ObjectiveProgressRing/);
    expect(ui).toMatch(/objective-progress-ring/);
    expect(ui).toMatch(/listForUser/);
    expect(ui).toMatch(/!isCoach/);
  });
});

describe('STORY_11_1 AC3 — objective progress updates when drill completion logged', () => {
  it('test_STORY_11_1_AC3_drill_completion_updates_objective_progress: trigger bumps completions', () => {
    const sql = readFileSync(SQL_PATH, 'utf8');
    expect(sql).toMatch(/bump_objectives_on_drill_completion/);
    expect(sql).toMatch(/session_content_completions_bump_objectives/);
    expect(sql).toMatch(/content_key not like 'drill:%'/);
    expect(sql).toMatch(/current_completions = least\(current_completions \+ 1/);
    expect(sql).toMatch(/scope = 'player'/);
    expect(sql).toMatch(/scope = 'team'/);
    expect(sql).toMatch(/from public\.rosters r/);

    const domain = readFileSync(DOMAIN_PATH, 'utf8');
    expect(domain).toMatch(/computeObjectiveProgress/);
    expect(domain).toMatch(/targetCompletions/);
    expect(domain).toMatch(/currentCompletions/);
  });
});

describe('STORY_11_1 AC4 — objective schema supports player and team goals per Flow 6', () => {
  it('test_STORY_11_1_AC4_objective_schema_supports_player_and_team_goals: zod + SQL assignee rules', () => {
    const parsed = objectiveSchema.parse({
      id: '33333333-3333-4333-8333-333333333333',
      coachId: '44444444-4444-4444-8444-444444444444',
      scope: 'player',
      playerId: '55555555-5555-4555-8555-555555555555',
      teamId: null,
      title: 'Free throw 85%+',
      category: 'shooting',
      targetCompletions: 10,
      currentCompletions: 3,
      createdAt: '2026-07-23T00:00:00.000Z',
      updatedAt: '2026-07-23T00:00:00.000Z',
    });
    expect(parsed.scope).toBe('player');

    const sql = readFileSync(SQL_PATH, 'utf8');
    expect(sql).toMatch(/create table if not exists public\.objectives/);
    expect(sql).toMatch(/scope text not null check \(scope in \('player', 'team'\)\)/);
    expect(sql).toMatch(/objectives_assignee_check/);
    expect(sql).toMatch(/category text check/);
    expect(sql).toMatch(/shooting.*defense.*strategy/);

    const port = readFileSync(REPO_PORT_PATH, 'utf8');
    expect(port).toMatch(/ObjectivesRepository/);
    expect(port).toMatch(/listForUser/);
    expect(port).toMatch(/create\(/);

    const adapter = readFileSync(SUPABASE_REPO_PATH, 'utf8');
    expect(adapter).toMatch(/from\('objectives'\)/);

    const di = readFileSync(DI_PATH, 'utf8');
    expect(di).toMatch(/objectives: new SupabaseObjectivesRepository/);
    expect(di).toMatch(/objectives: new RestObjectivesRepository/);
  });
});
