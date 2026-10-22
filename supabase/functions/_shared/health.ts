// STORY-12.4 (resolved) — api_error instrumentation. Mirrors the existing
// recordWebhookFailure pattern already used by stripe-webhook/sanity-webhook,
// but for kind: 'api_error' (5xx / uncaught exception / timeout on any Edge
// Function invocation, not restricted to webhook handlers).

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>;
};

export async function recordApiError(
  client: RpcClient,
  source: string,
  message: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await client.rpc('record_system_health_event', {
      p_kind: 'api_error',
      p_source: source,
      p_message: message,
      p_details: details,
    });
  } catch {
    // Best-effort health recording — never mask the original failure.
  }
}
