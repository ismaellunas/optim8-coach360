// STORY-3.1 — team logo storage upload (local integration)

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  createMemoryAuthStorage,
  createSupabaseClient,
  SupabaseTeamRepository,
} from '@coach360/api';
import { readSupabaseTestEnv, REPO_ROOT } from '../helpers/supabase-test-env.js';

const supabaseEnv = readSupabaseTestEnv();
const runLocalIntegration = Boolean(
  process.env.SUPABASE_RUN_INTEGRATION === '1' &&
    supabaseEnv?.API_URL &&
    supabaseEnv?.ANON_KEY &&
    supabaseEnv?.SERVICE_ROLE_KEY &&
    supabaseEnv.source === 'local',
);
const describeLocalIntegration = runLocalIntegration ? describe : describe.skip;

const FIX_MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260721150000_fix_team_logo_storage_policy.sql',
);

describe('STORY_3_1 AC4 — team logo storage policy fix', () => {
  it('test_STORY_3_1_AC4_team_logo_policy_uses_object_path: migration avoids teams.name ambiguity', () => {
    expect(existsSync(FIX_MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(FIX_MIGRATION_PATH, 'utf8');
    expect(sql).toMatch(/can_manage_team_logo/);
    expect(sql).not.toMatch(/storage\.foldername\(t\.name\)/);
  });
});

describeLocalIntegration('STORY_3_1 AC4 — team logo upload (local)', () => {
  let admin;
  let client;
  let teams;
  let userId;

  beforeAll(async () => {
    admin = createClient(supabaseEnv.API_URL, supabaseEnv.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const storage = createMemoryAuthStorage();
    client = createSupabaseClient(
      { url: supabaseEnv.API_URL, anonKey: supabaseEnv.ANON_KEY },
      { storage },
    );
    teams = new SupabaseTeamRepository(client);

    const email = `story-3-1-logo-${Date.now()}@example.com`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { display_name: 'Logo Upload Coach' },
    });
    if (error || !data.user) {
      throw error ?? new Error('create_user_failed');
    }
    userId = data.user.id;

    await admin.from('profiles').upsert({
      id: userId,
      role: 'coach',
      display_name: 'Logo Upload Coach',
    });

    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password: 'TestPassword123!',
    });
    if (signInError) {
      throw signInError;
    }
  });

  afterAll(async () => {
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it('test_STORY_3_1_AC4_team_logo_uploads_for_team_creator: storage accepts logo upload', async () => {
    const created = await teams.createTeam(userId, {
      name: 'Logo Upload Eagles',
      seasonStart: '2026-09-01',
      seasonEnd: '2027-03-31',
    });

    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' });
    const logoUrl = await teams.uploadLogo(created.id, userId, blob, 'logo.png');

    expect(logoUrl).toMatch(/team-logos/);

    const updated = await teams.updateTeam(created.id, userId, {
      name: created.name,
      logoUrl,
    });
    expect(updated.logoUrl).toBe(logoUrl);
  });
});
