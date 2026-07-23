import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositories } from '@coach360/api';
import {
  FEATURE_TIER_REQUIREMENTS,
  formatFeatureLabel,
  gatedFeaturesForRole,
  resolvedTierForFeatureRole,
  tierDisplayLabel,
  type FeatureFlagOverride,
  type GatedRole,
} from '@coach360/domain';
import { PageHeader, Card, Badge, Button } from '@coach360/ui';
import { adminPaths } from '@/app/router/paths.js';
import { tryReadSanityStudioUrl } from '@/shared/config/env.js';

const PAID_TIERS = ['basic', 'advanced', 'pro'] as const;

const ROLE_TABS: { role: GatedRole; label: string }[] = [
  { role: 'player', label: 'Player' },
  { role: 'coach', label: 'Coach' },
  { role: 'team', label: 'Team Manager' },
];

function rowKey(feature: string, role: GatedRole): string {
  return `${feature}:${role}`;
}

function workflowBadgeTone(status: string | null): 'yellow' | 'green' | 'blue' | 'purple' {
  if (status === 'pending_review') return 'yellow';
  if (status === 'approved') return 'green';
  if (status === 'rejected') return 'purple';
  return 'blue';
}

function MarketplaceReviewSection() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const [publishDrafts, setPublishDrafts] = useState<
    Record<string, { stripePriceId: string; priceCents: string }>
  >({});
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'marketplace-review'],
    queryFn: () => repos.content.listMarketplaceReviewQueue(),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'marketplace-review'] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => repos.content.approveMarketplacePackage(id),
    onSuccess: async () => {
      setActionError(null);
      await invalidate();
    },
    onError: (cause: unknown) => {
      setActionError(cause instanceof Error ? cause.message : 'approve_failed');
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => repos.content.rejectMarketplacePackage(id),
    onSuccess: async () => {
      setActionError(null);
      await invalidate();
    },
    onError: (cause: unknown) => {
      setActionError(cause instanceof Error ? cause.message : 'reject_failed');
    },
  });

  const publish = useMutation({
    mutationFn: (input: {
      sanityDocumentId: string;
      stripePriceId: string;
      priceCents: number | null;
    }) => repos.content.publishMarketplacePackage(input),
    onSuccess: async (_result, vars) => {
      setActionError(null);
      setPublishDrafts((prev) => {
        const next = { ...prev };
        delete next[vars.sanityDocumentId];
        return next;
      });
      await invalidate();
    },
    onError: (cause: unknown) => {
      setActionError(cause instanceof Error ? cause.message : 'publish_failed');
    },
  });

  const busy = approve.isPending || reject.isPending || publish.isPending;

  return (
    <Card className="mt-6" data-testid="marketplace-review-queue">
      <p className="text-xs uppercase text-coach-t3">Marketplace Path B</p>
      <p className="mt-1 font-display text-lg font-semibold text-coach-t1">
        Package review queue
      </p>
      <p className="mt-1 font-body text-sm text-coach-t2">
        Coaches submit packages for review. Approve or reject from here, then publish with a Stripe
        price ID (coach may have suggested a display price).
      </p>

      {isLoading ? <p className="mt-4 text-coach-t2">Loading review queue…</p> : null}
      {actionError ? <p className="mt-2 font-body text-xs text-coach-red">{actionError}</p> : null}

      <div className="mt-4 space-y-3">
        {(data ?? []).map((item) => {
          const draft = publishDrafts[item.id] ?? {
            stripePriceId: item.stripePriceId ?? '',
            priceCents:
              item.priceCents != null
                ? String(item.priceCents)
                : item.suggestedPriceCents != null
                  ? String(item.suggestedPriceCents)
                  : '',
          };
          const canPublish = item.workflowStatus === 'approved' && !item.published;

          return (
            <div
              key={item.id}
              className="rounded-xl border border-coach-border p-4"
              data-testid="marketplace-review-item"
              data-package-id={item.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-coach-t1">{item.title}</p>
                  <p className="mt-1 font-body text-xs text-coach-t3">{item.id}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={workflowBadgeTone(item.workflowStatus)}>
                      {item.workflowStatus ?? 'unknown'}
                    </Badge>
                    {item.createdByRole ? <Badge tone="blue">{item.createdByRole}</Badge> : null}
                    {item.suggestedPriceCents != null ? (
                      <Badge tone="yellow">
                        Suggested: {item.suggestedPriceCents} ({item.currency || 'usd'})
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.workflowStatus === 'pending_review' ? (
                    <>
                      <Button
                        disabled={busy}
                        data-testid="marketplace-approve"
                        onClick={() => approve.mutate(item.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        data-testid="marketplace-reject"
                        onClick={() => reject.mutate(item.id)}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {canPublish ? (
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-coach-border pt-4">
                  <label className="flex flex-col gap-1 font-body text-xs text-coach-t3">
                    Stripe price ID
                    <input
                      type="text"
                      className="min-w-[220px] rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 text-sm text-coach-t1"
                      aria-label={`Stripe price ID for ${item.title}`}
                      data-testid="marketplace-stripe-price-input"
                      value={draft.stripePriceId}
                      onChange={(event) =>
                        setPublishDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...draft, stripePriceId: event.target.value },
                        }))
                      }
                      placeholder="price_…"
                    />
                  </label>
                  <label className="flex flex-col gap-1 font-body text-xs text-coach-t3">
                    Display price (minor units)
                    <input
                      type="number"
                      min={0}
                      className="w-[140px] rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 text-sm text-coach-t1"
                      aria-label={`Display price for ${item.title}`}
                      value={draft.priceCents}
                      onChange={(event) =>
                        setPublishDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...draft, priceCents: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <Button
                    disabled={busy || !draft.stripePriceId.trim()}
                    data-testid="marketplace-publish"
                    onClick={() =>
                      publish.mutate({
                        sanityDocumentId: item.id,
                        stripePriceId: draft.stripePriceId.trim(),
                        priceCents: draft.priceCents.trim() ? Number(draft.priceCents) : null,
                      })
                    }
                  >
                    Publish to marketplace
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!isLoading && (data ?? []).length === 0 ? (
        <p className="mt-3 font-body text-sm text-coach-t3">
          No packages awaiting review or publish.
        </p>
      ) : null}
    </Card>
  );
}

function FeatureGatingSection() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState<GatedRole>('player');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: () => repos.content.listFeatureFlags(),
  });

  const overrides = data ?? [];

  const overridesByKey = useMemo(
    () =>
      new Map<string, FeatureFlagOverride>(
        overrides.map((override) => [rowKey(override.feature, override.role), override]),
      ),
    [overrides],
  );

  const features = useMemo(
    () => gatedFeaturesForRole(activeRole, overrides),
    [activeRole, overrides],
  );

  const saveFlag = useMutation({
    mutationFn: (input: { feature: string; role: GatedRole; requiredTier: string }) =>
      repos.content.upsertFeatureFlag({
        feature: input.feature,
        role: input.role,
        requiredTier: input.requiredTier as FeatureFlagOverride['requiredTier'],
        paywallTitle: null,
        paywallMessage: null,
      }),
    onSuccess: async () => {
      setSaveError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
    },
    onError: (cause: unknown) => {
      setSaveError(cause instanceof Error ? cause.message : 'save_failed');
    },
    onSettled: () => {
      setSavingKey(null);
    },
  });

  return (
    <Card className="mt-6">
      <p className="text-xs uppercase text-coach-t3">Content Paywall</p>
      <p className="mt-1 font-display text-lg font-semibold text-coach-t1">
        Feature gating by role
      </p>
      <p className="mt-1 font-body text-sm text-coach-t2">
        Set which tier unlocks each feature per role. Saved values override code defaults; mobile
        shows a generic paywall when a feature is locked.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.role}
            type="button"
            className={[
              'rounded-full border px-4 py-1.5 font-body text-sm transition-colors',
              activeRole === tab.role
                ? 'border-coach-green bg-coach-green/10 font-semibold text-coach-t1'
                : 'border-coach-border bg-coach-surface text-coach-t2 hover:text-coach-t1',
            ].join(' ')}
            aria-pressed={activeRole === tab.role}
            onClick={() => setActiveRole(tab.role)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? <p className="mt-4 text-coach-t2">Loading feature flags…</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-coach-border">
        <table className="w-full min-w-[320px] border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-coach-border bg-coach-card text-left text-coach-t3">
              <th className="px-4 py-3 font-semibold uppercase tracking-wide">Feature</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wide">Tier</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => {
              const key = rowKey(feature, activeRole);
              const override = overridesByKey.get(key);
              const defaultTier = FEATURE_TIER_REQUIREMENTS[feature]?.[activeRole] ?? null;
              const displayTier =
                override?.requiredTier ??
                defaultTier ??
                resolvedTierForFeatureRole(feature, activeRole, overrides);
              const isSaving = savingKey === key;

              return (
                <tr key={key} className="border-b border-coach-border last:border-b-0">
                  <td className="px-4 py-3 font-medium text-coach-t1">
                    {formatFeatureLabel(feature)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="w-full max-w-[180px] rounded-[10px] border border-coach-border bg-coach-surface px-3 py-1.5 text-coach-t1 disabled:opacity-60"
                      aria-label={`Required tier for ${formatFeatureLabel(feature)} (${activeRole})`}
                      value={displayTier ?? PAID_TIERS[0]}
                      disabled={isSaving || saveFlag.isPending}
                      onChange={(event) => {
                        setSavingKey(key);
                        saveFlag.mutate({
                          feature,
                          role: activeRole,
                          requiredTier: event.target.value,
                        });
                      }}
                    >
                      {PAID_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tierDisplayLabel(tier)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {features.length === 0 && !isLoading ? (
        <p className="mt-3 font-body text-sm text-coach-t3">No gated features for this role.</p>
      ) : null}
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
            <Button disabled={removeItem.isPending} onClick={() => removeItem.mutate(item.id)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ContentPage() {
  const navigate = useNavigate();
  const externalStudioUrl = tryReadSanityStudioUrl();

  return (
    <div>
      <PageHeader
        title="Content"
        subtitle="Marketplace operations and Sanity Studio authoring."
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            navigate(adminPaths.studio);
          }}
        >
          Open Sanity Studio
        </Button>
        {externalStudioUrl && !externalStudioUrl.includes(adminPaths.studio) ? (
          <Button
            variant="ghost"
            onClick={() => {
              window.open(externalStudioUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            Open external Studio
          </Button>
        ) : null}
      </div>
      <MarketplaceReviewSection />
      <FeatureGatingSection />
      <FreeContentCatalogSection />
    </div>
  );
}
