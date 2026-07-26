#!/usr/bin/env node
/**
 * Thin wrapper — prefer: npm run smoke:integrations -- --suite sanity
 *
 * Usage:
 *   node scripts/probe-sanity-webhook.mjs
 *   node scripts/probe-sanity-webhook.mjs --url http://127.0.0.1:54321/functions/v1/sanity-webhook
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const smoke = path.join(ROOT, 'integration-smoke.mjs');

function parseUrl(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--url' && argv[i + 1]) return argv[i + 1];
  }
  return null;
}

const url = parseUrl(process.argv.slice(2));
const target =
  url && (url.includes('127.0.0.1') || url.includes('localhost')) ? 'local' : 'cloud';

const result = spawnSync(
  process.execPath,
  [smoke, '--target', target, '--suite', 'sanity', ...(url ? [] : [])],
  { stdio: 'inherit', cwd: path.join(ROOT, '..') },
);
process.exit(result.status ?? 1);
