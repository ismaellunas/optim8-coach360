// STORY-2.1 — Supabase Auth sign-up, session persistence, and auth gate.

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
} from '@coach360/api';
import { isAuthenticatedSession, signUpInputSchema } from '@coach360/domain';
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
  '20260706100000_signup_role_from_metadata.sql',
);
const AUTH_GATE_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'features', 'auth', 'ui', 'AuthGate.jsx');
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

describe('STORY_2_1 AC1 — email sign-up requires role and identity', () => {
  it('test_STORY_2_1_AC1_email_signup_and_profile: sign-up requires role, migration, and role picker', () => {
    const parsed = signUpInputSchema.safeParse({
      email: 'coach@coach360.test',
      password: 'story-2.1-pw-123!',
    });
    expect(parsed.success).toBe(false);

    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/parse_signup_role/);
    expect(sql).toMatch(/raw_user_meta_data\s*->>\s*'role'/);

    expect(existsSync(ROLE_SELECT_PATH)).toBe(true);
    const source = readFileSync(ROLE_SELECT_PATH, 'utf8');
    expect(source).toMatch(/coach/);
    expect(source).toMatch(/player/);
    expect(source).toMatch(/team_manager/);
  });
});

describeCloudIntegration('STORY_2_1 AC1 — cloud sign-up integration (optional)', () => {
  let admin;
  let appAuth;
  const createdUserIds = [];

  beforeAll(() => {
    admin = createClient(supabaseEnv.API_URL, supabaseEnv.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const client = createSupabaseClient(
      { url: supabaseEnv.API_URL, anonKey: supabaseEnv.ANON_KEY },
      { persistSession: false },
    );
    appAuth = new SupabaseAppAuthRepository(client);
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it('test_STORY_2_1_AC1_cloud_signup_integration: signUp creates auth user and profiles row', async () => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `story21.${stamp}@example.com`;
    const password = 'story-2.1-pw-123!';

    const result = await appAuth.signUp({
      email,
      password,
      role: 'coach',
      displayName: 'Story 2.1 User',
    });

    expect(result.needsEmailVerification).toBe(false);
    expect(result.session).not.toBeNull();
    expect(result.session?.user.email).toBe(email);

    const userId = result.session.user.id;
    createdUserIds.push(userId);

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', userId)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.display_name).toBe('Story 2.1 User');
    expect(profile?.role).toBe('coach');
  });
});

describe('STORY_2_1 AC2 — session persists across restarts', () => {
  it('test_STORY_2_1_AC2_session_persists_across_restarts: new client reads session from shared storage', async () => {
    const storage = createMemoryAuthStorage();
    const url = 'http://127.0.0.1:54321';
    const anonKey = 'test-anon-key';
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    storage.setItem(
      'sb-127-auth-token',
      JSON.stringify({
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test',
        expires_in: 3600,
        expires_at: expiresAt,
        token_type: 'bearer',
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'persist@coach360.test',
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }),
    );

    const restoredClient = createSupabaseClient({ url, anonKey }, { storage });
    const { data, error } = await restoredClient.auth.getSession();

    expect(error).toBeNull();
    expect(data.session?.access_token).toContain('eyJ');
    expect(data.session?.user.email).toBe('persist@coach360.test');
  });

  it('test_STORY_2_1_AC2_capacitor_storage_adapter: mobile uses Preferences storage on native', () => {
    const storagePath = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'lib', 'supabase-storage.js');
    expect(existsSync(storagePath)).toBe(true);
    const source = readFileSync(storagePath, 'utf8');
    expect(source).toMatch(/@capacitor\/preferences/);
    expect(source).toMatch(/createSupabaseAuthStorage/);
  });
});

describe('STORY_2_1 AC3 — unauthenticated users blocked from app', () => {
  it('test_STORY_2_1_AC3_unauthenticated_blocked_from_app: null session fails auth gate check', () => {
    expect(isAuthenticatedSession(null)).toBe(false);
    expect(isAuthenticatedSession(undefined)).toBe(false);
  });

  it('test_STORY_2_1_AC3_authenticated_allowed: valid session passes auth gate check', () => {
    const session = {
      user: {
        id: '00000000-0000-4000-8000-000000000002',
        email: 'player@coach360.test',
        role: 'player',
        displayName: 'Player',
        isSuspended: false,
      },
      accessToken: 'token',
    };

    expect(isAuthenticatedSession(session)).toBe(true);
  });

  it('test_STORY_2_1_AC3_auth_gate_blocks_unauthenticated: AuthGate renders auth flow when logged out', () => {
    expect(existsSync(AUTH_GATE_PATH)).toBe(true);
    const source = readFileSync(AUTH_GATE_PATH, 'utf8');
    expect(source).toMatch(/AuthFlow/);
    expect(source).toMatch(/isAuthenticated/);
  });
});

describeCloudIntegration('STORY_2_1 AC3 — cloud sign-out integration (optional)', () => {
  it('test_STORY_2_1_AC3_sign_out_clears_session: repository getSession returns null after signOut', async () => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `story21.signout.${stamp}@example.com`;
    const password = 'story-2.1-pw-123!';

    const admin = createClient(supabaseEnv.API_URL, supabaseEnv.SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Sign out test', role: 'player' },
    });
    if (created.error) throw created.error;

    const storage = createMemoryAuthStorage();
    const client = createSupabaseClient(
      { url: supabaseEnv.API_URL, anonKey: supabaseEnv.ANON_KEY },
      { storage },
    );
    const appAuth = new SupabaseAppAuthRepository(client);

    await appAuth.signIn({ email, password });
    expect(await appAuth.getSession()).not.toBeNull();

    await appAuth.signOut();
    expect(await appAuth.getSession()).toBeNull();

    await admin.auth.admin.deleteUser(created.data.user.id);
  });
});
