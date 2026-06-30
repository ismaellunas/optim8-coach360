import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@coach360/api';
import { PageHeader, Card } from '@coach360/ui';

export function SubscriptionsPage() {
  const repos = useRepositories();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions'],
    queryFn: () => repos.subscriptions.listSummaries(),
  });

  return (
    <div>
      <PageHeader title="Subscriptions" subtitle="Tiers, trials, and billing overview." />
      {isLoading ? <p className="text-coach-t2">Loading subscriptions…</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(data ?? []).map((item) => (
          <Card key={item.tier}>
            <p className="text-xs uppercase text-coach-t3">{item.tier}</p>
            <p className="mt-2 font-display text-3xl font-bold text-coach-t1">{item.count}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
