// STORY-3.1 — Create and edit team profile.

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
  SupabaseTeamRepository,
} from '@coach360/api';
import {
  canManageTeamAgeRange,
  formatTeamAgeRange,
  formatTeamProfileSummary,
  needsTeamManagerTeamSetup,
  teamProfileInputSchema,
  teamSchema,
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

const CORE_SCHEMA_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260627100000_core_schema.sql',
);
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260706155000_team_profile_fields.sql',
);
const AGE_RANGE_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260706160000_team_age_range_fields.sql',
);
const RULES_PATH = path.join(REPO_ROOT, 'packages', 'domain', 'src', 'team', 'rules.ts');
const GATE_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'team',
  'ui',
  'TeamManagerTeamGate.jsx',
);
const FORM_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'team',
  'ui',
  'TeamProfileForm.jsx',
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
const TEAM_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-team-repository.ts',
);
const CREATE_REPOS_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'di',
  'create-repositories.ts',
);

describe('STORY_3_1 AC1 — team manager creates team in core workflow', () => {
  it('test_STORY_3_1_AC1_team_manager_creates_team_in_core_workflow: gate blocks until team exists', () => {
    expect(existsSync(GATE_PATH)).toBe(true);
    const gate = readFileSync(GATE_PATH, 'utf8');
    expect(gate).toMatch(/team_manager/);
    expect(gate).toMatch(/needsTeamManagerTeamSetup/);
    expect(gate).toMatch(/TeamProfileForm/);
    expect(gate).toMatch(/repos\.teams\.createTeam/);
    expect(gate).toMatch(/listForUser/);
    expect(gate).toMatch(/notice/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/TeamManagerTeamGate/);
    expect(app).toMatch(/SubscriptionGate[\s\S]*TeamManagerTeamGate/);

    expect(gate).toMatch(/canManageAgeRange/);

    expect(canManageTeamAgeRange('team_manager')).toBe(true);
    expect(canManageTeamAgeRange('coach')).toBe(false);

    expect(needsTeamManagerTeamSetup([])).toBe(true);
    const sampleTeam = teamSchema.parse({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'U14 Eagles',
      description: null,
      logoUrl: null,
      ageMin: 12,
      ageMax: 14,
      gradeLevel: '8th grade',
      division: 'Division A',
      seasonStart: '2026-09-01',
      seasonEnd: '2027-03-31',
      createdBy: '00000000-0000-4000-8000-000000000010',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(needsTeamManagerTeamSetup([sampleTeam])).toBe(false);
  });
});

describe('STORY_3_1 AC2 — coach optional create from roster', () => {
  it('test_STORY_3_1_AC2_coach_optional_create_from_roster: roster exposes optional create flow', () => {
    expect(existsSync(ROSTER_PATH)).toBe(true);
    const roster = readFileSync(ROSTER_PATH, 'utf8');
    expect(roster).toMatch(/\+ Create Team/);
    expect(roster).toMatch(/type: 'create'/);
    expect(roster).toMatch(/tryA\('teamManage'/);
    expect(roster).toMatch(/user\?\.role !== 'team_manager'/);

    expect(roster).toMatch(/canManageAgeRange=\{canManageAgeRange\}/);
    expect(roster).toMatch(/session\?\.user\.role === 'team_manager'/);

    const gate = readFileSync(GATE_PATH, 'utf8');
    expect(gate).toMatch(/if \(!isTeamManager\)/);
    expect(gate).toMatch(/canManageAgeRange/);
  });
});

describe('STORY_3_1 AC3 — team settings age range fields', () => {
  it('test_STORY_3_1_AC3_team_settings_age_range_fields: schema and form capture min/max age, grade, division', () => {
    const coreSql = readFileSync(CORE_SCHEMA_PATH, 'utf8');
    expect(coreSql).toMatch(/age_min/);
    expect(coreSql).toMatch(/age_max/);

    const ageRangeSql = readFileSync(AGE_RANGE_MIGRATION_PATH, 'utf8');
    expect(ageRangeSql).toMatch(/grade_level/);
    expect(ageRangeSql).toMatch(/division/);

    expect(existsSync(RULES_PATH)).toBe(true);
    const rules = readFileSync(RULES_PATH, 'utf8');
    expect(rules).toMatch(/canManageTeamAgeRange/);

    expect(() =>
      teamProfileInputSchema.parse({
        name: 'Hawks',
        ageMin: 15,
        ageMax: 12,
      }),
    ).toThrow();

    const parsed = teamProfileInputSchema.parse({
      name: 'Hawks',
      ageMin: 12,
      ageMax: 14,
      gradeLevel: 'U14',
      division: 'Division A',
    });
    expect(parsed.ageMin).toBe(12);
    expect(parsed.ageMax).toBe(14);
    expect(parsed.gradeLevel).toBe('U14');
    expect(parsed.division).toBe('Division A');

    const emptySeason = teamProfileInputSchema.parse({
      name: 'Hawks',
      seasonStart: '',
      seasonEnd: '',
    });
    expect(emptySeason.seasonStart).toBeNull();
    expect(emptySeason.seasonEnd).toBeNull();

    const form = readFileSync(FORM_PATH, 'utf8');
    expect(form).toMatch(/canManageAgeRange/);
    expect(form).toMatch(/team-profile-age-min/);
    expect(form).toMatch(/team-profile-age-max/);
    expect(form).toMatch(/team-profile-grade-level/);
    expect(form).toMatch(/team-profile-division/);
    expect(form).toMatch(/Min age/);
    expect(form).toMatch(/Max age/);
    expect(form).toMatch(/Grade level/);
    expect(form).toMatch(/Division/);
  });
});

describe('STORY_3_1 AC4 — team logo uploads to storage', () => {
  it('test_STORY_3_1_AC4_team_logo_uploads_to_storage: migration and repository use team-logos bucket', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/team-logos/);
    expect(sql).toMatch(/team_logos_coach_insert/);

    expect(existsSync(TEAM_REPO_PATH)).toBe(true);
    const repo = readFileSync(TEAM_REPO_PATH, 'utf8');
    expect(repo).toMatch(/from\('team-logos'\)/);
    expect(repo).toMatch(/uploadLogo/);
    expect(repo).toMatch(/mapTeamError/);

    const form = readFileSync(FORM_PATH, 'utf8');
    expect(form).toMatch(/team-profile-logo/);
    expect(form).toMatch(/accept="image\/\*"/);
  });
});

describe('STORY_3_1 AC5 — team edits persist in roster UI', () => {
  it('test_STORY_3_1_AC5_team_edits_persist_in_roster_ui: repository update/list wired to roster cards', () => {
    expect(existsSync(TEAM_REPO_PATH)).toBe(true);
    const repo = readFileSync(TEAM_REPO_PATH, 'utf8');
    expect(repo).toMatch(/listForUser/);
    expect(repo).toMatch(/updateTeam/);

    const roster = readFileSync(ROSTER_PATH, 'utf8');
    expect(roster).toMatch(/repos\.teams\.listForUser/);
    expect(roster).toMatch(/repos\.teams\.updateTeam/);
    expect(roster).toMatch(/formatTeamProfileSummary/);
    expect(roster).toMatch(/team\.name/);
    expect(roster).toMatch(/team\.logoUrl/);
    expect(roster).toMatch(/type: 'edit'/);

    const repos = readFileSync(CREATE_REPOS_PATH, 'utf8');
    expect(repos).toMatch(/teams: TeamRepository/);
    expect(repos).toMatch(/SupabaseTeamRepository/);

    const team = teamSchema.parse({
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Wolves',
      description: 'Competitive squad',
      logoUrl: 'https://example.com/logo.png',
      ageMin: 10,
      ageMax: 12,
      gradeLevel: '6th grade',
      division: 'Rec',
      seasonStart: '2026-09-01',
      seasonEnd: '2027-03-31',
      createdBy: '00000000-0000-4000-8000-000000000010',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(formatTeamAgeRange(team)).toBe('Ages 10-12');
    expect(formatTeamProfileSummary(team)).toBe('Ages 10-12 · 6th grade · Rec');
  });
});

describeCloudIntegration('STORY_3_1 AC5 — cloud team persistence (optional)', () => {
  let admin;
  let appAuth;
  let teams;
  const createdUserIds = [];

  beforeAll(() => {
    admin = createClient(supabaseEnv.API_URL, supabaseEnv.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const storage = createMemoryAuthStorage();
    const client = createSupabaseClient(
      { url: supabaseEnv.API_URL, anonKey: supabaseEnv.ANON_KEY },
      { storage },
    );
    appAuth = new SupabaseAppAuthRepository(client);
    teams = new SupabaseTeamRepository(client);
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it('test_STORY_3_1_AC5_cloud_team_persistence: create and update team profile', async () => {
    const email = `story-3-1-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const signUp = await appAuth.signUp({
      email,
      password,
      role: 'coach',
      displayName: 'Coach Team Test',
    });
    createdUserIds.push(signUp.user.id);

    const created = await teams.createTeam(signUp.user.id, {
      name: 'Integration Eagles',
      description: 'Test team',
      ageMin: 13,
      ageMax: 15,
      gradeLevel: 'U15',
      division: 'Division B',
      seasonStart: '2026-09-01',
      seasonEnd: '2027-03-31',
    });
    expect(created.name).toBe('Integration Eagles');
    expect(created.gradeLevel).toBe('U15');

    const listed = await teams.listForUser(signUp.user.id);
    expect(listed.some((team) => team.id === created.id)).toBe(true);

    const updated = await teams.updateTeam(created.id, signUp.user.id, {
      name: 'Integration Hawks',
      ageMin: 14,
      ageMax: 16,
      gradeLevel: 'U16',
      division: 'Division A',
    });
    expect(updated.name).toBe('Integration Hawks');
    expect(updated.ageMin).toBe(14);
    expect(updated.division).toBe('Division A');
  });
});
