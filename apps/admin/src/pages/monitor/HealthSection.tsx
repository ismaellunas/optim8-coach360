import { Badge, Card } from '@coach360/ui';
import { useHealthSummaryQuery } from '@/entities/monitor/api/monitor-queries.js';

const STATUS_LABEL: Record<string, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  critical: 'Critical',
};

export function HealthSection() {
  const healthQuery = useHealthSummaryQuery(24);
  const health = healthQuery.data;

  return (
    <div className="mt-8 space-y-4">
      <h2 className="font-display text-lg font-semibold text-coach-t1">App health</h2>
      <p className="font-body text-sm text-coach-t2">
        API errors, webhook failures, and failed RAG embedding jobs in the last 24 hours.
      </p>

      {healthQuery.isLoading ? (
        <p className="text-coach-t2">Loading health…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="text-center">
              <p className="font-display text-2xl font-bold text-coach-t1">
                {STATUS_LABEL[health?.status ?? 'healthy']}
              </p>
              <p className="mt-1 text-xs uppercase text-coach-t3">Status</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-bold text-coach-t1">
                {health?.apiErrorCount ?? 0}
              </p>
              <p className="mt-1 text-xs uppercase text-coach-t3">API errors</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-bold text-coach-t1">
                {health?.webhookFailureCount ?? 0}
              </p>
              <p className="mt-1 text-xs uppercase text-coach-t3">Webhook failures</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-bold text-coach-t1">
                {health?.ragJobFailureCount ?? 0}
              </p>
              <p className="mt-1 text-xs uppercase text-coach-t3">RAG job failures</p>
            </Card>
          </div>

          {(health?.recentEvents ?? []).length > 0 ? (
            <Card>
              <p className="font-display text-base font-semibold text-coach-t1">Recent events</p>
              <ul className="mt-3 space-y-2">
                {health?.recentEvents.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center gap-2">
                    <Badge>{event.kind}</Badge>
                    <span className="font-body text-xs text-coach-t3">{event.source}</span>
                    <span className="font-body text-sm text-coach-t1">{event.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
