import type { FunctionsHttpError } from '@supabase/supabase-js';

type EdgeErrorBody = {
  error?: string;
  hint?: string;
};

function isFunctionsHttpError(error: unknown): error is FunctionsHttpError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'context' in error &&
    (error as FunctionsHttpError).context instanceof Response
  );
}

function formatEdgeErrorBody(body: EdgeErrorBody | null, fallback: string): string {
  if (!body?.error) {
    return fallback;
  }
  return body.hint ? `${body.error} (${body.hint})` : body.error;
}

/**
 * Supabase `functions.invoke` sets `error` on non-2xx but the JSON body may only
 * be on `data` or `error.context` depending on client version.
 */
export async function edgeFunctionErrorDetail(
  error: { message: string },
  data: unknown,
): Promise<string> {
  const payload = data as EdgeErrorBody | null;
  if (payload?.error) {
    return formatEdgeErrorBody(payload, error.message);
  }

  if (isFunctionsHttpError(error)) {
    try {
      const body = (await error.context.clone().json()) as EdgeErrorBody;
      return formatEdgeErrorBody(body, error.message);
    } catch {
      // Fall through to status-based hints.
    }

    const status = error.context.status;
    if (status === 503) {
      return 'edge_functions_unavailable (run: supabase functions serve --env-file .env)';
    }
    if (status === 401) {
      return 'unauthorized';
    }
  }

  if (error.message.includes('non-2xx')) {
    return `${error.message} — is supabase functions serve running?`;
  }

  return error.message;
}
