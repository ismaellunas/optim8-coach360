import { PageHeader, Card } from '@coach360/ui';

const metrics = [
  { label: 'DAU', value: '1,089' },
  { label: 'Avg session', value: '14 min' },
  { label: 'Drills/day', value: '3,456' },
  { label: 'Messages/day', value: '8,901' },
];

export function MonitorPage() {
  return (
    <div>
      <PageHeader title="Monitor" subtitle="Usage, analytics, and platform health." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="text-center">
            <p className="font-display text-3xl font-bold text-coach-orange">{metric.value}</p>
            <p className="mt-1 text-xs uppercase text-coach-t3">{metric.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
