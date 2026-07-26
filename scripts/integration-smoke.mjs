#!/usr/bin/env node
/**
 * Integration smoke tests for third-party + Edge Function pipelines.
 *
 * Usage:
 *   npm run smoke:integrations -- --target local
 *   npm run smoke:integrations -- --target cloud --suite all
 *   npm run smoke:integrations -- --target cloud --suite webhooks,mistral --strict
 *   npm run smoke:integrations -- --target cloud --json --cleanup --reset-failed
 *
 * Suites: config, mistral, sanity (alias sanity-webhook), rag, stripe, mux, webhooks, all
 *
 * Cloud needs SMOKE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY that is the
 * cloud service_role) — local SERVICE_ROLE_KEY (iss=supabase-demo) will fail the
 * config guard against --target cloud.
 */
import {
  loadEnv,
  resolveTarget,
  assertTargetKeyMatch,
} from './lib/smoke/env.mjs';
import { createReporter } from './lib/smoke/report.mjs';
import { runSanityWebhookSuite } from './lib/smoke/suites/sanity-webhook.mjs';
import { runRagSuite } from './lib/smoke/suites/rag.mjs';
import { runMistralSuite } from './lib/smoke/suites/mistral.mjs';
import { runStripeWebhookSuite } from './lib/smoke/suites/stripe-webhook.mjs';
import { runMuxWebhookSuite } from './lib/smoke/suites/mux-webhook.mjs';

function parseArgs(argv) {
  const args = {
    target: 'local',
    suite: 'all',
    strict: false,
    json: false,
    cleanup: false,
    resetFailed: false,
    stripeMode: 'fixture',
    limit: 10,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (!token.startsWith('--')) continue;
    const [rawKey, inline] = token.slice(2).split('=');
    const next = argv[i + 1];
    const value =
      inline ?? (next && !next.startsWith('--') ? ((i += 1), next) : 'true');

    switch (rawKey) {
      case 'target':
        args.target = value === 'cloud' ? 'cloud' : 'local';
        break;
      case 'suite':
        args.suite = value;
        break;
      case 'strict':
        args.strict = value !== 'false';
        break;
      case 'json':
        args.json = value !== 'false';
        break;
      case 'cleanup':
        args.cleanup = value !== 'false';
        break;
      case 'reset-failed':
        args.resetFailed = value !== 'false';
        break;
      case 'stripe-mode':
        args.stripeMode = value === 'cli' ? 'cli' : 'fixture';
        break;
      case 'limit':
        args.limit = Number(value) || 10;
        break;
      default:
        break;
    }
  }
  return args;
}

function printHelp() {
  console.log(`Coach360 integration smoke

Usage:
  npm run smoke:integrations -- [options]

Options:
  --target local|cloud     Default: local
  --suite <list>           all | webhooks | config,mistral,sanity,rag,stripe,mux
  --strict                 Treat skips as failures
  --json                   Machine-readable summary
  --cleanup                Delete probe rows where safe
  --reset-failed           Re-queue failed rag_embedding_jobs before rag suite
  --stripe-mode fixture|cli
  --limit N                process-rag-embeddings claim limit (default 10)

Env (see .env / GitHub secrets):
  SANITY_WEBHOOK_SECRET, MUX_WEBHOOK_SECRET, MISTRAL_API_KEY
  SERVICE_ROLE_KEY (local) or SMOKE_SERVICE_ROLE_KEY (cloud)
  SMOKE_PROFILE_ID (optional preferred profile for Stripe/Mux)
`);
}

function expandSuites(spec) {
  const raw = spec
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const set = new Set();
  for (const name of raw) {
    if (name === 'all') {
      ['config', 'mistral', 'sanity', 'rag', 'stripe', 'mux'].forEach((s) => set.add(s));
    } else if (name === 'webhooks') {
      ['sanity', 'stripe', 'mux'].forEach((s) => set.add(s));
    } else if (name === 'sanity-webhook') {
      set.add('sanity');
    } else if (name === 'stripe-webhook') {
      set.add('stripe');
    } else if (name === 'mux-webhook') {
      set.add('mux');
    } else {
      set.add(name);
    }
  }
  // Stable order
  const order = ['config', 'mistral', 'sanity', 'rag', 'stripe', 'mux'];
  return order.filter((s) => set.has(s));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const env = await loadEnv();
  const ctx = resolveTarget(env, args.target);
  const reporter = createReporter({ json: args.json });
  const suites = expandSuites(args.suite);
  const options = {
    cleanup: args.cleanup,
    resetFailed: args.resetFailed,
    stripeMode: args.stripeMode,
    limit: args.limit,
  };

  console.log(
    `Integration smoke → target=${ctx.target} url=${ctx.functionsBaseUrl} suites=${suites.join(',')}`,
  );

  if (suites.includes('config')) {
    const match = assertTargetKeyMatch(ctx);
    if (!match.ok) {
      reporter.fail('config', 'target_key_match', match.detail);
    } else {
      reporter.pass('config', 'target_key_match', match.detail);
    }
    if (!ctx.serviceRoleKey && suites.some((s) => ['sanity', 'rag', 'stripe', 'mux'].includes(s))) {
      reporter.fail(
        'config',
        'service_role',
        args.target === 'cloud'
          ? 'set SMOKE_SERVICE_ROLE_KEY to cloud service_role'
          : 'set SERVICE_ROLE_KEY from `supabase status -o env`',
      );
    } else if (ctx.serviceRoleKey) {
      reporter.pass('config', 'service_role', 'present');
    }
  }

  // Abort early if config failed hard on key mismatch
  const configFailed = reporter.results().some((r) => r.suite === 'config' && r.status === 'fail');
  if (configFailed && suites.some((s) => ['sanity', 'rag', 'stripe', 'mux'].includes(s))) {
    reporter.printSummary();
    process.exit(1);
  }

  if (suites.includes('mistral')) {
    await runMistralSuite({ env, reporter });
  }
  if (suites.includes('sanity')) {
    await runSanityWebhookSuite({ env, ctx, reporter, options });
  }
  if (suites.includes('rag')) {
    await runRagSuite({ env, ctx, reporter, options });
  }
  if (suites.includes('stripe')) {
    await runStripeWebhookSuite({ env, ctx, reporter, options });
  }
  if (suites.includes('mux')) {
    await runMuxWebhookSuite({ env, ctx, reporter, options });
  }

  if (args.strict) {
    for (const r of reporter.results()) {
      if (r.status === 'skip') {
        reporter.fail(r.suite, `${r.name}_strict`, `skip not allowed: ${r.detail}`);
      }
    }
  }

  reporter.printSummary();
  const { fail } = reporter.summary();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
