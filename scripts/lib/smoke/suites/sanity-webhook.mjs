import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, firstEnv } from '../env.mjs';
import { createAdminClient, pollUntil } from '../supabase-admin.mjs';
import { encodeSanityWebhookSignature, postJson } from '../http.mjs';

export async function runSanityWebhookSuite({ env, ctx, reporter, options }) {
  const suite = 'sanity-webhook';
  const secret = firstEnv(env, ['SANITY_WEBHOOK_SECRET']);
  if (!secret) {
    reporter.skip(suite, 'signed_post', 'missing SANITY_WEBHOOK_SECRET');
    return;
  }

  const fixturePath = path.join(ROOT, 'scripts/fixtures/sanity/package-published.json');
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const docId = `${fixture._id}.${Date.now()}`;
  const bodyObj = { ...fixture, _id: docId };
  const rawBody = JSON.stringify(bodyObj);
  const signature = encodeSanityWebhookSignature(rawBody, secret);
  const url = `${ctx.functionsBaseUrl}/sanity-webhook`;

  const res = await postJson(url, {
    body: rawBody,
    headers: {
      'sanity-webhook-signature': signature,
      'idempotency-key': `smoke-${Date.now()}`,
    },
  });

  if (!res.ok) {
    reporter.fail(suite, 'signed_post', `HTTP ${res.status}: ${res.text.slice(0, 200)}`);
    return;
  }
  if (!res.json?.queued && !res.json?.synced) {
    reporter.fail(suite, 'signed_post', `unexpected body: ${res.text.slice(0, 200)}`);
    return;
  }
  reporter.pass(
    suite,
    'signed_post',
    `queued=${res.json.queued} reindexTriggered=${res.json.reindexTriggered}`,
  );

  if (!ctx.serviceRoleKey) {
    reporter.skip(suite, 'db_metadata', 'no service role for DB assert');
    return;
  }

  const admin = createAdminClient(ctx);
  try {
    await pollUntil('package_metadata', async () => {
      const { data } = await admin
        .from('package_metadata')
        .select('sanity_document_id, published')
        .eq('sanity_document_id', docId)
        .maybeSingle();
      return data?.sanity_document_id ? data : null;
    });
    reporter.pass(suite, 'db_metadata', docId);
  } catch (cause) {
    reporter.fail(suite, 'db_metadata', cause instanceof Error ? cause.message : String(cause));
    return;
  }

  try {
    const job = await pollUntil('rag_embedding_jobs', async () => {
      const { data } = await admin
        .from('rag_embedding_jobs')
        .select('id, status')
        .eq('sanity_document_id', docId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.id ? data : null;
    });
    reporter.pass(suite, 'rag_job_queued', `status=${job.status}`);
  } catch (cause) {
    reporter.fail(suite, 'rag_job_queued', cause instanceof Error ? cause.message : String(cause));
  }

  if (options.cleanup) {
    await admin.from('package_embeddings').delete().eq('sanity_document_id', docId);
    await admin.from('rag_embedding_jobs').delete().eq('sanity_document_id', docId);
    await admin.from('package_metadata').delete().eq('sanity_document_id', docId);
  }
}
