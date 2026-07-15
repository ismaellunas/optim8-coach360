import { useState } from 'react';
import {
  accountPlanOverview,
  accountUsageSummary,
  canViewBillingHistory,
  classifyTierChange,
  downgradeRetentionNotice,
  isSubscriptionPaymentLocked,
  lockedStateMessage,
  pendingTierChange,
  STRIPE_PRODUCT_CATALOG,
} from '@coach360/domain';
import { Badge, Button as Btn, Card, PageHeader, ScreenContainer } from '@/shared/ui/primitives.jsx';
import { borderAccentClass as bdcx, textAccentClass as tcx } from '@/shared/ui/accent.js';

const TIER_ORDER = ['trial', 'basic', 'advanced', 'pro'];
const tierIndex = (t) => TIER_ORDER.indexOf(t);

const ACCENT_BY_TIER = {
  basic: 'green',
  advanced: 'blue',
  pro: 'orange',
};

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function formatCents(amountCents, currency) {
  const amount = (amountCents ?? 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function BillingHistorySection({ invoices }) {
  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <div className="font-display text-sm font-semibold text-coach-t1">Billing history</div>
        <div className="mt-1 font-body text-xs text-coach-t3">No invoices yet.</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 font-display text-sm font-semibold text-coach-t1">Billing history</div>
      {invoices.map(function (invoice) {
        return (
          <div
            key={invoice.id || invoice.stripeInvoiceId}
            className="mb-2 flex items-center justify-between border-b border-coach-border pb-2 last:mb-0 last:border-b-0 last:pb-0"
          >
            <div>
              <div className="font-body text-sm text-coach-t1">
                {formatCents(invoice.amountCents, invoice.currency)}
              </div>
              <div className="font-body text-[11px] text-coach-t3">
                {formatDate(invoice.paidAt || invoice.createdAt)}
              </div>
            </div>
            <Badge tone={invoice.status === 'paid' ? 'green' : 'yellow'}>{invoice.status}</Badge>
          </div>
        );
      })}
    </Card>
  );
}

export function UsageSummarySection({ subscription }) {
  if (!subscription) {
    return null;
  }
  const items = accountUsageSummary(subscription);
  return (
    <Card>
      <div className="mb-3 font-display text-sm font-semibold text-coach-t1">Usage summary</div>
      {items.map(function (item) {
        return (
          <div
            key={item.key}
            className="mb-2 flex items-start justify-between gap-3 last:mb-0"
          >
            <span className="font-body text-xs text-coach-t3">{item.label}</span>
            <span className="text-right font-body text-xs text-coach-t2">{item.value}</span>
          </div>
        );
      })}
    </Card>
  );
}

/**
 * Account settings: current plan, usage summary, billing info, and Flow 17
 * tier changes (immediate prorated upgrade / end-of-cycle downgrade).
 * @param {object} props
 * @param {object} props.user
 * @param {object} [props.subscription] - domain subscription (real wiring)
 * @param {Function} [props.onChangeTier] - (tierId) => Promise; Flow 17 change
 * @param {boolean} [props.busy] - tier change in flight
 * @param {string} [props.error] - tier change error message
 * @param {Function} [props.setUser] - legacy mock fallback when no onChangeTier
 * @param {Function} props.onBack
 * @param {string} [props.subscriptionStatus] - raw subscription status for locked banner
 * @param {Array} [props.billingHistory]
 * @param {boolean} [props.showBillingHistory]
 */
export function SubscriptionScreen({
  user,
  subscription,
  onChangeTier,
  busy,
  error,
  setUser,
  onBack,
  subscriptionStatus,
  billingHistory = [],
  showBillingHistory,
}) {
  const [confirmDowngradeTier, setConfirmDowngradeTier] = useState(null);

  const overview = subscription ? accountPlanOverview(subscription) : null;
  const pending = subscription ? pendingTierChange(subscription) : null;
  const currentTier = subscription ? subscription.tier : user.tier;

  const status =
    subscriptionStatus ||
    (subscription ? subscription.status : user.tier === 'trial' ? 'trialing' : 'active');
  const locked = isSubscriptionPaymentLocked(status);
  const lockMessage = lockedStateMessage(status);
  const canShowBilling =
    typeof showBillingHistory === 'boolean'
      ? showBillingHistory
      : canViewBillingHistory({
          tier: currentTier === 'trial' ? 'trial' : currentTier,
          status,
        });

  const trialDays = overview ? overview.trialDaysRemaining : user.trialDays || 0;
  const showTrialInfo = overview ? overview.isTrial : user.tier === 'trial';

  const tiers = STRIPE_PRODUCT_CATALOG.map(function (entry) {
    return {
      id: entry.tier,
      l: entry.label,
      p: entry.displayPrice,
      c: ACCENT_BY_TIER[entry.tier],
      f: entry.features,
    };
  });

  function changeKindFor(tierId) {
    if (subscription) {
      return classifyTierChange(currentTier, tierId);
    }
    return tierIndex(tierId) < tierIndex(user.tier) && user.tier !== 'trial'
      ? 'downgrade'
      : 'upgrade';
  }

  function handleTierAction(tierId) {
    const kind = changeKindFor(tierId);
    if (kind === 'downgrade' && confirmDowngradeTier !== tierId) {
      setConfirmDowngradeTier(tierId);
      return;
    }
    setConfirmDowngradeTier(null);
    if (onChangeTier) {
      onChangeTier(tierId);
      return;
    }
    if (setUser) {
      setUser(Object.assign({}, user, { tier: tierId, trialDays: 0 }));
    }
  }

  return (
    <ScreenContainer>
      <PageHeader title="SUBSCRIPTION" onBack={onBack} />
      {locked && lockMessage ? (
        <Card className="border border-coach-red/40 bg-coach-red/10">
          <div className="font-display text-sm font-semibold text-coach-red">Payment issue</div>
          <div className="mt-1 font-body text-xs text-coach-t2">{lockMessage}</div>
        </Card>
      ) : null}
      {error ? (
        <Card className="border border-coach-red/40 bg-coach-red/10">
          <div className="font-body text-xs text-coach-red">{error}</div>
        </Card>
      ) : null}
      <Card className="p-5 text-center">
        <div className="font-body text-xs uppercase text-coach-t3">Current Plan</div>
        <div className="mt-1 font-display text-[28px] font-bold capitalize text-coach-orange">
          {overview ? overview.tierLabel : user.tier}
        </div>
        {overview && overview.displayPrice ? (
          <div className="mt-1 font-body text-sm text-coach-t2">{overview.displayPrice}</div>
        ) : null}
        {overview && overview.renewsAt && !showTrialInfo ? (
          <div className="mt-1 font-body text-[11px] text-coach-t3">
            {'Renews on ' + formatDate(overview.renewsAt)}
          </div>
        ) : null}
        {showTrialInfo && (
          <div className="mt-2">
            <Badge tone="yellow">Trial active</Badge>
            <div className="mt-2 font-body text-sm font-semibold text-coach-yellow">
              {trialDays + ' days remaining'}
            </div>
            <div className="mt-1 font-body text-[11px] text-coach-t3">
              Full Pro access until your trial ends
            </div>
          </div>
        )}
        {locked ? (
          <div className="mt-2">
            <Badge tone="red">Locked</Badge>
          </div>
        ) : null}
      </Card>
      {pending ? (
        <Card className="border border-coach-yellow/40 bg-coach-yellow/10">
          <div className="font-display text-sm font-semibold text-coach-yellow">
            Downgrade scheduled
          </div>
          <div className="mt-1 font-body text-xs text-coach-t2">
            {'Switching to ' +
              pending.tierLabel +
              ' on ' +
              formatDate(pending.effectiveAt) +
              '. You keep full access until then. Objectives and AI history are preserved but hidden until you upgrade again.'}
          </div>
        </Card>
      ) : null}
      <UsageSummarySection subscription={subscription} />
      {canShowBilling ? <BillingHistorySection invoices={billingHistory} /> : null}
      {tiers.map(function (t) {
        const isCurrent = t.id === currentTier;
        const isPendingTarget = pending && pending.tier === t.id;
        const kind = isCurrent ? 'same' : changeKindFor(t.id);
        const confirming = confirmDowngradeTier === t.id;
        return (
          <Card key={t.id} className={isCurrent ? `border-2 ${bdcx(t.c)}` : ''}>
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <div className="font-display text-xl font-bold text-coach-t1">{t.l}</div>
                <div className={`font-display text-base ${tcx(t.c)}`}>{t.p}</div>
              </div>
              {isCurrent && <Badge color={t.c}>Current</Badge>}
              {isPendingTarget && <Badge tone="yellow">Scheduled</Badge>}
            </div>
            {t.f.map(function (feat, i) {
              return (
                <div key={i} className="mb-1 flex items-center gap-2">
                  <div className="text-coach-green">
                    <IconCheck />
                  </div>
                  <span className="font-body text-xs text-coach-t2">{feat}</span>
                </div>
              );
            })}
            {!isCurrent && !isPendingTarget && (onChangeTier || setUser) ? (
              <div className="mt-3">
                {confirming ? (
                  <div className="mb-2 font-body text-[11px] text-coach-t3">
                    {downgradeRetentionNotice(t.id)}
                  </div>
                ) : null}
                <Btn
                  primary
                  full
                  disabled={busy}
                  onClick={function () {
                    handleTierAction(t.id);
                  }}
                >
                  {kind === 'downgrade'
                    ? confirming
                      ? 'Confirm downgrade'
                      : 'Downgrade'
                    : 'Upgrade'}
                </Btn>
                {kind === 'upgrade' ? (
                  <div className="mt-1 text-center font-body text-[10px] text-coach-t3">
                    Applies immediately with prorated billing
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        );
      })}
    </ScreenContainer>
  );
}
