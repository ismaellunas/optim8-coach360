import { firstEnv } from '../env.mjs';
import { postJson } from '../http.mjs';

export async function runMistralSuite({ env, reporter }) {
  const suite = 'mistral';
  const apiKey = firstEnv(env, ['MISTRAL_API_KEY']);
  if (!apiKey) {
    reporter.skip(suite, 'embeddings_api', 'missing MISTRAL_API_KEY');
    return;
  }

  const model = firstEnv(env, ['MISTRAL_EMBEDDING_MODEL']) || 'mistral-embed';
  const res = await postJson('https://api.mistral.ai/v1/embeddings', {
    headers: { Authorization: `Bearer ${apiKey}` },
    body: { model, input: ['Coach360 integration smoke'] },
  });

  if (res.status === 401) {
    reporter.fail(
      suite,
      'embeddings_api',
      '401 Unauthorized — use a Mistral Studio key (not Vercel AI Gateway)',
    );
    return;
  }
  if (!res.ok) {
    reporter.fail(suite, 'embeddings_api', `HTTP ${res.status}: ${res.text.slice(0, 200)}`);
    return;
  }

  const dims = res.json?.data?.[0]?.embedding?.length ?? 0;
  if (dims !== 1024) {
    reporter.fail(suite, 'embeddings_api', `expected 1024 dims, got ${dims}`);
    return;
  }
  reporter.pass(suite, 'embeddings_api', `model=${res.json?.model || model} dims=${dims}`);
}
