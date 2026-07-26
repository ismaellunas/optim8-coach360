import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, firstEnv } from '../env.mjs';
import { createAdminClient, findProbeProfileId } from '../supabase-admin.mjs';
import { encodeMuxWebhookSignature, postJson } from '../http.mjs';

export async function runMuxWebhookSuite({ env, ctx, reporter, options }) {
  const suite = 'mux-webhook';
  const secret = firstEnv(env, ['MUX_WEBHOOK_SECRET']);
  if (!secret) {
    reporter.skip(suite, 'signed_ready', 'missing MUX_WEBHOOK_SECRET');
    return;
  }
  if (!ctx.serviceRoleKey) {
    reporter.skip(suite, 'signed_ready', 'missing service role key');
    return;
  }

  const admin = createAdminClient(ctx);
  const ownerId = await findProbeProfileId(admin, firstEnv(env, ['SMOKE_PROFILE_ID']));
  if (!ownerId) {
    reporter.skip(suite, 'signed_ready', 'no profiles — cannot insert library probe row');
    return;
  }

  const { data: item, error: insertError } = await admin
    .from('coach_library_items')
    .insert({
      owner_id: ownerId,
      kind: 'video',
      title: `Smoke Mux ${Date.now()}`,
      transcode_status: 'processing',
    })
    .select('id')
    .single();

  if (insertError || !item?.id) {
    reporter.fail(suite, 'seed_library_item', insertError?.message || 'insert_failed');
    return;
  }

  const fixturePath = path.join(ROOT, 'scripts/fixtures/mux/asset-ready.json');
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  fixture.id = `evt_probe_mux_${Date.now()}`;
  fixture.data.passthrough = item.id;
  fixture.data.id = `muxAsset${Date.now()}`;
  fixture.data.playback_ids[0].id = `muxPlay${Date.now()}`;

  const rawBody = JSON.stringify(fixture);
  const signature = encodeMuxWebhookSignature(rawBody, secret);
  const url = `${ctx.functionsBaseUrl}/mux-webhook`;
  const res = await postJson(url, {
    body: rawBody,
    headers: { 'Mux-Signature': signature },
  });

  if (!res.ok) {
    reporter.fail(suite, 'signed_ready', `HTTP ${res.status}: ${res.text.slice(0, 240)}`);
    if (options.cleanup) {
      await admin.from('coach_library_items').delete().eq('id', item.id);
    }
    return;
  }
  if (!res.json?.synced) {
    reporter.fail(suite, 'signed_ready', res.text.slice(0, 240));
    return;
  }
  reporter.pass(suite, 'signed_ready', `libraryItemId=${item.id}`);

  const { data: updated, error } = await admin
    .from('coach_library_items')
    .select('id, mux_playback_id, transcode_status, media_url')
    .eq('id', item.id)
    .maybeSingle();

  if (error || !updated) {
    reporter.fail(suite, 'db_library_update', error?.message || 'row_missing');
  } else if (updated.transcode_status !== 'ready' || !updated.mux_playback_id) {
    reporter.fail(
      suite,
      'db_library_update',
      `status=${updated.transcode_status} playback=${updated.mux_playback_id}`,
    );
  } else {
    reporter.pass(
      suite,
      'db_library_update',
      `ready playback=${updated.mux_playback_id}`,
    );
  }

  if (options.cleanup) {
    await admin.from('coach_library_items').delete().eq('id', item.id);
  }
}
