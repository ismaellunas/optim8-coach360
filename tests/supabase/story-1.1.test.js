// STORY-1.1 — Acceptance tests for Supabase project setup and core schema.
//
// AC-1 (config) runs everywhere. AC-2/AC-3 are integration tests that skip
// gracefully if a local Supabase stack is not reachable. AC-4 reads the
// generated types file.

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

// Supabase Realtime needs a WebSocket polyfill on Node < 22.
if (!globalThis.WebSocket) globalThis.WebSocket = ws;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'supabase', 'config.toml');
const TYPES_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'types', 'database.ts');

const REQUIRED_TABLES = [
  'profiles',
  'teams',
  'rosters',
  'subscriptions',
  'sessions',
  'purchases',
  'drip_progress',
];

function readSupabaseEnv() {
  try {
    const raw = execSync('supabase status -o env', {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
    }).toString();
    const env = {};
    for (const line of raw.split('\n')) {
      const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
      if (match) env[match[1]] = match[2];
    }
    return env;
  } catch {
    return null;
  }
}

const supabaseEnv = readSupabaseEnv();
const integrationReady = Boolean(
  supabaseEnv?.DB_URL && supabaseEnv?.API_URL && supabaseEnv?.SERVICE_ROLE_KEY,
);
const describeIntegration = integrationReady ? describe : describe.skip;

describe('STORY_1_1 AC1 — Supabase services configured', () => {
  it('test_STORY_1_1_AC1_supabase_services_configured: config.toml enables Auth, Realtime, and Storage', () => {
    expect(existsSync(CONFIG_PATH)).toBe(true);
    const config = readFileSync(CONFIG_PATH, 'utf8');

    const sectionEnabled = (section) => {
      const block = config.match(
        new RegExp(`\\[${section}\\][\\s\\S]*?(?=\\n\\[|$)`),
      )?.[0];
      return Boolean(block && /enabled\s*=\s*true/.test(block));
    };

    expect(sectionEnabled('auth'), '[auth] enabled').toBe(true);
    expect(sectionEnabled('realtime'), '[realtime] enabled').toBe(true);
    expect(sectionEnabled('storage'), '[storage] enabled').toBe(true);
  });
});

describeIntegration('STORY_1_1 AC2 — core tables exist', () => {
  let client;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: supabaseEnv.DB_URL });
    await client.connect();
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  it('test_STORY_1_1_AC2_core_tables_exist: all required tables exist in public schema', async () => {
    const { rows } = await client.query(
      `select table_name
         from information_schema.tables
        where table_schema = 'public'
          and table_name = any($1::text[])`,
      [REQUIRED_TABLES],
    );
    const found = rows.map((r) => r.table_name).sort();
    expect(found).toEqual([...REQUIRED_TABLES].sort());
  });
});

describeIntegration('STORY_1_1 AC3 — RLS enforces coach/player/team isolation', () => {
  let admin;
  let coachA;
  let coachB;
  let playerA;
  let teamA;

  const created = { users: [], teams: [] };

  beforeAll(async () => {
    admin = createClient(supabaseEnv.API_URL, supabaseEnv.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const password = 'rls-test-pw-123!';
    const stamp = Date.now();

    const makeUser = async (email, role) => {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      created.users.push(data.user.id);
      await admin
        .from('profiles')
        .update({ role })
        .eq('id', data.user.id)
        .throwOnError();
      // Separate auth-only client so signing in does not demote `admin`
      // from service role to this user.
      const authClient = createClient(supabaseEnv.API_URL, supabaseEnv.ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const signIn = await authClient.auth.signInWithPassword({ email, password });
      if (signIn.error) throw signIn.error;
      const client = createClient(supabaseEnv.API_URL, supabaseEnv.ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${signIn.data.session.access_token}` } },
      });
      return { id: data.user.id, client };
    };

    coachA = await makeUser(`coach-a-${stamp}@coach360.test`, 'coach');
    coachB = await makeUser(`coach-b-${stamp}@coach360.test`, 'coach');
    playerA = await makeUser(`player-a-${stamp}@coach360.test`, 'player');

    const insertTeamA = await admin
      .from('teams')
      .insert({ name: 'Team A', created_by: coachA.id })
      .select()
      .single();
    if (insertTeamA.error) throw insertTeamA.error;
    teamA = insertTeamA.data;
    created.teams.push(teamA.id);

    const insertTeamB = await admin
      .from('teams')
      .insert({ name: 'Team B', created_by: coachB.id })
      .select()
      .single();
    if (insertTeamB.error) throw insertTeamB.error;
    created.teams.push(insertTeamB.data.id);

    await admin
      .from('rosters')
      .insert({ team_id: teamA.id, profile_id: playerA.id, roster_role: 'player' })
      .throwOnError();

    await admin
      .from('sessions')
      .insert({
        coach_id: coachA.id,
        team_id: teamA.id,
        title: 'Team A scrimmage',
        scheduled_at: new Date().toISOString(),
      })
      .throwOnError();
  });

  afterAll(async () => {
    if (!admin) return;
    for (const teamId of created.teams) {
      await admin.from('teams').delete().eq('id', teamId);
    }
    for (const userId of created.users) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it('test_STORY_1_1_AC3_rls_coach_player_team_isolation: cross-team reads are denied', async () => {
    const teamsAsCoachB = await coachB.client.from('teams').select('id').eq('id', teamA.id);
    expect(teamsAsCoachB.error).toBeNull();
    expect(teamsAsCoachB.data).toEqual([]);

    const rosterAsCoachB = await coachB.client
      .from('rosters')
      .select('id')
      .eq('team_id', teamA.id);
    expect(rosterAsCoachB.error).toBeNull();
    expect(rosterAsCoachB.data).toEqual([]);

    const sessionsAsCoachB = await coachB.client
      .from('sessions')
      .select('id')
      .eq('team_id', teamA.id);
    expect(sessionsAsCoachB.error).toBeNull();
    expect(sessionsAsCoachB.data).toEqual([]);

    const teamsAsPlayerA = await playerA.client.from('teams').select('id').eq('id', teamA.id);
    expect(teamsAsPlayerA.error).toBeNull();
    expect(teamsAsPlayerA.data?.map((t) => t.id)).toEqual([teamA.id]);

    const sessionsAsCoachA = await coachA.client
      .from('sessions')
      .select('id')
      .eq('team_id', teamA.id);
    expect(sessionsAsCoachA.error).toBeNull();
    expect(sessionsAsCoachA.data?.length).toBeGreaterThan(0);
  });
});

describe('STORY_1_1 AC4 — generated database types exported', () => {
  it('test_STORY_1_1_AC4_database_types_exported: apps/mobile/src/types/database.ts contains all required tables', () => {
    expect(existsSync(TYPES_PATH)).toBe(true);
    const types = readFileSync(TYPES_PATH, 'utf8');
    expect(types).toMatch(/export\s+(type|interface)\s+Database\b/);
    for (const table of REQUIRED_TABLES) {
      expect(types, `Database type should reference table "${table}"`).toMatch(
        new RegExp(`\\b${table}\\b`),
      );
    }
  });
});
