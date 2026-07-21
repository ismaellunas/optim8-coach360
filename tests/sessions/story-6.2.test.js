// STORY-6.2 — Attach content to sessions (OQ-3.3 both, OQ-3.4 package as unit).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  attachContentRef,
  normalizeContentRefs,
  sessionContentRefSchema,
  sessionInputSchema,
  sessionSchema,
} from '@coach360/domain';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const UI_PATH = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'schedule',
  'ui',
  'ScheduleScreen.jsx',
);
const CONTENT_REFS_PATH = path.join(
  REPO_ROOT,
  'packages',
  'domain',
  'src',
  'session',
  'content-refs.ts',
);
const MAPPER_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'mappers',
  'session-mapper.ts',
);
const SESSION_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-session-repository.ts',
);
const LIBRARY_REPO_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-library-repository.ts',
);
const LIBRARY_PORT_PATH = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'ports',
  'library-repository.ts',
);
const DI_PATH = path.join(REPO_ROOT, 'packages', 'api', 'src', 'di', 'create-repositories.ts');
const SQL_PATH = path.join(
  REPO_ROOT,
  'supabase',
  'migrations',
  '20260721090000_session_content_and_coach_library.sql',
);

describe('STORY_6_2 AC1 — coach selects content from personal library', () => {
  it('test_STORY_6_2_AC1_coach_selects_content_from_personal_library: library list + attach wired', () => {
    const attached = attachContentRef([], {
      kind: 'drill',
      source: 'library',
      id: '11111111-1111-1111-8111-111111111111',
      title: 'Ball Handling Ladder',
    });
    expect(attached).toHaveLength(1);
    expect(attached[0].source).toBe('library');
    expect(attached[0].sortOrder).toBe(0);

    const libraryPort = readFileSync(LIBRARY_PORT_PATH, 'utf8');
    expect(libraryPort).toMatch(/listCoachLibrary/);

    const libraryRepo = readFileSync(LIBRARY_REPO_PATH, 'utf8');
    expect(libraryRepo).toMatch(/from\('coach_library_items'\)/);

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/repos\.library\.listCoachLibrary/);
    expect(ui).toMatch(/pickerTab === 'library'/);
    expect(ui).toMatch(/\+ Add content/);

    const sql = readFileSync(SQL_PATH, 'utf8');
    expect(sql).toMatch(/create table if not exists public\.coach_library_items/);

    const di = readFileSync(DI_PATH, 'utf8');
    expect(di).toMatch(/library: new SupabaseLibraryRepository/);
  });
});

describe('STORY_6_2 AC2 — marketplace purchased content attachable (OQ-3.3 both)', () => {
  it('test_STORY_6_2_AC2_marketplace_purchased_content_attachable: purchase source + picker tab', () => {
    const ref = sessionContentRefSchema.parse({
      kind: 'package',
      source: 'purchase',
      id: 'elite-shooting-system',
      title: 'Elite Shooting System',
      sortOrder: 0,
    });
    expect(ref.source).toBe('purchase');
    expect(ref.kind).toBe('package');

    expect(() =>
      sessionContentRefSchema.parse({
        kind: 'drill',
        source: 'purchase',
        id: 'x',
        title: 'Nope',
        sortOrder: 0,
      }),
    ).toThrow();

    const libraryRepo = readFileSync(LIBRARY_REPO_PATH, 'utf8');
    expect(libraryRepo).toMatch(/listPurchasedContent/);
    expect(libraryRepo).toMatch(/from\('purchases'\)/);

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/repos\.library\.listPurchasedContent/);
    expect(ui).toMatch(/pickerTab === 'purchased'|setPickerTab\('purchased'\)/);
    expect(ui).toMatch(/Purchased/);

    const contentRefs = readFileSync(CONTENT_REFS_PATH, 'utf8');
    expect(contentRefs).toMatch(/'purchase'/);
  });
});

describe('STORY_6_2 AC3 — ordered content list on session detail', () => {
  it('test_STORY_6_2_AC3_ordered_content_list_on_session_detail: content_refs round-trip + UI list', () => {
    const refs = normalizeContentRefs([
      {
        kind: 'video',
        source: 'library',
        id: 'a',
        title: 'Form Shooting Demo',
        sortOrder: 99,
      },
      {
        kind: 'drill',
        source: 'library',
        id: 'b',
        title: 'Ladder',
        sortOrder: 5,
      },
    ]);
    expect(refs.map((r) => r.sortOrder)).toEqual([0, 1]);

    const parsed = sessionInputSchema.parse({
      title: 'Practice',
      scheduledAt: '2026-07-21T08:00:00.000Z',
      durationMinutes: 60,
      sessionType: 'practice',
      teamId: '11111111-1111-1111-8111-111111111111',
      playerId: null,
      contentRefs: refs,
    });
    expect(parsed.contentRefs).toHaveLength(2);

    const session = sessionSchema.parse({
      id: '22222222-2222-2222-8222-222222222222',
      coachId: '33333333-3333-3333-8333-333333333333',
      teamId: '11111111-1111-1111-8111-111111111111',
      playerId: null,
      title: 'Practice',
      notes: null,
      scheduledAt: '2026-07-21T08:00:00.000Z',
      durationMinutes: 60,
      sessionType: 'practice',
      status: 'scheduled',
      contentRefs: refs,
      createdAt: '2026-07-21T07:00:00.000Z',
      updatedAt: '2026-07-21T07:00:00.000Z',
    });
    expect(session.contentRefs[0].title).toBe('Form Shooting Demo');

    const mapper = readFileSync(MAPPER_PATH, 'utf8');
    expect(mapper).toMatch(/content_refs/);
    expect(mapper).toMatch(/contentRefs/);

    const sessionRepo = readFileSync(SESSION_REPO_PATH, 'utf8');
    expect(sessionRepo).toMatch(/content_refs/);

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/session-content-list/);
    expect(ui).toMatch(/SESSION DETAILS/);
    expect(ui).toMatch(/orderedContent|contentRefs/);
  });
});

describe('STORY_6_2 AC4 — package attaches as single unit (OQ-3.4)', () => {
  it('test_STORY_6_2_AC4_package_attaches_as_single_unit: package kind is one ordered entry', () => {
    const attached = attachContentRef([], {
      kind: 'package',
      source: 'library',
      id: '44444444-4444-4444-8444-444444444444',
      title: 'Weekend Practice Pack',
    });
    expect(attached).toHaveLength(1);
    expect(attached[0].kind).toBe('package');
    expect(attached[0].title).toBe('Weekend Practice Pack');

    const purchasedPackage = attachContentRef(attached, {
      kind: 'package',
      source: 'purchase',
      id: 'elite-shooting-system',
      title: 'Elite Shooting System',
    });
    expect(purchasedPackage).toHaveLength(2);
    expect(purchasedPackage.filter((ref) => ref.kind === 'package')).toHaveLength(2);
    expect(purchasedPackage.map((ref) => ref.source)).toEqual(['library', 'purchase']);

    const ui = readFileSync(UI_PATH, 'utf8');
    expect(ui).toMatch(/single unit/);
    expect(ui).toMatch(/contentKindLabel\(item\.kind\)|kind === 'package'/);

    const contentRefs = readFileSync(CONTENT_REFS_PATH, 'utf8');
    expect(contentRefs).toMatch(/'package'/);
  });
});
