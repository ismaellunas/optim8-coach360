import { STRIPE_PRODUCT_CATALOG } from '@coach360/domain';

const TIERS = STRIPE_PRODUCT_CATALOG.map(function (entry) {
  return {
    id: entry.tier,
    label: entry.label,
    price: entry.displayPrice,
    accent: entry.accent,
    features: [...entry.features],
  };
});

const ACCENT = {
  green: {
    border: 'border-coach-green',
    text: 'text-coach-green',
  },
  blue: {
    border: 'border-coach-blue',
    text: 'text-coach-blue',
  },
  orange: {
    border: 'border-coach-orange',
    text: 'text-coach-orange',
  },
};

function ChoiceBtn({ children, primary, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={[
        'w-full rounded-xl border-none px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider',
        disabled ? 'cursor-default bg-coach-border text-coach-t3 opacity-50' : 'cursor-pointer',
        !disabled && primary ? 'bg-coach-orange text-white' : '',
        !disabled && !primary ? 'bg-coach-orange-glow text-coach-orange' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}

/**
 * Flow 9 — shown after trial expiry without payment.
 * User is on Basic; Advanced/Pro features are locked. Tier comparison + upgrade CTAs.
 */
export function TrialExpiredUpgradePrompt({
  submitting = false,
  error = null,
  onChooseTier,
  onContinueBasic,
}) {
  return (
    <div className="px-6 py-10">
      <div className="mb-2 font-display text-2xl font-bold text-coach-t1">TRIAL ENDED</div>
      <p className="mb-2 font-body text-sm leading-relaxed text-coach-t2">
        Your free trial has ended. You are now on Basic — Advanced and Pro features are locked until
        you upgrade.
      </p>
      <p className="mb-6 font-body text-xs leading-relaxed text-coach-t3">
        Purchased marketplace packages remain available. Compare tiers below and upgrade anytime.
      </p>

      <div className="mb-2 font-display text-sm font-semibold uppercase text-coach-t3">
        Compare plans
      </div>
      {TIERS.map(function (tier) {
        const accent = ACCENT[tier.accent];
        const isBasic = tier.id === 'basic';
        return (
          <div
            key={tier.id}
            className={`mb-2.5 rounded-[14px] border bg-coach-card p-4 ${accent.border}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="font-display text-lg font-semibold text-coach-t1">{tier.label}</div>
                <div className={`font-display text-base ${accent.text}`}>{tier.price}</div>
              </div>
              {isBasic ? (
                <span className="font-body text-[10px] font-semibold uppercase text-coach-green">
                  Current
                </span>
              ) : null}
            </div>
            {tier.features.map(function (feature) {
              return (
                <div key={feature} className="mb-1 font-body text-xs text-coach-t2">
                  {feature}
                </div>
              );
            })}
            <div className="mt-3">
              {isBasic ? (
                <ChoiceBtn disabled={submitting} onClick={onContinueBasic}>
                  Continue on Basic
                </ChoiceBtn>
              ) : (
                <ChoiceBtn
                  primary
                  disabled={submitting}
                  onClick={function () {
                    onChooseTier(tier.id);
                  }}
                >
                  Upgrade to {tier.label}
                </ChoiceBtn>
              )}
            </div>
          </div>
        );
      })}

      {error && <p className="mt-4 font-body text-sm text-coach-red">{error}</p>}
    </div>
  );
}
