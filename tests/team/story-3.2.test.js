// STORY-3.2 — Player invite and roster join flow.

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
  SupabaseRosterRepository,
  SupabaseTeamRepository,
} from '@coach360/api';
import {
  FEATURE_TIER_REQUIREMENTS,
  allowsMultipleTeamMembership,
  buildInviteLink,
  canGenerateTeamInvite,
  canManuallyAddRosterPlayer,
  mapInviteErrorMessage,
  normalizeInviteCode,
  validateTeamInvite,
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
  '20260708120000_team_invites.sql',
);
const ACCESS_PATH = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'team', 'access.ts');
const INVITE_RULES_PATH = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'team', 'invite-rules.ts');
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
const TEAM_INVITE_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'roster',
  'ui',
  'TeamInviteScreen.jsx',
);
const MANUAL_ADD_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'roster',
  'ui',
  'ManualAddPlayerForm.jsx',
);
const JOIN_SCREEN_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'roster',
  'ui',
  'PlayerJoinTeamScreen.jsx',
);
const TEAM_CONTEXT_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'roster',
  'ui',
  'PlayerTeamContext.jsx',
);
const ROSTER_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'roster',
  'ui',
  'RosterScreen.jsx',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const PLAYER_ONBOARDING_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'onboarding',
  'ui',
  'PlayerOnboardingWizard.jsx',
);

describe('STORY_3_2 AC1 — coach advanced generates invite link or code', () => {
  it('test_STORY_3_2_AC1_coach_advanced_generates_invite_link_or_code: domain gate, repo, and invite UI wired', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/team_invites/);
    expect(sql).toMatch(/accept_team_invite/);

    expect(existsSync(ACCESS_PATH)).toBe(true);
    expect(canGenerateTeamInvite('coach', { tier: 'advanced', status: 'active' })).toBe(true);
    expect(canGenerateTeamInvite('coach', { tier: 'basic', status: 'active' })).toBe(false);

    const repo = readFileSync(ROSTER_REPO_PATH, 'utf8');
    expect(repo).toMatch(/createInvite/);
    expect(repo).toMatch(/buildInviteLink/);

    const inviteScreen = readFileSync(TEAM_INVITE_SCREEN_PATH, 'utf8');
    expect(inviteScreen).toMatch(/repos\.rosters\.createInvite/);
    expect(inviteScreen).toMatch(/invite\.code/);
    expect(inviteScreen).toMatch(/invite\.inviteUrl/);

    const roster = readFileSync(ROSTER_PATH, 'utf8');
    expect(roster).toMatch(/TeamInviteScreen/);
    expect(roster).toMatch(/type: 'invite'/);
    expect(roster).toMatch(/tryA\('invitePlayers'/);

    // Centralized RBAC map (STORY-5.1) keeps invite gating at coach Advanced+.
    expect(FEATURE_TIER_REQUIREMENTS.invitePlayers).toEqual({ coach: 'advanced', team: 'basic' });
  });
});

describe('STORY_3_2 AC2 — team manager basic invite and manual add', () => {
  it('test_STORY_3_2_AC2_team_manager_basic_invite_and_manual_add: tier gate and manual add wired', () => {
    expect(canGenerateTeamInvite('team_manager', { tier: 'basic', status: 'active' })).toBe(true);
    expect(canGenerateTeamInvite('team_manager', { tier: 'trial', status: 'trialing' })).toBe(true);
    expect(canManuallyAddRosterPlayer('team_manager', { tier: 'basic', status: 'active' })).toBe(
      true,
    );

    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/add_player_to_roster_by_email/);

    const repo = readFileSync(ROSTER_REPO_PATH, 'utf8');
    expect(repo).toMatch(/addPlayerByEmail/);

    const manualAdd = readFileSync(MANUAL_ADD_PATH, 'utf8');
    expect(manualAdd).toMatch(/manual-add-player-email/);
    expect(manualAdd).toMatch(/Manually add player/);

    const inviteScreen = readFileSync(TEAM_INVITE_SCREEN_PATH, 'utf8');
    expect(inviteScreen).toMatch(/ManualAddPlayerForm/);
    expect(inviteScreen).toMatch(/repos\.rosters\.addPlayerByEmail/);
  });
});

describe('STORY_3_2 AC3 — player accept invite sees team context', () => {
  it('test_STORY_3_2_AC3_player_accept_invite_sees_team_context: accept flow and player home context wired', () => {
    const repo = readFileSync(ROSTER_REPO_PATH, 'utf8');
    expect(repo).toMatch(/acceptInvite/);
    expect(repo).toMatch(/accept_team_invite/);
    expect(repo).toMatch(/listMemberTeams/);

    const joinScreen = readFileSync(JOIN_SCREEN_PATH, 'utf8');
    expect(joinScreen).toMatch(/repos\.rosters\.acceptInvite/);
    expect(joinScreen).toMatch(/player-join-invite-code/);

    const teamContext = readFileSync(TEAM_CONTEXT_PATH, 'utf8');
    expect(teamContext).toMatch(/repos\.rosters\.listMemberTeams/);
    expect(teamContext).toMatch(/Your teams/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/PlayerTeamContext/);
    expect(app).toMatch(/PlayerJoinTeamScreen/);
    expect(app).toMatch(/join-team/);

    const onboarding = readFileSync(PLAYER_ONBOARDING_PATH, 'utf8');
    expect(onboarding).toMatch(/onAcceptInvite/);
    expect(onboarding).toMatch(/Join team/);
  });
});

describe('STORY_3_2 AC4 — invalid or expired invite shows clear error', () => {
  it('test_STORY_3_2_AC4_invalid_or_expired_invite_shows_clear_error: domain validation and UI error copy', () => {
    expect(existsSync(INVITE_RULES_PATH)).toBe(true);

    expect(
      validateTeamInvite({
        status: 'active',
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    ).toBe('invite_expired');

    expect(
      validateTeamInvite({
        status: 'revoked',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBe('invite_revoked');

    expect(validateTeamInvite(null)).toBe('invite_not_found');
    expect(mapInviteErrorMessage('invite_expired')).toMatch(/expired/i);
    expect(mapInviteErrorMessage('invite_not_found')).toMatch(/not valid/i);

    const joinScreen = readFileSync(JOIN_SCREEN_PATH, 'utf8');
    expect(joinScreen).toMatch(/mapInviteErrorMessage/);
    expect(joinScreen).toMatch(/validateTeamInvite/);
    expect(joinScreen).toMatch(/text-coach-red/);

    const rosterRepo = readFileSync(
      path.join(REPO_ROOT, 'packages', 'api', 'src', 'adapters', 'supabase', 'map-roster-error.ts'),
      'utf8',
    );
    expect(rosterRepo).toMatch(/mapInviteErrorMessage/);
  });
});

describe('STORY_3_2 AC5 — multi team membership allowed', () => {
  it('test_STORY_3_2_AC5_multi_team_membership_allowed: interim Q11.2 default allows multiple teams', () => {
    expect(allowsMultipleTeamMembership()).toBe(true);

    const rules = readFileSync(INVITE_RULES_PATH, 'utf8');
    expect(rules).toMatch(/allowsMultipleTeamMembership/);
    expect(rules).toMatch(/Q11\.2/);

    const repos = readFileSync(CREATE_REPOS_PATH, 'utf8');
    expect(repos).toMatch(/rosters: RosterRepository/);
    expect(repos).toMatch(/SupabaseRosterRepository/);

    expect(buildInviteLink('abcd1234', 'https://example.com')).toBe(
      'https://example.com/join?invite=ABCD1234',
    );
    expect(normalizeInviteCode(' abcd1234 ')).toBe('ABCD1234');
  });
});

describeCloudIntegration('STORY_3_2 — cloud invite accept flow (optional)', () => {
  let admin;
  let coachAuth;
  let playerAuth;
  let coachTeams;
  let coachRosters;
  let playerRosters;
  const createdUserIds = [];

  beforeAll(() => {
    admin = createClient(supabaseEnv.API_URL, supabaseEnv.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const coachStorage = createMemoryAuthStorage();
    const coachClient = createSupabaseClient(
      { url: supabaseEnv.API_URL, anonKey: supabaseEnv.ANON_KEY },
      { storage: coachStorage },
    );
    coachAuth = new SupabaseAppAuthRepository(coachClient);
    coachTeams = new SupabaseTeamRepository(coachClient);
    coachRosters = new SupabaseRosterRepository(coachClient);

    const playerStorage = createMemoryAuthStorage();
    const playerClient = createSupabaseClient(
      { url: supabaseEnv.API_URL, anonKey: supabaseEnv.ANON_KEY },
      { storage: playerStorage },
    );
    playerAuth = new SupabaseAppAuthRepository(playerClient);
    playerRosters = new SupabaseRosterRepository(playerClient);
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it('test_STORY_3_2_cloud_invite_accept_flow: coach creates invite and player joins roster', async () => {
    const coachEmail = `story-3-2-coach-${Date.now()}@example.com`;
    const playerEmail = `story-3-2-player-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const coachSignUp = await coachAuth.signUp({
      email: coachEmail,
      password,
      role: 'coach',
      displayName: 'Invite Coach',
    });
    createdUserIds.push(coachSignUp.user.id);

    const team = await coachTeams.createTeam(coachSignUp.user.id, {
      name: 'Invite Integration Team',
    });

    const invite = await coachRosters.createInvite(team.id, coachSignUp.user.id, {
      origin: 'https://example.com',
    });
    expect(invite.code).toMatch(/^[A-Z0-9]+$/);
    expect(invite.inviteUrl).toContain(invite.code);

    const playerSignUp = await playerAuth.signUp({
      email: playerEmail,
      password,
      role: 'player',
      displayName: 'Invite Player',
    });
    createdUserIds.push(playerSignUp.user.id);

    const accepted = await playerRosters.acceptInvite(invite.code, playerSignUp.user.id);
    expect(accepted.teamId).toBe(team.id);

    const memberTeams = await playerRosters.listMemberTeams(playerSignUp.user.id);
    expect(memberTeams.some((item) => item.id === team.id)).toBe(true);
  });
});
