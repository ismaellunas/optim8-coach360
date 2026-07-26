import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, firstEnv } from '../env.mjs';
import { createAdminClient, findProbeProfileId } from '../supabase-admin.mjs';
import { postJson } from '../http.mjs';

/**
 * Stripe Edge Function currently accepts JSON without signature verify.
 * Fixture mode posts a synthetic subscription.updated and asserts sync.
 * --mode cli shells out to `stripe trigger` when STRIPE_CLI is available (opt-in).
 */
export async function runStripeWebhookSuite({ env, ctx, reporter, options }) {
  const suite = 'stripe-webhook';
  const mode = options.stripeMode || 'fixture';

  if (mode === 'cli') {
    return runStripeCliMode({ env, ctx, reporter });
  }

  if (!ctx.serviceRoleKey) {
    reporter.skip(suite, 'fixture_sync', 'missing service role key');
    return;
  }

  const admin = createAdminClient(ctx);
  const profileId = await findProbeProfileId(admin, firstEnv(env, ['SMOKE_PROFILE_ID']));
  if (!profileId) {
    reporter.skip(suite, 'fixture_sync', 'no profiles in DB — seed a user first');
    return;
  }

  const fixturePath = path.join(ROOT, 'scripts/fixtures/stripe/subscription-updated.json');
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const eventId = `evt_probe_smoke_${Date.now()}`;
  fixture.id = eventId;
  fixture.data.object.metadata.profile_id = profileId;
  fixture.data.object.id = `sub_probe_${Date.now()}`;
  fixture.data.object.customer = `cus_probe_${Date.now()}`;

  const url = `${ctx.functionsBaseUrl}/stripe-webhook`;
  const res = await postJson(url, { body: fixture });

  if (!res.ok) {
    reporter.fail(suite, 'fixture_post', `HTTP ${res.status}: ${res.text.slice(0, 240)}`);
    return;
  }
  if (!res.json?.synced && !res.json?.received) {
    reporter.fail(suite, 'fixture_post', res.text.slice(0, 240));
    return;
  }
  reporter.pass(suite, 'fixture_post', `kind=${res.json?.kind || 'unknown'}`);

  const { data: sub, error } = await admin
    .from('subscriptions')
    .select('profile_id, tier, status, stripe_subscription_id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    reporter.fail(suite, 'db_subscription', error.message);
    return;
  }
  if (!sub) {
    reporter.fail(suite, 'db_subscription', 'no subscription row after webhook');
    return;
  }
  if (sub.tier !== 'basic' || sub.status !== 'active') {
    reporter.fail(
      suite,
      'db_subscription',
      `expected basic/active got ${sub.tier}/${sub.status}`,
    );
    return;
  }
  reporter.pass(suite, 'db_subscription', `profile=${profileId} sub=${sub.stripe_subscription_id}`);
}

async function runStripeCliMode({ env, reporter }) {
  const suite = 'stripe-webhook';
  const { spawnSync } = await import('node:child_process');
  const bin = firstEnv(env, ['STRIPE_CLI', 'STRIPE']) || 'stripe';
  const result = spawnSync(bin, ['trigger', 'customer.subscription.updated'], {
    encoding: 'utf8',
    env: process.env,
  });
  if (result.error?.code === 'ENOENT') {
    reporter.skip(suite, 'cli_trigger', 'stripe CLI not installed');
    return;
  }
  if (result.status !== 0) {
    reporter.fail(
      suite,
      'cli_trigger',
      (result.stderr || result.stdout || 'stripe trigger failed').slice(0, 300),
    );
    return;
  }
  reporter.pass(suite, 'cli_trigger', 'customer.subscription.updated fired (assert DB separately)');
}
