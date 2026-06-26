#!/usr/bin/env node
/**
 * Walks docs/ and writes docs/manifest.json for the static doc viewer.
 * Run after adding or moving markdown files: npm run docs:manifest
 */
import { readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = join(ROOT, 'docs');

const SKIP = new Set([
  'index.html',
  'viewer.html',
  'manifest.json',
  '.nojekyll',
  '.gitkeep',
]);

async function buildTree(dir, base = DOCS) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;

    const full = join(dir, entry.name);
    const rel = relative(base, full).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const children = await buildTree(full, base);
      if (children.length) {
        nodes.push({ type: 'dir', name: entry.name, path: rel, children });
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      nodes.push({ type: 'file', name: entry.name, path: rel });
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return nodes;
}

const tree = await buildTree(DOCS);
const manifest = {
  generated: new Date().toISOString(),
  root: 'docs',
  tree,
};

await writeFile(
  join(DOCS, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
  'utf8'
);

console.log(`Wrote docs/manifest.json (${tree.length} top-level entries)`);
