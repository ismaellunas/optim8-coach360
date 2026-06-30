import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@coach360/api';
import { PageHeader, Card, Badge, Button } from '@coach360/ui';
import { readSanityStudioUrl } from '@/shared/config/env.js';

export function ContentPage() {
  const repos = useRepositories();
  const studioUrl = readSanityStudioUrl();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'content'],
    queryFn: () => repos.content.list(),
  });

  return (
    <div>
      <PageHeader
        title="Content"
        subtitle="Marketplace operations and Sanity Studio authoring."
      />
      <div className="mb-6">
        <Button
          onClick={() => {
            window.open(studioUrl, '_blank', 'noopener,noreferrer');
          }}
        >
          Open Sanity Studio
        </Button>
      </div>
      {isLoading ? <p className="text-coach-t2">Loading content…</p> : null}
      <div className="space-y-3">
        {(data ?? []).map((item) => (
          <Card key={item.id} className="flex items-center justify-between">
            <p className="font-semibold text-coach-t1">{item.title}</p>
            <Badge tone={item.status === 'review' ? 'yellow' : 'green'}>{item.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
