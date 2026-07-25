import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  featureAccessDeniedResponse,
  loadAccessContext,
  requireFeatureAccess,
} from '../_shared/rbac.ts';
import {
  buildProviderContextPayload,
  buildRecommendationQueryText,
  finalizeRecommendations,
  LLM_CANDIDATE_POOL,
  LLM_TOP_K,
  mapSimilarityRowsToRecommendations,
  parseRecommendationContext,
  passesHardFilters,
  RAG_TOP_K_DEFAULT,
  rankPackageRecommendations,
  type PackageRecommendation,
  type RecommendationCandidate,
  type RecommendPackagesRequestBody,
  type SimilarityMatchRow,
} from './handler.ts';
import { embedTextWithMistral, rerankPackagesWithMistral } from './mistral.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PackageMetadataRow = {
  sanity_document_id: string;
  title: string;
  description: string | null;
  skills: string[] | null;
  objectives: string[] | null;
  age_min: number | null;
  age_max: number | null;
  published: boolean;
};

type MatchPackageEmbeddingRow = {
  sanity_document_id: string;
  content_text: string;
  similarity: number;
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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY');
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'supabase_env_missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  let access;
  try {
    access = await loadAccessContext(admin, user.id);
  } catch (cause) {
    return new Response(
      JSON.stringify({
        error: cause instanceof Error ? cause.message : 'access_context_failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // OQ-6.5 — AI package suggestions are Pro-only. Gate BEFORE any Mistral call (AC-3).
  const gate = requireFeatureAccess({
    role: access.role,
    tier: access.tier,
    feature: 'ai',
  });
  if (!gate.ok) {
    return featureAccessDeniedResponse(gate, corsHeaders);
  }

  let body: RecommendPackagesRequestBody = {};
  try {
    body = (await request.json()) as RecommendPackagesRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: purchaseRows, error: purchaseError } = await admin
    .from('purchases')
    .select('sanity_document_id')
    .eq('buyer_id', user.id);

  if (purchaseError) {
    return new Response(JSON.stringify({ error: purchaseError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const serverPurchaseHistory = (purchaseRows ?? [])
    .map((row: { sanity_document_id: string }) => row.sanity_document_id)
    .filter(Boolean);

  const context = parseRecommendationContext(body, access.tier, serverPurchaseHistory);

  const { data: packageRows, error: packageError } = await admin
    .from('package_metadata')
    .select(
      'sanity_document_id, title, description, skills, objectives, age_min, age_max, published',
    )
    .eq('published', true);

  if (packageError) {
    return new Response(JSON.stringify({ error: packageError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const candidates: RecommendationCandidate[] = ((packageRows ?? []) as PackageMetadataRow[]).map(
    (row) => ({
      id: row.sanity_document_id,
      title: row.title,
      description: row.description,
      skills: row.skills ?? [],
      objectives: row.objectives ?? [],
      ageMin: row.age_min,
      ageMax: row.age_max,
      published: row.published,
    }),
  );

  const byId = new Map(candidates.map((c) => [c.id, c]));

  // STORY-11.4 — RAG retrieval (top 5–10) before LLM re-rank; metadata fallback.
  let candidatePool: PackageRecommendation[] = [];
  let retrieval: 'rag' | 'metadata' = 'metadata';

  const queryText = buildRecommendationQueryText(context);
  const queryEmbedding = queryText ? await embedTextWithMistral(queryText) : null;

  if (queryEmbedding) {
    const { data: matchRows, error: matchError } = await admin.rpc('match_package_embeddings', {
      query_embedding: queryEmbedding,
      match_count: RAG_TOP_K_DEFAULT,
      match_threshold: 0,
    });

    if (!matchError && Array.isArray(matchRows) && matchRows.length > 0) {
      const similarityRows: SimilarityMatchRow[] = [];
      for (const row of matchRows as MatchPackageEmbeddingRow[]) {
        const cand = byId.get(row.sanity_document_id);
        if (!cand) continue;
        if (!passesHardFilters(cand, context)) continue;
        similarityRows.push({
          sanityDocumentId: cand.id,
          title: cand.title,
          similarity: row.similarity,
          skills: cand.skills ?? [],
          objectives: cand.objectives ?? [],
        });
      }
      const ragRanked = mapSimilarityRowsToRecommendations(
        similarityRows,
        RAG_TOP_K_DEFAULT,
      );
      if (ragRanked.length > 0) {
        candidatePool = ragRanked;
        retrieval = 'rag';
      }
    }
  }

  if (retrieval === 'metadata') {
    candidatePool = rankPackageRecommendations(candidates, context, LLM_CANDIDATE_POOL);
  }

  const { data: profileRow } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const providerPayload = buildProviderContextPayload(context, candidatePool, {
    userId: user.id,
    email: user.email ?? null,
    displayName:
      profileRow && typeof (profileRow as { display_name?: unknown }).display_name === 'string'
        ? (profileRow as { display_name: string }).display_name
        : null,
  });

  // AC-1 / AC-2 — Mistral via Vercel AI SDK; fallback to metadata/RAG pool on failure.
  const llmResult = await rerankPackagesWithMistral(providerPayload);
  const recommendations = finalizeRecommendations(candidatePool, llmResult, LLM_TOP_K);

  return new Response(
    JSON.stringify({
      recommendations,
      context: {
        objectives: context.objectives,
        age: context.age ?? null,
        tier: context.tier,
        purchaseHistory: context.purchaseHistory,
      },
      retrieval,
      llm: llmResult ? 'mistral' : 'metadata_fallback',
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
