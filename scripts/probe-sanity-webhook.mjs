#!/usr/bin/env node
/**
 * Probe cloud/local sanity-webhook with a correctly signed payload.
 *
 * Usage:
 *   node scripts/probe-sanity-webhook.mjs
 *   node scripts/probe-sanity-webhook.mjs --url http://127.0.0.1:54321/functions/v1/sanity-webhook
 *
 * Requires SANITY_WEBHOOK_SECRET in .env (must match Supabase Edge Function secret).
 */
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_URL =
  'https://rvmcfxizrlgtcilihowa.supabase.co/functions/v1/sanity-webhook';

async function readDotEnv(filePath) {
  try {
    const source = await readFile(filePath, 'utf8');
    const values = {};
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const i = trimmed.indexOf('=');
      if (i === -1) continue;
      let value = trimmed.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[trimmed.slice(0, i).trim()] = value;
    }
    return values;
  } catch {
    return {};
  }
}

function encodeSanityWebhookSignature(rawBody, secret, timestampMs = Date.now()) {
  const digest = createHmac('sha256', secret)
    .update(`${timestampMs}.${rawBody}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `t=${timestampMs},v1=${digest}`;
}

function parseArgs(argv) {
  let url = DEFAULT_URL;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--url' && argv[i + 1]) {
      url = argv[++i];
    }
  }
  return { url };
}

async function main() {
  const { url } = parseArgs(process.argv.slice(2));
  const env = { ...(await readDotEnv(path.join(ROOT, '.env'))), ...process.env };
  const secret = (env.SANITY_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    console.error('Missing SANITY_WEBHOOK_SECRET in .env');
    process.exit(1);
  }

  const body = JSON.stringify({
    _id: 'seed.coach360.elite-shooting.package',
    _type: 'trainingPackage',
    title: 'Elite Shooting System',
    published: true,
    status: 'approved',
    skills: ['shooting'],
    modules: ['seed.coach360.elite-shooting.module'],
  });

  const signature = encodeSanityWebhookSignature(body, secret);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'sanity-webhook-signature': signature,
      'idempotency-key': `probe-${Date.now()}`,
    },
    body,
  });
  const text = await res.text();
  console.log(res.status, text);
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
