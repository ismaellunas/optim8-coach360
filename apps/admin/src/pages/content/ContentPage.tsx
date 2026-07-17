import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  FEATURE_TIER_REQUIREMENTS,
  type FeatureFlagOverride,
  type GatedRole,
} from '@coach360/domain';
import { PageHeader, Card, Badge, Button } from '@coach360/ui';
import { tryReadSanityStudioUrl } from '@/shared/config/env.js';

const PAID_TIERS = ['basic', 'advanced', 'pro'] as const;

type GatedRow = {
  feature: string;
  role: GatedRole;
  defaultTier: (typeof PAID_TIERS)[number];
};

const GATED_ROWS: GatedRow[] = Object.entries(FEATURE_TIER_REQUIREMENTS).flatMap(
  ([feature, reqs]) =>
    (Object.entries(reqs) as [GatedRole, (typeof PAID_TIERS)[number]][]).map(
      ([role, defaultTier]) => ({ feature, role, defaultTier }),
    ),
);

function rowKey(feature: string, role: GatedRole): string {
  return `${feature}:${role}`;
}

function FeatureGatingSection() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<
    Record<string, { requiredTier: string; paywallTitle: string; paywallMessage: string }>
  >({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: () => repos.content.listFeatureFlags(),
  });

  const overridesByKey = new Map<string, FeatureFlagOverride>(
    (data ?? []).map((override) => [rowKey(override.feature, override.role), override]),
  );

  const saveFlag = useMutation({
    mutationFn: (input: {
      feature: string;
      role: GatedRole;
      requiredTier: string;
      paywallTitle: string;
      paywallMessage: string;
    }) =>
      repos.content.upsertFeatureFlag({
        feature: input.feature,
        role: input.role,
        requiredTier: input.requiredTier as FeatureFlagOverride['requiredTier'],
        paywallTitle: input.paywallTitle || null,
        paywallMessage: input.paywallMessage || null,
      }),
    onSuccess: async () => {
      setSaveError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
    },
    onError: (cause: unknown) => {
      setSaveError(cause instanceof Error ? cause.message : 'save_failed');
    },
  });

  return (
    <Card className="mt-6">
      <p className="text-xs uppercase text-coach-t3">Content Paywall</p>
      <p className="mt-1 font-display text-lg font-semibold text-coach-t1">
        Feature gating by role
      </p>
      <p className="mt-1 font-body text-sm text-coach-t2">
        Set which tier unlocks each feature per role, and edit the paywall message shown when
        it&apos;s locked.
      </p>
      {isLoading ? <p className="mt-2 text-coach-t2">Loading feature flags…</p> : null}
      <div className="mt-4 space-y-4">
        {GATED_ROWS.map((row) => {
          const key = rowKey(row.feature, row.role);
          const override = overridesByKey.get(key);
          const draft = drafts[key];
          const requiredTier = draft?.requiredTier ?? override?.requiredTier ?? row.defaultTier;
          const paywallTitle = draft?.paywallTitle ?? override?.paywallTitle ?? '';
          const paywallMessage = draft?.paywallMessage ?? override?.paywallMessage ?? '';

          return (
            <div key={key} className="rounded-xl border border-coach-border p-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold text-coach-t1">
                  {row.feature} <span className="text-coach-t3">({row.role})</span>
                </p>
                <select
                  className="rounded-[10px] border border-coach-border bg-coach-surface px-3 py-1 font-body text-sm text-coach-t1"
                  aria-label={`Required tier for ${row.feature} (${row.role})`}
                  value={requiredTier}
                  onChange={(event) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [key]: {
                        requiredTier: event.target.value,
                        paywallTitle,
                        paywallMessage,
                      },
                    }))
                  }
                >
                  {PAID_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Paywall title"
                className="mt-2 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
                aria-label={`Paywall title for ${row.feature} (${row.role})`}
                value={paywallTitle}
                onChange={(event) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [key]: { requiredTier, paywallTitle: event.target.value, paywallMessage },
                  }))
                }
              />
              <textarea
                placeholder="Paywall message"
                className="mt-2 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
                aria-label={`Paywall message for ${row.feature} (${row.role})`}
                value={paywallMessage}
                onChange={(event) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [key]: { requiredTier, paywallTitle, paywallMessage: event.target.value },
                  }))
                }
              />
              <Button
                disabled={saveFlag.isPending}
                onClick={() =>
                  saveFlag.mutate({
                    feature: row.feature,
                    role: row.role,
                    requiredTier,
                    paywallTitle,
                    paywallMessage,
                  })
                }
              >
                Save
              </Button>
            </div>
          );
        })}
      </div>
      {saveError ? <p className="mt-2 font-body text-xs text-coach-red">{saveError}</p> : null}
    </Card>
  );
}

function FreeContentCatalogSection() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'free-content-catalog'],
    queryFn: () => repos.content.listFreeContentCatalog(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'free-content-catalog'] });

  const addItem = useMutation({
    mutationFn: () => repos.content.addFreeContentCatalogItem({ title, category: category || null }),
    onSuccess: async () => {
      setError(null);
      setTitle('');
      setCategory('');
      await invalidate();
    },
    onError: (cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'add_failed');
    },
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => repos.content.removeFreeContentCatalogItem(id),
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'remove_failed');
    },
  });

  return (
    <Card className="mt-6">
      <p className="text-xs uppercase text-coach-t3">Content Paywall</p>
      <p className="mt-1 font-display text-lg font-semibold text-coach-t1">
        Free content catalog (Basic tier)
      </p>
      <p className="mt-1 font-body text-sm text-coach-t2">
        Items Basic-tier players and coaches can browse for free, without purchasing.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Title"
          className="rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
          aria-label="Free content title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <input
          type="text"
          placeholder="Category"
          className="rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
          aria-label="Free content category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
        <Button disabled={!title || addItem.isPending} onClick={() => addItem.mutate()}>
          Add
        </Button>
      </div>
      {error ? <p className="mt-2 font-body text-xs text-coach-red">{error}</p> : null}
      {isLoading ? <p className="mt-2 text-coach-t2">Loading catalog…</p> : null}
      <div className="mt-4 space-y-2">
        {(data ?? []).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl border border-coach-border p-3"
          >
            <div>
              <p className="font-semibold text-coach-t1">{item.title}</p>
              {item.category ? <Badge tone="green">{item.category}</Badge> : null}
            </div>
            <Button
              disabled={removeItem.isPending}
              onClick={() => removeItem.mutate(item.id)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ContentPage() {
  const repos = useRepositories();
  const studioUrl = tryReadSanityStudioUrl();
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
      {studioUrl ? (
        <div className="mb-6">
          <Button
            onClick={() => {
              window.open(studioUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            Open Sanity Studio
          </Button>
        </div>
      ) : (
        <p className="mb-6 font-body text-sm text-coach-t3">
          Set <code className="text-coach-t2">VITE_SANITY_STUDIO_URL</code> in{' '}
          <code className="text-coach-t2">.env</code> to enable the Sanity Studio link.
        </p>
      )}
      {isLoading ? <p className="text-coach-t2">Loading content…</p> : null}
      <div className="space-y-3">
        {(data ?? []).map((item) => (
          <Card key={item.id} className="flex items-center justify-between">
            <p className="font-semibold text-coach-t1">{item.title}</p>
            <Badge tone={item.status === 'review' ? 'yellow' : 'green'}>{item.status}</Badge>
          </Card>
        ))}
      </div>
      <FeatureGatingSection />
      <FreeContentCatalogSection />
    </div>
  );
}
