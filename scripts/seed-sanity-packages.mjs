#!/usr/bin/env node
/**
 * Seed published marketplace packages into Sanity (prerequisite for STORY-9.5).
 *
 * Creates an idempotent hierarchy per package:
 *   drill → lesson → module → trainingPackage (approved + published)
 *
 * Usage:
 *   npm run seed:sanity
 *   npm run seed:sanity -- --dry-run
 *   npm run seed:sanity -- --force   # recreate even if seed ids already exist
 *
 * Required env (from .env or process):
 *   SANITY_API_TOKEN          # Editor/Admin token with write access
 *   VITE_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID  (default wv7uz07u)
 *   VITE_SANITY_DATASET or SANITY_STUDIO_DATASET        (default production)
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENV_PATH = path.join(ROOT, '.env');
const API_VERSION = '2021-10-21';
const SEED_PREFIX = 'seed.coach360.';

/** Deterministic seed catalog — mirrors marketplace mock themes. */
const PACKAGES = [
  {
    slug: 'elite-shooting',
    title: 'Elite Shooting System',
    description: 'Progressive shooting program for form, catch-and-shoot, and free throws.',
    skills: ['shooting', 'form', 'free-throw'],
    ageRange: { _type: 'ageRange', min: 12, max: 18 },
    objectives: ['Improve shooting percentage', 'Build consistent free-throw routine'],
    dripSchedule: { intervalDays: 7, notes: 'One module per week' },
    priceCents: 2900,
    currency: 'usd',
    rating: 4.8,
    drill: {
      title: 'Form shooting ladder',
      instructions: 'Start close to the rim. Make 5, step back. Focus on elbow and follow-through.',
      skills: ['shooting', 'form'],
    },
    lessonTitle: 'Shooting foundations',
    moduleTitle: 'Week 1 — Form',
  },
  {
    slug: 'lockdown-defense',
    title: 'Lockdown Defense',
    description: 'On-ball and help-side defensive habits for youth and high-school teams.',
    skills: ['defense', 'footwork', 'help-side'],
    ageRange: { _type: 'ageRange', min: 13, max: 17 },
    objectives: ['Improve on-ball pressure', 'Reduce blow-by drives'],
    dripSchedule: { intervalDays: 7, notes: 'One module per week' },
    priceCents: 2500,
    currency: 'usd',
    rating: 4.6,
    drill: {
      title: 'Closeout + slide',
      instructions: 'Sprint to closeout, chop feet, then defensive slides along the arc.',
      skills: ['defense', 'footwork'],
    },
    lessonTitle: 'On-ball pressure',
    moduleTitle: 'Week 1 — Stance & slide',
  },
  {
    slug: 'court-vision',
    title: 'Court Vision Mastery',
    description: 'Decision-making and conditioning drills that train heads-up playmaking.',
    skills: ['conditioning', 'vision', 'passing'],
    ageRange: { _type: 'ageRange', min: 14, max: 18 },
    objectives: ['Improve decision speed', 'Reduce turnovers under pressure'],
    dripSchedule: { intervalDays: 7, notes: 'One module per week' },
    priceCents: 2700,
    currency: 'usd',
    rating: 4.7,
    drill: {
      title: '3-man weave read',
      instructions: 'Run weave; on coach signal, skip pass or attack. Keep eyes up.',
      skills: ['vision', 'passing'],
    },
    lessonTitle: 'Heads-up decisions',
    moduleTitle: 'Week 1 — See the floor',
  },
];

function parseArgs(argv) {
  const args = { dryRun: false, force: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--force') args.force = true;
    else if (token === '--help' || token === '-h') args.help = true;
  }
  return args;
}

async function readDotEnv(filePath) {
  try {
    const source = await readFile(filePath, 'utf8');
    const values = {};
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
    return values;
  } catch {
    return {};
  }
}

function printHelp() {
  console.log(`Seed published training packages into Sanity.

Usage:
  npm run seed:sanity
  npm run seed:sanity -- --dry-run
  npm run seed:sanity -- --force

Required env:
  SANITY_API_TOKEN   Editor/Admin token from https://www.sanity.io/manage
                     → Project wv7uz07u → API → Tokens → Add API token (Editor)

Optional env:
  VITE_SANITY_PROJECT_ID / SANITY_STUDIO_PROJECT_ID  (default wv7uz07u)
  VITE_SANITY_DATASET / SANITY_STUDIO_DATASET        (default production)
`);
}

function ref(id) {
  return { _type: 'reference', _ref: id };
}

function buildMutationsForPackage(pkg) {
  const drillId = `${SEED_PREFIX}${pkg.slug}.drill`;
  const lessonId = `${SEED_PREFIX}${pkg.slug}.lesson`;
  const moduleId = `${SEED_PREFIX}${pkg.slug}.module`;
  const packageId = `${SEED_PREFIX}${pkg.slug}.package`;

  return [
    {
      createOrReplace: {
        _id: drillId,
        _type: 'drill',
        title: pkg.drill.title,
        instructions: pkg.drill.instructions,
        skills: pkg.drill.skills,
        status: 'approved',
        published: true,
      },
    },
    {
      createOrReplace: {
        _id: lessonId,
        _type: 'lesson',
        title: pkg.lessonTitle,
        description: `Seed lesson for ${pkg.title}`,
        items: [ref(drillId)],
      },
    },
    {
      createOrReplace: {
        _id: moduleId,
        _type: 'module',
        title: pkg.moduleTitle,
        description: `Seed module for ${pkg.title}`,
        lessons: [ref(lessonId)],
      },
    },
    {
      createOrReplace: {
        _id: packageId,
        _type: 'trainingPackage',
        title: pkg.title,
        description: pkg.description,
        skills: pkg.skills,
        ageRange: pkg.ageRange,
        objectives: pkg.objectives,
        modules: [ref(moduleId)],
        status: 'approved',
        published: true,
        dripSchedule: pkg.dripSchedule,
        priceCents: pkg.priceCents,
        currency: pkg.currency,
        rating: pkg.rating,
      },
    },
  ];
}

async function sanityQuery({ projectId, dataset, token, query }) {
  const url = new URL(
    `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}`,
  );
  url.searchParams.set('query', query);
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Sanity query failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.result;
}

async function sanityMutate({ projectId, dataset, token, mutations }) {
  const url = `https://${projectId}.api.sanity.io/v${API_VERSION}/data/mutate/${dataset}?returnIds=true`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mutations }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Sanity mutate failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const envFile = await readDotEnv(ENV_PATH);
  const env = { ...envFile, ...process.env };

  const projectId =
    env.VITE_SANITY_PROJECT_ID ||
    env.SANITY_STUDIO_PROJECT_ID ||
    'wv7uz07u';
  const dataset = env.VITE_SANITY_DATASET || env.SANITY_STUDIO_DATASET || 'production';
  const token = (env.SANITY_API_TOKEN || '').trim();
  const mutations = PACKAGES.flatMap(buildMutationsForPackage);

  console.log(
    `Seeding ${PACKAGES.length} packages (${mutations.length} documents) → ${projectId}/${dataset}`,
  );

  if (args.dryRun) {
    for (const m of mutations) {
      const doc = m.createOrReplace;
      console.log(`  [dry-run] ${doc._type}  ${doc._id}  ${doc.title || ''}`);
    }
    process.exit(0);
  }

  if (!token) {
    console.error(`Missing SANITY_API_TOKEN.

Create one: https://www.sanity.io/manage → project ${projectId}
  → API → Tokens → Add API token (Editor or Admin)
Then add to .env:
  SANITY_API_TOKEN=sk...
`);
    process.exit(1);
  }

  const packageIds = PACKAGES.map((pkg) => `${SEED_PREFIX}${pkg.slug}.package`);
  const existing = await sanityQuery({
    projectId,
    dataset,
    token,
    query: `*[_id in ${JSON.stringify(packageIds)}]{_id, title, published}`,
  });

  if (existing?.length && !args.force) {
    console.log(
      `Found ${existing.length} existing seed package(s). Re-run with --force to overwrite.`,
    );
    for (const doc of existing) {
      console.log(`  - ${doc._id}  ${doc.title}  published=${doc.published}`);
    }
    process.exit(0);
  }

  const result = await sanityMutate({ projectId, dataset, token, mutations });
  const created = result?.results?.length ?? mutations.length;
  console.log(`OK — wrote ${created} document(s).`);

  const published = await sanityQuery({
    projectId,
    dataset,
    token,
    query:
      '*[_type == "trainingPackage" && published == true]{_id, title, skills} | order(title asc)',
  });
  console.log(`Published packages now (${published?.length ?? 0}):`);
  for (const doc of published || []) {
    console.log(`  - ${doc.title}  (${doc._id})  skills=${(doc.skills || []).join(',')}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
