import { useEffect, useState } from 'react';
import {
  DEFAULT_TRIAL_WARNING_DAYS_BEFORE,
  TRIAL_DURATION_DAYS,
  formatRevenueCents,
  mergeTierCatalogOverrides,
  type PaidSubscriptionTier,
  type TierCatalogDisplayOverride,
} from '@coach360/domain';
import { PageHeader, Card, Button } from '@coach360/ui';
import {
  useSubscriptionSummariesQuery,
  useTrialWarningDaysQuery,
  useSetTrialWarningDaysMutation,
  useTrialDurationDaysQuery,
  useSetTrialDurationDaysMutation,
  useTierCatalogOverridesQuery,
  useSetTierCatalogOverridesMutation,
  useRevenueSummaryQuery,
} from '@/entities/subscription/api/subscription-queries.js';

function TierParamEditor({
  tier,
  label,
  displayPrice,
  features,
  onSave,
  isSaving,
}: {
  tier: PaidSubscriptionTier;
  label: string;
  displayPrice: string;
  features: string[];
  onSave: (override: TierCatalogDisplayOverride) => void;
  isSaving: boolean;
}) {
  const featuresKey = features.join('\n');
  const [draftLabel, setDraftLabel] = useState(label);
  const [draftPrice, setDraftPrice] = useState(displayPrice);
  const [draftFeatures, setDraftFeatures] = useState(featuresKey);

  useEffect(() => {
    setDraftLabel(label);
    setDraftPrice(displayPrice);
    setDraftFeatures(featuresKey);
  }, [tier, label, displayPrice, featuresKey]);

  return (
    <Card>
      <p className="text-xs uppercase text-coach-t3">{tier}</p>
      <p className="mt-1 font-display text-lg font-semibold text-coach-t1">Tier parameters</p>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Label</span>
          <input
            type="text"
            aria-label={`Label for ${tier}`}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Display price</span>
          <input
            type="text"
            aria-label={`Display price for ${tier}`}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={draftPrice}
            onChange={(event) => setDraftPrice(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Features (one per line)</span>
          <textarea
            aria-label={`Features for ${tier}`}
            rows={4}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={draftFeatures}
            onChange={(event) => setDraftFeatures(event.target.value)}
          />
        </label>
        <Button
          variant="primary"
          disabled={isSaving}
          onClick={() =>
            onSave({
              tier,
              label: draftLabel.trim() || label,
              displayPrice: draftPrice.trim() || displayPrice,
              features: draftFeatures
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            })
          }
        >
          Save {tier}
        </Button>
      </div>
    </Card>
  );
}

export function SubscriptionsPage() {
  const { data, isLoading } = useSubscriptionSummariesQuery();
  const warningQuery = useTrialWarningDaysQuery();
  const saveWarning = useSetTrialWarningDaysMutation();
  const durationQuery = useTrialDurationDaysQuery();
  const saveDuration = useSetTrialDurationDaysMutation();
  const overridesQuery = useTierCatalogOverridesQuery();
  const saveOverrides = useSetTierCatalogOverridesMutation();
  const revenueQuery = useRevenueSummaryQuery();

  const [draftWarningDays, setDraftWarningDays] = useState('');
  const [draftDurationDays, setDraftDurationDays] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [warningSaveError, setWarningSaveError] = useState<string | null>(null);

  const currentWarningDays = warningQuery.data ?? DEFAULT_TRIAL_WARNING_DAYS_BEFORE;
  const currentDurationDays = durationQuery.data ?? TRIAL_DURATION_DAYS;
  const catalog = mergeTierCatalogOverrides(overridesQuery.data ?? []);
  const revenue = revenueQuery.data;

  function upsertOverride(next: TierCatalogDisplayOverride) {
    const existing = overridesQuery.data ?? [];
    const without = existing.filter((item) => item.tier !== next.tier);
    setSaveError(null);
    saveOverrides.mutate([...without, next], {
      onError: (cause: unknown) => {
        setSaveError(cause instanceof Error ? cause.message : 'save_failed');
      },
    });
  }

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

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-coach-t3">Billing & revenue</p>
          <p className="mt-1 font-display text-lg font-semibold text-coach-t1">Paid revenue</p>
          {revenueQuery.isLoading ? (
            <p className="mt-2 font-body text-sm text-coach-t2">Loading revenue…</p>
          ) : (
            <>
              <p className="mt-2 font-display text-3xl font-bold text-coach-green">
                {formatRevenueCents(revenue?.paidRevenueCents ?? 0, revenue?.currency ?? 'usd')}
              </p>
              <p className="mt-1 font-body text-sm text-coach-t2">
                {revenue?.paidInvoiceCount ?? 0} paid invoices
              </p>
              <div className="mt-3 space-y-1">
                {(revenue?.activePaidByTier ?? []).map((row) => (
                  <p key={row.tier} className="font-body text-xs text-coach-t3">
                    Active {row.tier}: {row.count}
                  </p>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card className="mt-6 max-w-lg">
        <p className="text-xs uppercase text-coach-t3">Trial duration</p>
        <p className="mt-1 font-display text-lg font-semibold text-coach-t1">Days of Pro access</p>
        <p className="mt-1 font-body text-sm text-coach-t2">
          Applied when a user activates a trial (default {TRIAL_DURATION_DAYS}).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={1}
            className="w-24 rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={draftDurationDays === '' ? String(currentDurationDays) : draftDurationDays}
            onChange={(event) => setDraftDurationDays(event.target.value)}
            aria-label="Trial duration days"
          />
          <Button
            variant="primary"
            disabled={saveDuration.isPending}
            onClick={() => {
              const next = Number(draftDurationDays === '' ? currentDurationDays : draftDurationDays);
              setSaveError(null);
              saveDuration.mutate(next, {
                onError: (cause: unknown) => {
                  setSaveError(cause instanceof Error ? cause.message : 'save_failed');
                },
              });
            }}
          >
            Save
          </Button>
        </div>
        {durationQuery.isLoading ? (
          <p className="mt-2 font-body text-xs text-coach-t3">Loading setting…</p>
        ) : null}
      </Card>

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
            value={draftWarningDays === '' ? String(currentWarningDays) : draftWarningDays}
            onChange={(event) => setDraftWarningDays(event.target.value)}
            aria-label="Trial warning days before expiry"
          />
          <Button
            variant="primary"
            disabled={saveWarning.isPending}
            onClick={() => {
              const next = Number(draftWarningDays === '' ? currentWarningDays : draftWarningDays);
              setWarningSaveError(null);
              saveWarning.mutate(next, {
                onSuccess: () => {
                  setDraftWarningDays('');
                },
                onError: (cause: unknown) => {
                  setWarningSaveError(cause instanceof Error ? cause.message : 'save_failed');
                },
              });
            }}
          >
            Save
          </Button>
        </div>
        {warningQuery.isLoading ? (
          <p className="mt-2 font-body text-xs text-coach-t3">Loading setting…</p>
        ) : null}
        {warningSaveError ? (
          <p className="mt-2 font-body text-xs text-coach-red" role="alert">
            {warningSaveError}
          </p>
        ) : null}
      </Card>

      <div className="mt-6">
        <p className="font-display text-lg font-semibold text-coach-t1">Tier parameters</p>
        <p className="mt-1 font-body text-sm text-coach-t2">
          Display label, price label, and feature bullets. Stripe charge amounts stay in env/catalog
          code.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {catalog.map((entry) => (
            <TierParamEditor
              key={entry.tier}
              tier={entry.tier}
              label={entry.label}
              displayPrice={entry.displayPrice}
              features={entry.features}
              isSaving={saveOverrides.isPending}
              onSave={upsertOverride}
            />
          ))}
        </div>
      </div>

      {saveError ? <p className="mt-4 font-body text-xs text-coach-red">{saveError}</p> : null}
    </div>
  );
}
