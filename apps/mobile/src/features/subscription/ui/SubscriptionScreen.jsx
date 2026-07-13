import {
  canViewBillingHistory,
  isSubscriptionPaymentLocked,
  lockedStateMessage,
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

function formatInvoiceDate(iso) {
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
                {formatInvoiceDate(invoice.paidAt || invoice.createdAt)}
              </div>
            </div>
            <Badge tone={invoice.status === 'paid' ? 'green' : 'yellow'}>{invoice.status}</Badge>
          </div>
        );
      })}
    </Card>
  );
}

/**
 * Subscription management + billing history (Basic+).
 * @param {object} props
 * @param {object} props.user
 * @param {Function} [props.setUser]
 * @param {Function} props.onBack
 * @param {string} [props.subscriptionStatus] - raw subscription status for locked banner
 * @param {Array} [props.billingHistory]
 * @param {boolean} [props.showBillingHistory]
 */
export function SubscriptionScreen({
  user,
  setUser,
  onBack,
  subscriptionStatus,
  billingHistory = [],
  showBillingHistory,
}) {
  const status = subscriptionStatus || (user.tier === 'trial' ? 'trialing' : 'active');
  const locked = isSubscriptionPaymentLocked(status);
  const lockMessage = lockedStateMessage(status);
  const canShowBilling =
    typeof showBillingHistory === 'boolean'
      ? showBillingHistory
      : canViewBillingHistory({
          tier: user.tier === 'trial' ? 'trial' : user.tier,
          status,
        });

  const tiers = STRIPE_PRODUCT_CATALOG.map(function (entry) {
    return {
      id: entry.tier,
      l: entry.label,
      p: entry.displayPrice,
      c: ACCENT_BY_TIER[entry.tier],
      f: entry.features,
    };
  });

  return (
    <ScreenContainer>
      <PageHeader title="SUBSCRIPTION" onBack={onBack} />
      {locked && lockMessage ? (
        <Card className="border border-coach-red/40 bg-coach-red/10">
          <div className="font-display text-sm font-semibold text-coach-red">Payment issue</div>
          <div className="mt-1 font-body text-xs text-coach-t2">{lockMessage}</div>
        </Card>
      ) : null}
      <Card className="p-5 text-center">
        <div className="font-body text-xs uppercase text-coach-t3">Current Plan</div>
        <div className="mt-1 font-display text-[28px] font-bold capitalize text-coach-orange">
          {user.tier}
        </div>
        {user.tier === 'trial' && (
          <div className="mt-1 font-body text-xs text-coach-yellow">
            {user.trialDays + ' days remaining'}
          </div>
        )}
        {locked ? (
          <div className="mt-2">
            <Badge tone="red">Locked</Badge>
          </div>
        ) : null}
      </Card>
      {canShowBilling ? <BillingHistorySection invoices={billingHistory} /> : null}
      {tiers.map(function (t) {
        const isCurrent = t.id === user.tier;
        return (
          <Card key={t.id} className={isCurrent ? `border-2 ${bdcx(t.c)}` : ''}>
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <div className="font-display text-xl font-bold text-coach-t1">{t.l}</div>
                <div className={`font-display text-base ${tcx(t.c)}`}>{t.p}</div>
              </div>
              {isCurrent && <Badge color={t.c}>Current</Badge>}
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
            {!isCurrent && setUser ? (
              <div className="mt-3">
                <Btn
                  primary
                  full
                  onClick={function () {
                    setUser(Object.assign({}, user, { tier: t.id, trialDays: 0 }));
                  }}
                >
                  {tierIndex(t.id) < tierIndex(user.tier) && user.tier !== 'trial'
                    ? 'Downgrade'
                    : 'Upgrade'}
                </Btn>
              </div>
            ) : null}
          </Card>
        );
      })}
    </ScreenContainer>
  );
}
