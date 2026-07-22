// STORY-9.1 — Sanity content schemas and Studio setup.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  CONTENT_DOCUMENT_TYPES,
  schemaTypes,
  WORKFLOW_STATUS_VALUES,
} from '@coach360/studio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const STUDIO_ROOT = path.join(REPO_ROOT, 'apps', 'studio');
const SCHEMA_ROOT = path.join(STUDIO_ROOT, 'schemaTypes');

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

describe('STORY_9_1 AC1 — Sanity schemas for core content types', () => {
  it('test_STORY_9_1_AC1_schemas_registered', () => {
    const required = ['drill', 'video', 'strategy', 'trainingPackage', 'module'];
    for (const name of required) {
      expect(existsSync(path.join(SCHEMA_ROOT, `${name}.ts`))).toBe(true);
    }

    expect([...CONTENT_DOCUMENT_TYPES].sort()).toEqual([...required].sort());

    const registeredNames = schemaTypes
      .map((type) => ('name' in type ? type.name : null))
      .filter(Boolean);
    for (const name of required) {
      expect(registeredNames).toContain(name);
    }

    const indexSrc = read('apps/studio/schemaTypes/index.ts');
    expect(indexSrc).toMatch(/drill/);
    expect(indexSrc).toMatch(/video/);
    expect(indexSrc).toMatch(/strategy/);
    expect(indexSrc).toMatch(/trainingPackage/);
    expect(indexSrc).toMatch(/module/);
  });
});

describe('STORY_9_1 AC2 — Studio accessible at /admin/studio', () => {
  it('test_STORY_9_1_AC2_studio_route', () => {
    const paths = read('apps/admin/src/app/router/paths.ts');
    const routes = read('apps/admin/src/app/router/routes.tsx');
    const studioPage = read('apps/admin/src/pages/studio/StudioPage.tsx');
    const sanityConfig = read('apps/studio/sanity.config.ts');

    expect(paths).toMatch(/studio:\s*'\/admin\/studio'/);
    expect(routes).toMatch(/adminPaths\.studio/);
    expect(routes).toMatch(/StudioPage/);
    expect(studioPage).toMatch(/from 'sanity'/);
    expect(studioPage).toMatch(/createSanityConfig/);
    expect(studioPage).toMatch(/basePath:\s*'\/admin\/studio'/);
    expect(sanityConfig).toMatch(/schemaTypes/);
    expect(existsSync(path.join(STUDIO_ROOT, 'package.json'))).toBe(true);
  });
});

describe('STORY_9_1 AC3 — program → module → lesson → item hierarchy', () => {
  it('test_STORY_9_1_AC3_program_hierarchy', () => {
    const trainingPackage = read('apps/studio/schemaTypes/trainingPackage.ts');
    const moduleSrc = read('apps/studio/schemaTypes/module.ts');
    const lesson = read('apps/studio/schemaTypes/lesson.ts');

    expect(trainingPackage).toMatch(/name:\s*'modules'/);
    expect(trainingPackage).toMatch(/to:\s*\[\s*\{\s*type:\s*'module'\s*\}/);

    expect(moduleSrc).toMatch(/name:\s*'lessons'/);
    expect(moduleSrc).toMatch(/to:\s*\[\s*\{\s*type:\s*'lesson'\s*\}/);

    expect(lesson).toMatch(/name:\s*'items'/);
    expect(lesson).toMatch(/type:\s*'drill'/);
    expect(lesson).toMatch(/type:\s*'video'/);
    expect(lesson).toMatch(/type:\s*'strategy'/);

    expect(existsSync(path.join(SCHEMA_ROOT, 'lesson.ts'))).toBe(true);
    const registeredNames = schemaTypes.map((type) =>
      'name' in type ? type.name : null,
    );
    expect(registeredNames).toContain('lesson');
  });
});

describe('STORY_9_1 AC4 — workflow status draft → pending_review → approved → published', () => {
  it('test_STORY_9_1_AC4_workflow_status', () => {
    const workflow = read('apps/studio/schemaTypes/objects/workflowFields.ts');
    const trainingPackage = read('apps/studio/schemaTypes/trainingPackage.ts');

    expect(WORKFLOW_STATUS_VALUES).toEqual([
      'draft',
      'pending_review',
      'approved',
      'rejected',
    ]);

    expect(workflow).toMatch(/value:\s*'draft'/);
    expect(workflow).toMatch(/value:\s*'pending_review'/);
    expect(workflow).toMatch(/value:\s*'approved'/);
    expect(workflow).toMatch(/value:\s*'rejected'/);
    expect(workflow).toMatch(/name:\s*'published'/);
    expect(workflow).toMatch(/type:\s*'boolean'/);

    expect(trainingPackage).toMatch(/workflowStatusField/);
    expect(trainingPackage).toMatch(/publishedField/);

    // Atomic types also carry workflow for marketplace Path B
    for (const file of ['drill.ts', 'video.ts', 'strategy.ts']) {
      const src = read(`apps/studio/schemaTypes/${file}`);
      expect(src).toMatch(/workflowStatusField/);
      expect(src).toMatch(/publishedField/);
    }

    // Ensure schema files are present (sanity package layout)
    expect(readdirSync(SCHEMA_ROOT).length).toBeGreaterThan(0);
  });
});
