/**
 * STORY-11.3 — Mistral re-rank via Vercel AI SDK (Edge Function only).
 * Uses createMistral + generateText/Output.object; never expose MISTRAL_API_KEY to the client.
 */
import { createMistral } from 'npm:@ai-sdk/mistral@4.0.14';
import { generateText, Output } from 'npm:ai@7.0.37';
import { z } from 'npm:zod@3.25.76';
import {
  buildRerankPrompt,
  type ProviderContextPayload,
} from './handler.ts';

const rerankSchema = z.object({
  rankings: z
    .array(
      z.object({
        id: z.string().min(1),
        why: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
});

export type MistralRerankOptions = {
  apiKey?: string | null;
  modelId?: string;
};

/**
 * Call Mistral through Vercel AI SDK. Returns null when key missing or call fails
 * so the Edge Function can fall back to metadata ranking.
 */
export async function rerankPackagesWithMistral(
  payload: ProviderContextPayload,
  options: MistralRerankOptions = {},
): Promise<{ rankings: Array<{ id: string; why: string }> } | null> {
  const apiKey = (options.apiKey ?? Deno.env.get('MISTRAL_API_KEY') ?? '').trim();
  if (!apiKey) {
    return null;
  }

  try {
    const mistral = createMistral({ apiKey });
    const modelId = options.modelId ?? Deno.env.get('MISTRAL_MODEL') ?? 'mistral-small-latest';
    const result = await generateText({
      model: mistral(modelId),
      output: Output.object({ schema: rerankSchema }),
      prompt: buildRerankPrompt(payload),
    });
    return result.output ?? null;
  } catch (cause) {
    console.error(
      'mistral_rerank_failed',
      cause instanceof Error ? cause.message : String(cause),
    );
    return null;
  }
}
