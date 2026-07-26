/**
 * STORY-12.4 AC-5 — app health summary for the admin Monitor pillar.
 */

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export type SystemHealthEventKind = 'api_error' | 'webhook_failure';

export type HealthSummary = {
  status: HealthStatus;
  windowHours: number;
  apiErrorCount: number;
  webhookFailureCount: number;
  ragJobFailureCount: number;
  recentEvents: Array<{
    id: string;
    kind: SystemHealthEventKind;
    source: string;
    message: string;
    createdAt: string;
  }>;
};

/** Derive overall status from failure counts in the health window. */
export function healthStatusFor(counts: {
  apiErrorCount: number;
  webhookFailureCount: number;
  ragJobFailureCount: number;
}): HealthStatus {
  const api = Math.max(0, Math.trunc(counts.apiErrorCount));
  const webhooks = Math.max(0, Math.trunc(counts.webhookFailureCount));
  const rag = Math.max(0, Math.trunc(counts.ragJobFailureCount));
  const total = api + webhooks + rag;

  if (total === 0) return 'healthy';
  // Critical: sustained webhook outage or many API errors.
  if (webhooks >= 5 || api >= 20 || total >= 30) return 'critical';
  return 'degraded';
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asKind(value: unknown): SystemHealthEventKind {
  return value === 'webhook_failure' ? 'webhook_failure' : 'api_error';
}

/** Parse snake_case RPC payload into typed HealthSummary. */
export function parseHealthSummary(raw: unknown): HealthSummary {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const apiErrorCount = asNumber(row.api_error_count);
  const webhookFailureCount = asNumber(row.webhook_failure_count);
  const ragJobFailureCount = asNumber(row.rag_job_failure_count);
  const windowHours = Math.max(1, asNumber(row.window_hours, 24));

  const eventsRaw = Array.isArray(row.recent_events) ? row.recent_events : [];
  const recentEvents = eventsRaw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: asString(item.id),
      kind: asKind(item.kind),
      source: asString(item.source),
      message: asString(item.message),
      createdAt: asString(item.created_at),
    }))
    .filter((item) => item.id.length > 0);

  return {
    status: healthStatusFor({ apiErrorCount, webhookFailureCount, ragJobFailureCount }),
    windowHours,
    apiErrorCount,
    webhookFailureCount,
    ragJobFailureCount,
    recentEvents,
  };
}
