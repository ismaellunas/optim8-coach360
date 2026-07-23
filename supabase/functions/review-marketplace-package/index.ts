import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  REVIEW_QUEUE_GROQ,
  buildSanityPatchMutation,
  planMarketplacePackageReview,
  type ReviewPackageCurrent,
} from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

type RequestBody = {
  sanityDocumentId?: string;
  action?: string;
  stripePriceId?: string | null;
  priceCents?: number | null;
  currency?: string | null;
};

async function sanityQuery(options: {
  projectId: string;
  dataset: string;
  token: string;
  query: string;
  apiVersion: string;
}): Promise<unknown> {
  const url = new URL(
    `https://${options.projectId}.api.sanity.io/v${options.apiVersion}/data/query/${options.dataset}`,
  );
  url.searchParams.set('query', options.query);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${options.token}` },
  });
  const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: unknown };
  if (!res.ok) {
    throw new Error(`sanity_query_failed:${res.status}`);
  }
  return body.result;
}

async function sanityMutate(options: {
  projectId: string;
  dataset: string;
  token: string;
  apiVersion: string;
  mutations: ReturnType<typeof buildSanityPatchMutation>;
}): Promise<void> {
  const url = `https://${options.projectId}.api.sanity.io/v${options.apiVersion}/data/mutate/${options.dataset}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options.mutations),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`sanity_mutate_failed:${res.status}:${errBody.slice(0, 200)}`);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
  const sanityToken = (Deno.env.get('SANITY_API_TOKEN') || '').trim();
  const projectId =
    Deno.env.get('VITE_SANITY_PROJECT_ID') ||
    Deno.env.get('SANITY_STUDIO_PROJECT_ID') ||
    '';
  const dataset =
    Deno.env.get('VITE_SANITY_DATASET') || Deno.env.get('SANITY_STUDIO_DATASET') || 'production';
  const apiVersion = Deno.env.get('SANITY_API_VERSION') || '2025-01-01';

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'supabase_env_missing' }, 500);
  }
  if (!sanityToken || !projectId) {
    return jsonResponse(
      {
        error: 'sanity_env_missing',
        hint: 'SANITY_API_TOKEN and VITE_SANITY_PROJECT_ID required for marketplace review',
      },
      500,
    );
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, is_suspended')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin' || profile.is_suspended === true) {
    return jsonResponse({ error: 'admin_required' }, 403);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  // List review queue
  if (body.action === 'list') {
    try {
      const result = await sanityQuery({
        projectId,
        dataset,
        token: sanityToken,
        apiVersion,
        query: REVIEW_QUEUE_GROQ,
      });
      const items = Array.isArray(result) ? result : [];
      return jsonResponse({ items }, 200);
    } catch (cause) {
      return jsonResponse(
        { error: cause instanceof Error ? cause.message : 'sanity_query_failed' },
        500,
      );
    }
  }

  const sanityDocumentId = body.sanityDocumentId?.trim() || '';
  if (!sanityDocumentId) {
    return jsonResponse({ error: 'sanity_document_id_required' }, 400);
  }

  // Load current from package_metadata (fallback) + Sanity doc fields
  const { data: metaRow } = await admin
    .from('package_metadata')
    .select(
      'workflow_status, published, stripe_price_id, suggested_price_cents, price_cents, currency',
    )
    .eq('sanity_document_id', sanityDocumentId)
    .maybeSingle();

  let current: ReviewPackageCurrent = {
    status: (metaRow?.workflow_status as string | null) ?? null,
    published: Boolean(metaRow?.published),
    stripePriceId: (metaRow?.stripe_price_id as string | null) ?? null,
    suggestedPriceCents:
      typeof metaRow?.suggested_price_cents === 'number' ? metaRow.suggested_price_cents : null,
    priceCents: typeof metaRow?.price_cents === 'number' ? metaRow.price_cents : null,
    currency: (metaRow?.currency as string | null) ?? null,
  };

  try {
    const url = new URL(
      `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`,
    );
    url.searchParams.set(
      'query',
      `*[_id == $id][0]{ status, published, stripePriceId, suggestedPriceCents, priceCents, currency }`,
    );
    url.searchParams.set('$id', JSON.stringify(sanityDocumentId));
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${sanityToken}` },
    });
    const payload = (await res.json().catch(() => ({}))) as { result?: Record<string, unknown> };
    const doc = payload.result;
    if (doc && typeof doc === 'object') {
      current = {
        status: typeof doc.status === 'string' ? doc.status : current.status,
        published: typeof doc.published === 'boolean' ? doc.published : current.published,
        stripePriceId:
          typeof doc.stripePriceId === 'string' ? doc.stripePriceId : current.stripePriceId,
        suggestedPriceCents:
          typeof doc.suggestedPriceCents === 'number'
            ? doc.suggestedPriceCents
            : current.suggestedPriceCents,
        priceCents: typeof doc.priceCents === 'number' ? doc.priceCents : current.priceCents,
        currency: typeof doc.currency === 'string' ? doc.currency : current.currency,
      };
    }
  } catch {
    // Fall back to package_metadata only
  }

  const plan = planMarketplacePackageReview(body, current);
  if (!plan.ok) {
    return jsonResponse({ error: plan.error }, 400);
  }

  try {
    await sanityMutate({
      projectId,
      dataset,
      token: sanityToken,
      apiVersion,
      mutations: buildSanityPatchMutation(plan.sanityDocumentId, plan.patch),
    });
  } catch (cause) {
    return jsonResponse(
      { error: cause instanceof Error ? cause.message : 'sanity_mutate_failed' },
      500,
    );
  }

  // Optimistic mirror of workflow fields (webhook corrects full document sync)
  if (metaRow) {
    await admin
      .from('package_metadata')
      .update({
        workflow_status: plan.metadata.workflow_status,
        published: plan.metadata.published,
        stripe_price_id: plan.metadata.stripe_price_id,
        price_cents: plan.metadata.price_cents,
        currency: plan.metadata.currency,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('sanity_document_id', plan.sanityDocumentId);
  } else {
    await admin.from('package_metadata').upsert(
      {
        sanity_document_id: plan.sanityDocumentId,
        title: plan.sanityDocumentId,
        workflow_status: plan.metadata.workflow_status,
        published: plan.metadata.published,
        stripe_price_id: plan.metadata.stripe_price_id,
        price_cents: plan.metadata.price_cents,
        currency: plan.metadata.currency,
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'sanity_document_id' },
    );
  }

  return jsonResponse(
    {
      ok: true,
      sanityDocumentId: plan.sanityDocumentId,
      action: plan.action,
      workflowStatus: plan.metadata.workflow_status,
      published: plan.metadata.published,
      stripePriceId: plan.metadata.stripe_price_id,
      priceCents: plan.metadata.price_cents,
      currency: plan.metadata.currency,
    },
    200,
  );
});