// STORY-7.2 — Drill logging and progress tracking

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BASIC_TIER_PROGRESS_SCOPE,
  computeCompletionPercent,
  drillLogInputSchema,
  featureAccessLevel,
  playerProgressFeaturesForAccess,
  summarizePlayerProgress,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const PLAYER_DETAIL_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'session',
  'ui',
  'PlayerSessionDetailScreen.jsx',
);
const PROFILE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'profile',
  'ui',
  'ProfileScreen.jsx',
);
const PROGRESS_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'progress',
  'ui',
  'ProgressScreen.jsx',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const COMPLETION_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'session',
  'completion.ts',
);
const PROGRESS_DOMAIN_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'session',
  'progress.ts',
);
const SESSION_CONTENT_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-session-content-repository.ts',
);
const SESSION_CONTENT_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'session-content-repository.ts',
);
const DRILL_PROGRESS_SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260721160000_drill_progress_logging.sql',
);

describe('STORY_7_2 AC1 — player logs drill completion with optional reps and time', () => {
  it('test_STORY_7_2_AC1_player_logs_drill_completion_with_optional_reps_and_time: drill form and repo fields', () => {
    const parsed = drillLogInputSchema.parse({ reps: 50, durationSeconds: 600 });
    expect(parsed.reps).toBe(50);
    expect(parsed.durationSeconds).toBe(600);

    const completionDomain = readFileSync(COMPLETION_PATH, 'utf8');
    expect(completionDomain).toMatch(/drillLogInputSchema/);
    expect(completionDomain).toMatch(/reps\?:/);
    expect(completionDomain).toMatch(/durationSeconds\?:/);

    const sql = readFileSync(DRILL_PROGRESS_SQL_PATH, 'utf8');
    expect(sql).toMatch(/reps integer/);
    expect(sql).toMatch(/duration_seconds integer/);

    const port = readFileSync(SESSION_CONTENT_PORT_PATH, 'utf8');
    expect(port).toMatch(/drillLog\?: DrillLogInput/);

    const repo = readFileSync(SESSION_CONTENT_REPO_PATH, 'utf8');
    expect(repo).toMatch(/duration_seconds/);
    expect(repo).toMatch(/drillLogInputSchema/);

    const playerDetail = readFileSync(PLAYER_DETAIL_PATH, 'utf8');
    expect(playerDetail).toMatch(/data-testid="drill-log-form"/);
    expect(playerDetail).toMatch(/Reps \(optional\)/);
    expect(playerDetail).toMatch(/Time \(min, optional\)/);
    expect(playerDetail).toMatch(/Log drill complete/);
    expect(playerDetail).toMatch(/onLogDrill/);
    expect(playerDetail).toMatch(/drill-log-summary/);
  });
});

describe('STORY_7_2 AC2 — progress percentage updates on profile and assigned content', () => {
  it('test_STORY_7_2_AC2_progress_percentage_updates_on_profile_and_assigned_content: percent bar and profile summary', () => {
    expect(computeCompletionPercent(2, 4)).toBe(50);
    expect(computeCompletionPercent(3, 3)).toBe(100);
    expect(computeCompletionPercent(0, 0)).toBe(0);

    const summary = summarizePlayerProgress([
      {
        sessionId: 's1',
        playerId: 'p1',
        contentKey: 'drill:library:d1',
        completedAt: '2026-07-21T12:00:00.000Z',
        reps: 30,
        durationSeconds: 600,
      },
    ]);
    expect(summary.drillsCompleted).toBe(1);
    expect(summary.totalReps).toBe(30);
    expect(summary.totalDurationMinutes).toBe(10);

    const playerDetail = readFileSync(PLAYER_DETAIL_PATH, 'utf8');
    expect(playerDetail).toMatch(/computeCompletionPercent/);
    expect(playerDetail).toMatch(/data-testid="session-progress-bar"/);
    expect(playerDetail).toMatch(/sessionProgressPercent/);

    const profile = readFileSync(PROFILE_PATH, 'utf8');
    expect(profile).toMatch(/data-testid="profile-progress-summary"/);
    expect(profile).toMatch(/listPlayerProgress/);
    expect(profile).toMatch(/summarizePlayerProgress/);

    const progressScreen = readFileSync(PROGRESS_PATH, 'utf8');
    expect(progressScreen).toMatch(/data-testid="progress-drills-completed"/);
    expect(progressScreen).toMatch(/listPlayerProgress/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/features\/progress\/ui\/ProgressScreen/);
    expect(app).not.toMatch(/124.*this week/);
  });
});

describe('STORY_7_2 AC3 — basic tier progress scope matches OQ-2.1 resolution', () => {
  it('test_STORY_7_2_AC3_basic_tier_progress_scope_matches_resolution: readonly basic vs full pro', () => {
    const progressDomain = readFileSync(PROGRESS_DOMAIN_PATH, 'utf8');
    expect(progressDomain).toMatch(/BASIC_TIER_PROGRESS_SCOPE/);
    expect(progressDomain).toMatch(/playerProgressFeaturesForAccess/);
    expect(progressDomain).toMatch(/OQ-2.1/);

    expect(BASIC_TIER_PROGRESS_SCOPE.canLogDrills).toBe(true);
    expect(BASIC_TIER_PROGRESS_SCOPE.canViewFullDashboard).toBe(false);

    const basicFeatures = playerProgressFeaturesForAccess('readonly');
    expect(basicFeatures.canViewCompletionCount).toBe(true);
    expect(basicFeatures.canViewTrends).toBe(false);

    const proFeatures = playerProgressFeaturesForAccess('full');
    expect(proFeatures.canViewFullDashboard).toBe(true);
    expect(proFeatures.canViewTrends).toBe(true);

    expect(featureAccessLevel('player', 'basic', 'viewProgress')).toBe('readonly');
    expect(featureAccessLevel('player', 'advanced', 'viewProgress')).toBe('none');
    expect(featureAccessLevel('player', 'pro', 'viewProgress')).toBe('full');

    const progressScreen = readFileSync(PROGRESS_PATH, 'utf8');
    expect(progressScreen).toMatch(/featureAccessLevel/);
    expect(progressScreen).toMatch(/data-testid="progress-basic-scope-banner"/);
    expect(progressScreen).toMatch(/data-testid="progress-tier-locked"/);
    expect(progressScreen).toMatch(/viewProgress/);
  });
});

describe('STORY_7_2 AC4 — progress data stored in Supabase for coach dashboard consumption', () => {
  it('test_STORY_7_2_AC4_progress_data_persists_for_coach_dashboard_consumption: listPlayerProgress and RLS select', () => {
    const sql = readFileSync(DRILL_PROGRESS_SQL_PATH, 'utf8');
    expect(sql).toMatch(/session_content_completions_player_idx/);

    const completionsSql = readFileSync(
      path.join(REPO_ROOT, 'supabase', 'migrations', '20260721140000_session_content_completions.sql'),
      'utf8',
    );
    expect(completionsSql).toMatch(/session_content_completions_player_select/);
    expect(completionsSql).toMatch(/s\.coach_id = auth\.uid\(\)/);

    const port = readFileSync(SESSION_CONTENT_PORT_PATH, 'utf8');
    expect(port).toMatch(/listPlayerProgress/);
    expect(port).toMatch(/coach dashboard consumption/);

    const repo = readFileSync(SESSION_CONTENT_REPO_PATH, 'utf8');
    expect(repo).toMatch(/async listPlayerProgress/);
    expect(repo).toMatch(/player_progress_load_failed/);
    expect(repo).toMatch(/reps, duration_seconds/);
  });
});
