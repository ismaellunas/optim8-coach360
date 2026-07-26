import { createAdminClient, pollUntil } from '../supabase-admin.mjs';
import { postJson } from '../http.mjs';

export async function runRagSuite({ ctx, reporter, options }) {
  const suite = 'rag';
  if (!ctx.serviceRoleKey) {
    reporter.skip(suite, 'process_embeddings', 'missing service role key');
    return;
  }

  const admin = createAdminClient(ctx);

  // Re-queue recent failed smoke/pending jobs so worker has work
  if (options.resetFailed) {
    await admin.from('rag_embedding_jobs').update({ status: 'pending' }).eq('status', 'failed');
  }

  const url = `${ctx.functionsBaseUrl}/process-rag-embeddings`;
  const res = await postJson(url, {
    body: { limit: options.limit ?? 10 },
    headers: {
      Authorization: `Bearer ${ctx.serviceRoleKey}`,
      apikey: ctx.serviceRoleKey,
    },
  });

  if (!res.ok) {
    reporter.fail(suite, 'process_embeddings', `HTTP ${res.status}: ${res.text.slice(0, 240)}`);
    return;
  }

  const processed = res.json?.processed ?? [];
  const failures = processed.filter((p) => p && p.ok === false);
  const embedFails = failures.filter((p) => p.reason === 'embed_failed');
  if (embedFails.length > 0) {
    reporter.fail(
      suite,
      'process_embeddings',
      `${embedFails.length}/${processed.length} embed_failed — check MISTRAL_API_KEY on this target`,
    );
  } else if (processed.length === 0 && res.json?.claimed === 0) {
    reporter.pass(suite, 'process_embeddings', 'no pending jobs (queue empty)');
  } else if (failures.length > 0) {
    reporter.fail(
      suite,
      'process_embeddings',
      `${failures.length} failed: ${failures.map((f) => f.reason).join(', ')}`,
    );
  } else {
    reporter.pass(suite, 'process_embeddings', `claimed=${res.json?.claimed ?? processed.length}`);
  }

  // If any done jobs exist, verify an embedding row has 1024 dims via RPC-less select
  const { data: emb } = await admin
    .from('package_embeddings')
    .select('sanity_document_id, model_id, embedded_at')
    .order('embedded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (emb?.sanity_document_id) {
    reporter.pass(
      suite,
      'embedding_row',
      `${emb.sanity_document_id} model=${emb.model_id || 'unknown'}`,
    );
  } else {
    reporter.skip(suite, 'embedding_row', 'no package_embeddings rows yet');
  }

  // Optional: wait for a specific job to reach done after sanity suite
  if (options.waitDocumentId) {
    try {
      await pollUntil(
        'embedding_for_doc',
        async () => {
          const { data } = await admin
            .from('package_embeddings')
            .select('sanity_document_id')
            .eq('sanity_document_id', options.waitDocumentId)
            .maybeSingle();
          return data?.sanity_document_id ? data : null;
        },
        { timeoutMs: 90_000 },
      );
      reporter.pass(suite, 'embedding_for_doc', options.waitDocumentId);
    } catch (cause) {
      reporter.fail(
        suite,
        'embedding_for_doc',
        cause instanceof Error ? cause.message : String(cause),
      );
    }
  }

}
