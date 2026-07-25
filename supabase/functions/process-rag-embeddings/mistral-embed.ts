/**
 * STORY-11.4 — Mistral embeddings via Vercel AI SDK (Edge Function only).
 * Uses createMistral + embed / mistral.embedding('mistral-embed').
 * Never expose MISTRAL_API_KEY to the client.
 */
import { createMistral } from 'npm:@ai-sdk/mistral@4.0.14';
import { embed } from 'npm:ai@7.0.37';

export type MistralEmbedOptions = {
  apiKey?: string | null;
  modelId?: string;
};

/**
 * Generate a 1024-d embedding for `value`. Returns null when key missing or call fails.
 */
export async function embedTextWithMistral(
  value: string,
  options: MistralEmbedOptions = {},
): Promise<number[] | null> {
  const apiKey = (options.apiKey ?? Deno.env.get('MISTRAL_API_KEY') ?? '').trim();
  if (!apiKey) {
    return null;
  }

  const text = value.trim();
  if (!text) {
    return null;
  }

  try {
    const mistral = createMistral({ apiKey });
    const modelId =
      options.modelId ?? Deno.env.get('MISTRAL_EMBEDDING_MODEL') ?? 'mistral-embed';
    const result = await embed({
      model: mistral.embedding(modelId),
      value: text,
    });
    const embedding = result.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return null;
    }
    return embedding;
  } catch (cause) {
    console.error(
      'mistral_embed_failed',
      cause instanceof Error ? cause.message : String(cause),
    );
    return null;
  }
}
