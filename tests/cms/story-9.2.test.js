// STORY-9.2 — Coach content creation on mobile.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  buildMuxDirectUploadBody,
  createMuxDirectUpload,
  muxBasicAuthHeader,
  parseMuxUploadResponse,
} from '../../supabase/functions/create-mux-upload/handler.ts';
import {
  buildSessionPrefillFromLibraryItem,
  createCoachLibraryItemInputSchema,
  createCoachPackageInputSchema,
  normalizePackageItemIds,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const CREATE_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'content',
  'ui',
  'CreateContentScreen.jsx',
);
const LIBRARY_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'content',
  'ui',
  'CoachLibraryScreen.jsx',
);
const APP_PATH = path.join(REPO_ROOT, 'apps', 'mobile', 'src', 'App.jsx');
const SCHEDULE_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'schedule',
  'ui',
  'ScheduleScreen.jsx',
);
const LIBRARY_PORT = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'library-repository.ts',
);
const LIBRARY_REPO = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-library-repository.ts',
);
const SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260722150000_coach_library_create_content.sql',
);
const MUX_HANDLER = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'create-mux-upload',
  'handler.ts',
);
const MUX_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'create-mux-upload',
  'index.ts',
);

describe('STORY_9_2 AC1 — coach creates drill with title, instructions, optional media', () => {
  it('test_STORY_9_2_AC1_create_drill_with_title_instructions_media', () => {
    const parsed = createCoachLibraryItemInputSchema.parse({
      kind: 'drill',
      title: 'Crossover Drill',
      instructions: '10 reps each side',
      mediaUrl: 'https://example.com/diagram.png',
    });
    expect(parsed.kind).toBe('drill');
    expect(parsed.instructions).toBe('10 reps each side');
    expect(parsed.mediaUrl).toContain('diagram');

    expect(() =>
      createCoachLibraryItemInputSchema.parse({
        kind: 'drill',
        title: 'No instructions',
      }),
    ).toThrow();

    const port = readFileSync(LIBRARY_PORT, 'utf8');
    expect(port).toMatch(/createItem/);
    expect(port).toMatch(/uploadMedia/);

    const repo = readFileSync(LIBRARY_REPO, 'utf8');
    expect(repo).toMatch(/from\('coach_library_items'\)/);
    expect(repo).toMatch(/instructions/);
    expect(repo).toMatch(/coach-library-media/);

    const sql = readFileSync(SQL_PATH, 'utf8');
    expect(sql).toMatch(/add column if not exists instructions/);
    expect(sql).toMatch(/coach-library-media/);

    const ui = readFileSync(CREATE_UI, 'utf8');
    expect(ui).toMatch(/create-content-type-\$\{t\.id\}|create-content-type-drill/);
    expect(ui).toMatch(/id:\s*'drill'/);
    expect(ui).toMatch(/create-content-instructions/);
    expect(ui).toMatch(/create-content-media-picker/);
    expect(ui).toMatch(/repos\.library\.createItem/);
    expect(ui).toMatch(/Save to library/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/CreateContentScreen/);
    expect(app).not.toMatch(/function CreateContentScreen/);
  });
});

describe('STORY_9_2 AC2 — video upload initiates Mux pipeline', () => {
  it('test_STORY_9_2_AC2_video_upload_initiates_mux', async () => {
    const body = buildMuxDirectUploadBody('http://localhost:5173', '11111111-1111-1111-8111-111111111111');
    expect(body.cors_origin).toBe('http://localhost:5173');
    expect(body.new_asset_settings.passthrough).toMatch(/11111111/);

    const auth = muxBasicAuthHeader('token-id', 'token-secret');
    expect(auth.startsWith('Basic ')).toBe(true);

    const parsed = parseMuxUploadResponse({
      data: { id: 'upload_abc', url: 'https://storage.googleapis.com/mux-upload' },
    });
    expect(parsed.uploadId).toBe('upload_abc');
    expect(parsed.uploadUrl).toContain('mux-upload');

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: { id: 'upload_xyz', url: 'https://example.com/put' },
      }),
    }));
    const result = await createMuxDirectUpload({
      tokenId: 'id',
      tokenSecret: 'secret',
      corsOrigin: '*',
      libraryItemId: '11111111-1111-1111-8111-111111111111',
      fetchImpl,
    });
    expect(result.uploadId).toBe('upload_xyz');
    expect(fetchImpl).toHaveBeenCalled();

    expect(existsSync(MUX_HANDLER)).toBe(true);
    expect(existsSync(MUX_INDEX)).toBe(true);
    const indexSrc = readFileSync(MUX_INDEX, 'utf8');
    expect(indexSrc).toMatch(/MUX_TOKEN_ID/);
    expect(indexSrc).toMatch(/MUX_TOKEN_SECRET/);
    expect(indexSrc).toMatch(/createMuxDirectUpload/);
    expect(indexSrc).toMatch(/transcode_status:\s*'pending'/);

    const port = readFileSync(LIBRARY_PORT, 'utf8');
    expect(port).toMatch(/initiateVideoUpload/);

    const repo = readFileSync(LIBRARY_REPO, 'utf8');
    expect(repo).toMatch(/create-mux-upload/);

    const ui = readFileSync(CREATE_UI, 'utf8');
    expect(ui).toMatch(/initiateVideoUpload/);
    expect(ui).toMatch(/putVideoToMux|Uploading video to Mux/);
    expect(ui).toMatch(/mux-pending-status/);

    const sql = readFileSync(SQL_PATH, 'utf8');
    expect(sql).toMatch(/mux_upload_id/);
    expect(sql).toMatch(/transcode_status/);
  });
});

describe('STORY_9_2 AC3 — bundle into package or attach to session', () => {
  it('test_STORY_9_2_AC3_bundle_package_or_attach_session', () => {
    const ids = normalizePackageItemIds([
      '11111111-1111-1111-8111-111111111111',
      '11111111-1111-1111-8111-111111111111',
      '22222222-2222-2222-8222-222222222222',
    ]);
    expect(ids).toHaveLength(2);

    const pkg = createCoachPackageInputSchema.parse({
      title: 'Weekend Pack',
      itemIds: ids,
    });
    expect(pkg.title).toBe('Weekend Pack');

    const prefill = buildSessionPrefillFromLibraryItem({
      id: '11111111-1111-1111-8111-111111111111',
      kind: 'drill',
      title: 'Crossover Drill',
    });
    expect(prefill.contentRefs[0].source).toBe('library');
    expect(prefill.contentRefs[0].kind).toBe('drill');

    const port = readFileSync(LIBRARY_PORT, 'utf8');
    expect(port).toMatch(/createPackage/);

    const repo = readFileSync(LIBRARY_REPO, 'utf8');
    expect(repo).toMatch(/kind:\s*'package'/);
    expect(repo).toMatch(/item_ids/);

    const libraryUi = readFileSync(LIBRARY_UI, 'utf8');
    expect(libraryUi).toMatch(/createPackage/);
    expect(libraryUi).toMatch(/coach-library-create-package/);
    expect(libraryUi).toMatch(/buildSessionPrefillFromLibraryItem/);

    const createUi = readFileSync(CREATE_UI, 'utf8');
    expect(createUi).toMatch(/create-content-attach-session/);
    expect(createUi).toMatch(/create-content-build-package/);

    const schedule = readFileSync(SCHEDULE_UI, 'utf8');
    expect(schedule).toMatch(/prefillCreate\.contentRefs/);
    expect(schedule).toMatch(/STORY-9\.2/);

    const sql = readFileSync(SQL_PATH, 'utf8');
    expect(sql).toMatch(/item_ids/);
  });
});

describe('STORY_9_2 AC4 — created content appears in coach library immediately', () => {
  it('test_STORY_9_2_AC4_created_content_in_library', () => {
    const createUi = readFileSync(CREATE_UI, 'utf8');
    expect(createUi).toMatch(/create-content-view-library/);
    expect(createUi).toMatch(/create-content-success/);
    expect(createUi).toMatch(/Save to library/);

    const libraryUi = readFileSync(LIBRARY_UI, 'utf8');
    expect(libraryUi).toMatch(/listCoachLibrary/);
    expect(libraryUi).toMatch(/coach-library-list/);
    expect(libraryUi).toMatch(/MY LIBRARY/);

    const app = readFileSync(APP_PATH, 'utf8');
    expect(app).toMatch(/CoachLibraryScreen/);
    expect(app).toMatch(/coach-library/);
    expect(app).toMatch(/onViewLibrary/);

    const repo = readFileSync(LIBRARY_REPO, 'utf8');
    expect(repo).toMatch(/order\('created_at',\s*\{\s*ascending:\s*false\s*\}\)/);
  });
});
