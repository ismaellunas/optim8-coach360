import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRepositories } from '@coach360/api';
import { DEFAULT_TRIAL_WARNING_DAYS_BEFORE } from '@coach360/domain';
import { PageHeader, Card } from '@coach360/ui';

export function SubscriptionsPage() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const [draftDays, setDraftDays] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions'],
    queryFn: () => repos.subscriptions.listSummaries(),
  });

  const warningQuery = useQuery({
    queryKey: ['admin', 'trial-warning-days'],
    queryFn: () => repos.subscriptions.getTrialWarningDays(),
  });

  const saveWarning = useMutation({
    mutationFn: (days: number) => repos.subscriptions.setTrialWarningDays(days),
    onSuccess: async () => {
      setSaveError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'trial-warning-days'] });
    },
    onError: (cause: unknown) => {
      setSaveError(cause instanceof Error ? cause.message : 'save_failed');
    },
  });

  const currentDays = warningQuery.data ?? DEFAULT_TRIAL_WARNING_DAYS_BEFORE;

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

      <Card className="mt-6 max-w-lg">
        <p className="text-xs uppercase text-coach-t3">Trial expiry warning</p>
        <p className="mt-1 font-display text-lg font-semibold text-coach-t1">
          Days before expiry
        </p>
        <p className="mt-1 font-body text-sm text-coach-t2">
          Sends a warning notification when a trial has this many days left (default{' '}
          {DEFAULT_TRIAL_WARNING_DAYS_BEFORE}).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={1}
            className="w-24 rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={draftDays === '' ? String(currentDays) : draftDays}
            onChange={(event) => setDraftDays(event.target.value)}
            aria-label="Trial warning days before expiry"
          />
          <button
            type="button"
            className="rounded-xl bg-coach-orange px-4 py-2 font-display text-sm font-semibold uppercase tracking-wider text-white"
            disabled={saveWarning.isPending}
            onClick={() => {
              const next = Number(draftDays === '' ? currentDays : draftDays);
              saveWarning.mutate(next);
            }}
          >
            Save
          </button>
        </div>
        {warningQuery.isLoading ? (
          <p className="mt-2 font-body text-xs text-coach-t3">Loading setting…</p>
        ) : null}
        {saveError ? <p className="mt-2 font-body text-xs text-coach-red">{saveError}</p> : null}
      </Card>
    </div>
  );
}
