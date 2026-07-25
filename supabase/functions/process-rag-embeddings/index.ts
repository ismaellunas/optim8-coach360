import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  prepareRagEmbeddingJob,
  type RagEmbeddingJobRow,
  type RagJobPayload,
} from './handler.ts';
import { embedTextWithMistral } from './mistral-embed.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  /** Process only jobs for this Sanity document (from webhook trigger). */
  sanityDocumentId?: string;
  /** Max pending jobs to claim in one run. */
  limit?: number;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST' && request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'supabase_env_missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody = {};
  if (request.method === 'POST') {
    try {
      body = (await request.json()) as RequestBody;
    } catch {
      body = {};
    }
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const limit =
    typeof body.limit === 'number' && Number.isFinite(body.limit)
      ? Math.max(1, Math.min(50, Math.trunc(body.limit)))
      : 10;

  let query = admin
    .from('rag_embedding_jobs')
    .select('id, sanity_document_id, status, payload')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (typeof body.sanityDocumentId === 'string' && body.sanityDocumentId.trim()) {
    query = query.eq('sanity_document_id', body.sanityDocumentId.trim());
  }

  const { data: pendingRows, error: pendingError } = await query;
  if (pendingError) {
    return new Response(JSON.stringify({ error: pendingError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jobs = (pendingRows ?? []) as RagEmbeddingJobRow[];
  const processed: Array<Record<string, unknown>> = [];

  for (const job of jobs) {
    const { error: claimError } = await admin
      .from('rag_embedding_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id)
      .eq('status', 'pending');

    if (claimError) {
      processed.push({ jobId: job.id, ok: false, reason: claimError.message });
      continue;
    }

    const prepared = prepareRagEmbeddingJob({
      ...job,
      payload: (job.payload ?? {}) as RagJobPayload,
      status: 'processing',
    });

    if (!prepared.ok || !prepared.contentText) {
      await admin
        .from('rag_embedding_jobs')
        .update({ status: prepared.status === 'canceled' ? 'canceled' : 'failed' })
        .eq('id', job.id);
      processed.push({
        jobId: job.id,
        ok: false,
        reason: prepared.reason,
        status: prepared.status,
      });
      continue;
    }

    const embedding = await embedTextWithMistral(prepared.contentText);
    if (!embedding) {
      await admin.from('rag_embedding_jobs').update({ status: 'failed' }).eq('id', job.id);
      processed.push({
        jobId: job.id,
        ok: false,
        reason: 'embed_failed',
        status: 'failed',
      });
      continue;
    }

    const modelId = Deno.env.get('MISTRAL_EMBEDDING_MODEL') ?? 'mistral-embed';
    const { error: upsertError } = await admin.from('package_embeddings').upsert(
      {
        sanity_document_id: prepared.sanityDocumentId,
        content_text: prepared.contentText,
        embedding,
        model_id: modelId,
        embedded_at: new Date().toISOString(),
      },
      { onConflict: 'sanity_document_id' },
    );

    if (upsertError) {
      await admin.from('rag_embedding_jobs').update({ status: 'failed' }).eq('id', job.id);
      processed.push({
        jobId: job.id,
        ok: false,
        reason: upsertError.message,
        status: 'failed',
      });
      continue;
    }

    await admin.from('rag_embedding_jobs').update({ status: 'done' }).eq('id', job.id);
    processed.push({
      jobId: job.id,
      ok: true,
      sanityDocumentId: prepared.sanityDocumentId,
      status: 'done',
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      claimed: jobs.length,
      processed,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
