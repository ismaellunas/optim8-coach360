// STORY-3.3 — Roster management and coach assignment.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  canAssignCoachToTeam,
  canManageFullRoster,
  canRemoveRosterPlayer,
} from '@coach360/domain';
import { ConsoleNotificationRepository } from '../../packages/api/src/adapters/console/console-notification-repository.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const ACCESS_PATH = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'team', 'access.ts');
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260708200000_roster_manage_and_assign.sql',
);
const ROSTER_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'roster',
  'ui',
  'RosterScreen.jsx',
);
const MANAGE_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'roster',
  'ui',
  'RosterManageScreen.jsx',
);
const ROSTER_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-roster-repository.ts',
);
const CREATE_REPOS_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'di',
  'create-repositories.ts',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');

describe('STORY_3_3 AC1 — coach advanced can remove players', () => {
  it('test_STORY_3_3_AC1_coach_advanced_can_remove_players: access helper and roster removal wired', () => {
    expect(canRemoveRosterPlayer('coach', { tier: 'advanced', status: 'active' })).toBe(true);
    expect(canRemoveRosterPlayer('coach', { tier: 'basic', status: 'active' })).toBe(false);
    expect(canRemoveRosterPlayer('team_manager', { tier: 'basic', status: 'active' })).toBe(true);

    const access = readFileSync(ACCESS_PATH, 'utf8');
    expect(access).toMatch(/canRemoveRosterPlayer/);
    expect(access).toMatch(/coaches remove players at Advanced\+/);

    const migration = readFileSync(MIGRATION_PATH, 'utf8');
    expect(migration).toMatch(/create or replace function public\.remove_roster_member/);
    expect(migration).toMatch(/roster_role = 'player'/);
    expect(migration).toMatch(/status = 'removed'/);

    const rosterRepo = readFileSync(ROSTER_REPO_PATH, 'utf8');
    expect(rosterRepo).toMatch(/async removeMember/);
    expect(rosterRepo).toMatch(/remove_roster_member/);

    const rosterScreen = readFileSync(ROSTER_SCREEN_PATH, 'utf8');
    expect(rosterScreen).toMatch(/canRemoveRosterPlayer/);
    expect(rosterScreen).toMatch(/Remove/);
    expect(rosterScreen).toMatch(/repos\.rosters\.removeMember/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/removePlayers: \{ coach: "advanced", team: "basic" \}/);
  });
});

describe('STORY_3_3 AC2 — team manager basic manages full roster', () => {
  it('test_STORY_3_3_AC2_team_manager_basic_manages_full_roster: roster screen exposes full roster management', () => {
    expect(canManageFullRoster('team_manager', { tier: 'basic', status: 'active' })).toBe(true);
    expect(canManageFullRoster('coach', { tier: 'basic', status: 'active' })).toBe(false);

    expect(existsSync(MANAGE_SCREEN_PATH)).toBe(true);
    const manageScreen = readFileSync(MANAGE_SCREEN_PATH, 'utf8');
    expect(manageScreen).toMatch(/MANAGE ROSTER/);
    expect(manageScreen).toMatch(/Team members/);
    expect(manageScreen).toMatch(/Badge/);
    expect(manageScreen).toMatch(/Player/);
    expect(manageScreen).toMatch(/Assistant coach/);
    expect(manageScreen).toMatch(/Manager/);

    const rosterScreen = readFileSync(ROSTER_SCREEN_PATH, 'utf8');
    expect(rosterScreen).toMatch(/type: 'roster'/);
    expect(rosterScreen).toMatch(/RosterManageScreen/);
    expect(rosterScreen).toMatch(/teamMembers = rosterMembers\.filter/);
  });
});

describe('STORY_3_3 AC3 — assign coach gated by tier', () => {
  it('test_STORY_3_3_AC3_assign_coach_pro_for_coaches: coach assignment follows matrix and repo wiring', () => {
    expect(canAssignCoachToTeam('coach', { tier: 'advanced', status: 'active' })).toBe(false);
    expect(canAssignCoachToTeam('coach', { tier: 'pro', status: 'active' })).toBe(true);
    expect(canAssignCoachToTeam('team_manager', { tier: 'advanced', status: 'active' })).toBe(true);
    expect(canAssignCoachToTeam('team_manager', { tier: 'basic', status: 'active' })).toBe(false);

    const migration = readFileSync(MIGRATION_PATH, 'utf8');
    expect(migration).toMatch(/assign_coach_to_team_by_email/);
    expect(migration).toMatch(/assistant_coach/);
    expect(migration).toMatch(/coach_not_found/);

    const rosterRepo = readFileSync(ROSTER_REPO_PATH, 'utf8');
    expect(rosterRepo).toMatch(/async assignCoachByEmail/);
    expect(rosterRepo).toMatch(/assign_coach_to_team_by_email/);

    const manageScreen = readFileSync(MANAGE_SCREEN_PATH, 'utf8');
    expect(manageScreen).toMatch(/Assign coach/);
    expect(manageScreen).toMatch(/assign-coach-email/);
    expect(manageScreen).toMatch(/Coach email/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/assignCoach: \{ coach: "pro", team: "advanced" \}/);
  });
});

describe('STORY_3_3 AC4 — roster changes notify affected players', () => {
  it('test_STORY_3_3_AC4_roster_change_notifies_affected_players: notification adapter and enqueue calls exist', () => {
    const createRepos = readFileSync(CREATE_REPOS_PATH, 'utf8');
    expect(createRepos).toMatch(/notifications: new ConsoleNotificationRepository/);

    const rosterScreen = readFileSync(ROSTER_SCREEN_PATH, 'utf8');
    expect(rosterScreen).toMatch(/repos\.notifications\.enqueueRosterChange/);
    expect(rosterScreen).toMatch(/roster_member_removed/);
    expect(rosterScreen).toMatch(/coach_assigned_to_team/);

    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const repo = new ConsoleNotificationRepository();
    repo.enqueueRosterChange({
      event: 'roster_member_removed',
      teamId: '00000000-0000-4000-8000-000000000001',
      profileId: '00000000-0000-4000-8000-000000000002',
      triggeredBy: '00000000-0000-4000-8000-000000000003',
    });
    expect(debug).toHaveBeenCalledWith(
      '[notifications]',
      'roster_member_removed',
      expect.objectContaining({
        teamId: '00000000-0000-4000-8000-000000000001',
        profileId: '00000000-0000-4000-8000-000000000002',
      }),
    );
    debug.mockRestore();
  });
});
