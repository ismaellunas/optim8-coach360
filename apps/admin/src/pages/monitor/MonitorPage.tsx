import {
  buildRevenueCsv,
  buildUsageCsv,
  formatRevenueCents,
} from '@coach360/domain';
import { Badge, Button, Card, PageHeader } from '@coach360/ui';
import { usePlatformAnalyticsQuery } from '@/entities/monitor/api/monitor-queries.js';
import { AiConfigSection } from './AiConfigSection.js';
import { ChatModerationSection } from './ChatModerationSection.js';
import { downloadCsv } from './download-csv.js';
import { HealthSection } from './HealthSection.js';

export function MonitorPage() {
  const analyticsQuery = usePlatformAnalyticsQuery(14);
  const analytics = analyticsQuery.data;

  return (
    <div>
      <PageHeader title="Monitor" subtitle="Usage, analytics, and platform health." />

      {analyticsQuery.isLoading ? <p className="text-coach-t2">Loading analytics…</p> : null}
      {analyticsQuery.isError ? (
        <p className="text-coach-red">{(analyticsQuery.error as Error).message}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="text-center">
          <p className="font-display text-3xl font-bold text-coach-orange">
            {analytics?.dauToday ?? 0}
          </p>
          <p className="mt-1 text-xs uppercase text-coach-t3">DAU</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-3xl font-bold text-coach-green">
            {formatRevenueCents(
              analytics?.paidRevenueCents ?? 0,
              analytics?.currency ?? 'usd',
            )}
          </p>
          <p className="mt-1 text-xs uppercase text-coach-t3">Revenue</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-3xl font-bold text-coach-t1">
            {analytics?.contentCompletion.sessionCompletions ?? 0}
          </p>
          <p className="mt-1 text-xs uppercase text-coach-t3">Content completion</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-3xl font-bold text-coach-t1">
            {analytics?.onboardingFunnel.at(-1)?.count ?? 0}
          </p>
          <p className="mt-1 text-xs uppercase text-coach-t3">First drill</p>
        </Card>
      </div>

      <Card className="mt-6">
        <p className="font-display text-lg font-semibold text-coach-t1">Onboarding funnel</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(analytics?.onboardingFunnel ?? []).map((stage) => (
            <div key={stage.id} className="rounded-[10px] border border-coach-border p-3">
              <p className="text-xs uppercase text-coach-t3">{stage.label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-coach-t1">{stage.count}</p>
              <p className="mt-1 font-mono text-xs text-coach-t3">
                {Math.round(stage.conversionRate * 100)}% from prior
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <p className="font-display text-lg font-semibold text-coach-t1">Content completion</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Badge>
            Sessions: {analytics?.contentCompletion.sessionCompletions ?? 0}
          </Badge>
          <Badge>
            Drip: {analytics?.contentCompletion.dripCompletions ?? 0}
          </Badge>
          <Badge>
            First drill: {analytics?.contentCompletion.firstDrillCompletions ?? 0}
          </Badge>
        </div>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant="primary"
          disabled={!analytics}
          onClick={() => {
            if (!analytics) return;
            downloadCsv('revenue-report.csv', buildRevenueCsv(analytics));
          }}
        >
          Export revenue CSV
        </Button>
        <Button
          variant="ghost"
          disabled={!analytics}
          onClick={() => {
            if (!analytics) return;
            downloadCsv('usage-report.csv', buildUsageCsv(analytics));
          }}
        >
          Export usage CSV
        </Button>
      </div>

      <ChatModerationSection />
      <AiConfigSection />
      <HealthSection />
    </div>
  );
}
