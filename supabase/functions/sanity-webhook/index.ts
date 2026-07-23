import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  mapSanityWebhookPayload,
  SANITY_SIGNATURE_HEADER,
  verifySanityWebhookSignature,
  type SanityWebhookDocument,
} from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    `authorization, x-client-info, apikey, content-type, ${SANITY_SIGNATURE_HEADER}, idempotency-key`,
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
  const webhookSecret = (Deno.env.get('SANITY_WEBHOOK_SECRET') || '').trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'supabase_env_missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await request.text();

  if (webhookSecret) {
    const verdict = await verifySanityWebhookSignature({
      rawBody,
      signatureHeader: request.headers.get(SANITY_SIGNATURE_HEADER),
      secret: webhookSecret,
    });
    if (verdict !== 'ok') {
      return new Response(
        JSON.stringify({
          error: 'invalid_signature',
          reason: verdict,
          hasSignatureHeader: Boolean(request.headers.get(SANITY_SIGNATURE_HEADER)),
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  }

  let doc: SanityWebhookDocument;
  try {
    doc = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const mapped = mapSanityWebhookPayload(doc, {
    idempotencyKey: request.headers.get('idempotency-key'),
  });

  if (mapped.kind === 'skip') {
    return new Response(JSON.stringify({ received: true, skipped: mapped.reason }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { error: ledgerError } = await admin.from('sanity_webhook_events').insert({
    id: mapped.idempotencyKey,
    event_type: mapped.kind,
    sanity_document_id: mapped.metadata.sanity_document_id,
  });

  if (ledgerError) {
    // Unique violation → already processed
    if (ledgerError.code === '23505') {
      return new Response(
        JSON.stringify({
          received: true,
          duplicate: true,
          idempotencyKey: mapped.idempotencyKey,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    return new Response(JSON.stringify({ error: ledgerError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { error: upsertError } = await admin.from('package_metadata').upsert(mapped.metadata, {
    onConflict: 'sanity_document_id',
  });

  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (mapped.kind === 'upsert_only') {
    // Cancel pending RAG jobs when unpublished/deleted
    await admin
      .from('rag_embedding_jobs')
      .update({ status: 'canceled' })
      .eq('sanity_document_id', mapped.metadata.sanity_document_id)
      .eq('status', 'pending');

    return new Response(
      JSON.stringify({
        received: true,
        synced: true,
        queued: false,
        reason: mapped.reason,
        sanityDocumentId: mapped.metadata.sanity_document_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const { error: jobError } = await admin.from('rag_embedding_jobs').insert(mapped.ragJob);
  if (jobError) {
    return new Response(JSON.stringify({ error: jobError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      received: true,
      synced: true,
      queued: true,
      sanityDocumentId: mapped.metadata.sanity_document_id,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
