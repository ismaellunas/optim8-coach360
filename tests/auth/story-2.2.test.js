// STORY-2.2 — Role selection and profile creation.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';
import {
  createMemoryAuthStorage,
  createSupabaseClient,
  SupabaseAppAuthRepository,
  SupabaseProfileRepository,
} from '@coach360/api';
import {
  coachProfileInputSchema,
  isProfileComplete,
  playerProfileInputSchema,
  profileSchema,
} from '@coach360/domain';
import { readSupabaseTestEnv, REPO_ROOT } from '../helpers/supabase-test-env.js';

if (!globalThis.WebSocket) globalThis.WebSocket = ws;

const supabaseEnv = readSupabaseTestEnv();
const runCloudIntegration = Boolean(
  process.env.SUPABASE_RUN_INTEGRATION === '1' &&
    supabaseEnv?.API_URL &&
    supabaseEnv?.ANON_KEY &&
    supabaseEnv?.SERVICE_ROLE_KEY,
);
const describeCloudIntegration = runCloudIntegration ? describe : describe.skip;

const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260706110000_profile_role_fields.sql',
);
const AUTH_FLOW_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'features', 'auth', 'ui', 'AuthFlow.jsx');
const ROLE_SELECT_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'auth',
  'ui',
  'RoleSelectScreen.jsx',
);
const COACH_FORM_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'profile',
  'ui',
  'CoachProfileForm.jsx',
);
const PLAYER_FORM_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'profile',
  'ui',
  'PlayerProfileForm.jsx',
);
const TEAM_MANAGER_FLOW_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'profile',
  'ui',
  'TeamManagerProfileFlow.jsx',
);
const TEAM_SETUP_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'profile',
  'ui',
  'TeamSetupPathScreen.jsx',
);
const PROFILE_GATE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'profile',
  'ui',
  'ProfileGate.jsx',
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

describe('STORY_2_2 AC1 — registration role selection', () => {
  it('test_STORY_2_2_AC1_registration_role_selection: sign-up flow exposes three self-signup roles', () => {
    expect(existsSync(AUTH_FLOW_PATH)).toBe(true);
    const authFlow = readFileSync(AUTH_FLOW_PATH, 'utf8');
    expect(authFlow).toMatch(/sign-up-role/);
    expect(authFlow).toMatch(/RoleSelectScreen/);

    expect(existsSync(ROLE_SELECT_PATH)).toBe(true);
    const roleSelect = readFileSync(ROLE_SELECT_PATH, 'utf8');
    expect(roleSelect).toMatch(/id: 'coach'/);
    expect(roleSelect).toMatch(/id: 'player'/);
    expect(roleSelect).toMatch(/id: 'team_manager'/);
  });
});

describe('STORY_2_2 AC2 — coach profile captures context', () => {
  it('test_STORY_2_2_AC2_coach_profile_captures_context: schema and form capture independent vs team', () => {
    const independent = coachProfileInputSchema.safeParse({ coachContext: 'independent' });
    const team = coachProfileInputSchema.safeParse({ coachContext: 'team' });
    const invalid = coachProfileInputSchema.safeParse({ coachContext: 'club' });

    expect(independent.success).toBe(true);
    expect(team.success).toBe(true);
    expect(invalid.success).toBe(false);

    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/coach_context/);
    expect(sql).toMatch(/independent/);
    expect(sql).toMatch(/team/);

    expect(existsSync(COACH_FORM_PATH)).toBe(true);
    const form = readFileSync(COACH_FORM_PATH, 'utf8');
    expect(form).toMatch(/independent/);
    expect(form).toMatch(/team/);
    expect(form).toMatch(/coach-context/);
  });
});

describe('STORY_2_2 AC3 — player profile fields', () => {
  it('test_STORY_2_2_AC3_player_profile_fields: age and position required, photo optional', () => {
    const valid = playerProfileInputSchema.safeParse({
      age: 16,
      position: 'Point Guard',
    });
    const withPhoto = playerProfileInputSchema.safeParse({
      age: 16,
      position: 'Center',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
    const missingAge = playerProfileInputSchema.safeParse({
      position: 'Center',
    });

    expect(valid.success).toBe(true);
    expect(withPhoto.success).toBe(true);
    expect(missingAge.success).toBe(false);

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/\bage\b/);
    expect(sql).toMatch(/position/);

    expect(existsSync(PLAYER_FORM_PATH)).toBe(true);
    const form = readFileSync(PLAYER_FORM_PATH, 'utf8');
    expect(form).toMatch(/player-profile-age/);
    expect(form).toMatch(/player-profile-position/);
    expect(form).toMatch(/Photo \(optional\)/);
  });
});

describe('STORY_2_2 AC4 — team manager requires team setup path', () => {
  it('test_STORY_2_2_AC4_team_manager_requires_team_setup_path: flow routes to mandatory team setup screen', () => {
    expect(existsSync(TEAM_MANAGER_FLOW_PATH)).toBe(true);
    const flow = readFileSync(TEAM_MANAGER_FLOW_PATH, 'utf8');
    expect(flow).toMatch(/team-setup-path/);
    expect(flow).toMatch(/TeamSetupPathScreen/);
    expect(flow).toMatch(/onEnterTeamSetupPath/);

    expect(existsSync(TEAM_SETUP_PATH)).toBe(true);
    const setup = readFileSync(TEAM_SETUP_PATH, 'utf8');
    expect(setup).toMatch(/SET UP YOUR TEAM/);
    expect(setup).toMatch(/Continue to team setup/);

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/team_setup_path_entered_at/);

    const incomplete = profileSchema.parse({
      id: '00000000-0000-4000-8000-000000000010',
      role: 'team_manager',
      displayName: 'Manager',
      avatarUrl: null,
      bio: null,
      coachContext: null,
      age: null,
      position: null,
      profileCompletedAt: null,
      teamSetupPathEnteredAt: null,
      coachOnboardingCompletedAt: null,
      playerOnboardingCompletedAt: null,
      firstDrillCompletedAt: null,
      playerDrillsCompletedCount: 0,
    });
    expect(isProfileComplete(incomplete)).toBe(false);

    const complete = profileSchema.parse({
      ...incomplete,
      teamSetupPathEnteredAt: new Date().toISOString(),
      profileCompletedAt: new Date().toISOString(),
    });
    expect(isProfileComplete(complete)).toBe(true);

    const postgresTimestamp = profileSchema.parse({
      ...incomplete,
      profileCompletedAt: '2026-07-06T02:46:22.778167+00:00',
      teamSetupPathEnteredAt: '2026-07-06T02:46:22.778167+00:00',
    });
    expect(postgresTimestamp.profileCompletedAt).toBe('2026-07-06T02:46:22.778167+00:00');
  });
});

describe('STORY_2_2 AC5 — profile persists to Supabase', () => {
  it('test_STORY_2_2_AC5_profile_persists_to_supabase: repository and gate persist role-specific profile data', () => {
    expect(existsSync(PROFILE_REPO_PATH)).toBe(true);
    const repo = readFileSync(PROFILE_REPO_PATH, 'utf8');
    expect(repo).toMatch(/updateCoachProfile/);
    expect(repo).toMatch(/updatePlayerProfile/);
    expect(repo).toMatch(/enterTeamSetupPath/);
    expect(repo).toMatch(/from\('profiles'\)/);

    expect(existsSync(PROFILE_GATE_PATH)).toBe(true);
    const gate = readFileSync(PROFILE_GATE_PATH, 'utf8');
    expect(gate).toMatch(/isProfileComplete/);
    expect(gate).toMatch(/ProfileSetupFlow/);
  });
});

describeCloudIntegration('STORY_2_2 AC5 — cloud profile persistence (optional)', () => {
  let admin;
  let appAuth;
  let profiles;
  const createdUserIds = [];

  beforeAll(() => {
    admin = createClient(supabaseEnv.API_URL, supabaseEnv.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const storage = createMemoryAuthStorage();
    const client = createSupabaseClient(
      { url: supabaseEnv.API_URL, anonKey: supabaseEnv.ANON_KEY },
      { storage },
    );
    appAuth = new SupabaseAppAuthRepository(client);
    profiles = new SupabaseProfileRepository(client);
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it('test_STORY_2_2_AC5_cloud_profile_persistence: coach and player profile updates persist', async () => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const coachEmail = `story22.coach.${stamp}@example.com`;
    const coachSignUp = await appAuth.signUp({
      email: coachEmail,
      password: 'story-2.2-pw-123!',
      role: 'coach',
      displayName: 'Story 2.2 Coach',
    });
    expect(coachSignUp.session).not.toBeNull();
    const coachId = coachSignUp.session.user.id;
    createdUserIds.push(coachId);

    const coachProfile = await profiles.updateCoachProfile(coachId, {
      coachContext: 'independent',
      bio: 'Youth coach',
    });
    expect(coachProfile.coachContext).toBe('independent');
    expect(coachProfile.profileCompletedAt).not.toBeNull();

    const { data: coachRow } = await admin
      .from('profiles')
      .select('coach_context, bio, profile_completed_at')
      .eq('id', coachId)
      .single();
    expect(coachRow?.coach_context).toBe('independent');
    expect(coachRow?.bio).toBe('Youth coach');

    await appAuth.signOut();

    const playerEmail = `story22.player.${stamp}@example.com`;
    const playerSignUp = await appAuth.signUp({
      email: playerEmail,
      password: 'story-2.2-pw-123!',
      role: 'player',
      displayName: 'Story 2.2 Player',
    });
    expect(playerSignUp.session).not.toBeNull();
    const playerId = playerSignUp.session.user.id;
    createdUserIds.push(playerId);

    const playerProfile = await profiles.updatePlayerProfile(playerId, {
      age: 17,
      position: 'Shooting Guard',
    });
    expect(playerProfile.age).toBe(17);
    expect(playerProfile.position).toBe('Shooting Guard');

    const managerEmail = `story22.manager.${stamp}@example.com`;
    const managerSignUp = await appAuth.signUp({
      email: managerEmail,
      password: 'story-2.2-pw-123!',
      role: 'team_manager',
      displayName: 'Story 2.2 Manager',
    });
    expect(managerSignUp.session).not.toBeNull();
    const managerId = managerSignUp.session.user.id;
    createdUserIds.push(managerId);

    const managerProfile = await profiles.enterTeamSetupPath(managerId, {
      bio: 'Club manager',
    });
    expect(managerProfile.teamSetupPathEnteredAt).not.toBeNull();
    expect(managerProfile.profileCompletedAt).not.toBeNull();
  });
});
