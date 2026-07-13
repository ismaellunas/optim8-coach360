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

export function SubscriptionChoiceScreen({
  submitting,
  error,
  onActivateTrial,
  onDeferToBasic,
  onChoosePaidTier,
}) {
  return (
    <div className="px-6 py-10">
      <div className="mb-2 font-display text-2xl font-bold text-coach-t1">CHOOSE YOUR PLAN</div>
      <p className="mb-6 font-body text-sm leading-relaxed text-coach-t2">
        Start with a free trial for full Pro access, pick a paid tier, or continue on Basic for free.
      </p>

      <div className="mb-4 rounded-[14px] border-2 border-coach-yellow bg-coach-yellow/10 p-5">
        <div className="font-display text-lg font-bold text-coach-yellow">14-Day Free Trial</div>
        <p className="mt-2 font-body text-xs leading-relaxed text-coach-t2">
          Full Pro access — AI personalization, objectives, and all MVP features.
        </p>
        <div className="mt-4">
          <ChoiceBtn primary disabled={submitting} onClick={onActivateTrial}>
            Start free trial
          </ChoiceBtn>
        </div>
      </div>

      <div className="mb-2 font-display text-sm font-semibold uppercase text-coach-t3">Or choose a subscription</div>
      {TIERS.map(function (tier) {
        const accent = ACCENT[tier.accent];
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
            </div>
            {tier.features.map(function (feature) {
              return (
                <div key={feature} className="mb-1 font-body text-xs text-coach-t2">
                  {feature}
                </div>
              );
            })}
            <div className="mt-3">
              <ChoiceBtn
                disabled={submitting}
                onClick={function () {
                  onChoosePaidTier(tier.id);
                }}
              >
                Choose {tier.label}
              </ChoiceBtn>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        disabled={submitting}
        onClick={onDeferToBasic}
        className="mt-4 w-full cursor-pointer border-none bg-transparent p-0 font-body text-sm text-coach-t3 underline"
      >
        Continue with Basic for free
      </button>

      {error && <p className="mt-4 font-body text-sm text-coach-red">{error}</p>}
    </div>
  );
}
