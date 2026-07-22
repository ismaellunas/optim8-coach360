import { defineConfig, type Config } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';

export type CreateSanityConfigOptions = {
  /** React Router mount path when embedded in admin (default `/` for standalone Studio). */
  basePath?: string;
  projectId?: string;
  dataset?: string;
};

const DEFAULT_PROJECT_ID = 'wv7uz07u';
const DEFAULT_DATASET = 'production';

function envValue(...keys: string[]): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

export function createSanityConfig(options: CreateSanityConfigOptions = {}): Config {
  return defineConfig({
    name: 'coach360',
    title: 'Coach360 Content',
    projectId:
      options.projectId ||
      envValue('SANITY_STUDIO_PROJECT_ID', 'VITE_SANITY_PROJECT_ID') ||
      DEFAULT_PROJECT_ID,
    dataset:
      options.dataset ||
      envValue('SANITY_STUDIO_DATASET', 'VITE_SANITY_DATASET') ||
      DEFAULT_DATASET,
    basePath: options.basePath ?? '/',
    plugins: [structureTool(), visionTool()],
    schema: {
      types: schemaTypes,
    },
  });
}

export default createSanityConfig();
