import {
  canActivateTrial,
  paywallTierOptionsForFeature,
  shouldShowPaywallTrialCta,
} from '@coach360/domain';
import { Button as Btn } from '@/shared/ui/primitives.jsx';

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

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

/**
 * Flow 10 — content paywall encounter (modal, non-blocking).
 * Shows all catalog tiers; plans below the required minimum are disabled.
 * Trial CTA only if unused (OQ-10.1).
 */
export function PaywallModal({
  feature,
  user,
  subscription = null,
  submitting = false,
  error = null,
  onClose,
  onUpgrade,
  onStartTrial,
  onBrowseFree,
}) {
  const plan = user ? paywallTierOptionsForFeature(feature, user.role) : null;
  const requirementPhrase = plan?.requirementPhrase || 'a higher tier';
  const options = plan?.options || [];
  const showTrial = shouldShowPaywallTrialCta(subscription);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4">
      <div className="max-h-[90svh] w-full max-w-[340px] overflow-y-auto rounded-[20px] border border-coach-border bg-coach-surface p-5 text-center">
        <div className="mb-3 text-coach-orange">
          <IconLock />
        </div>
        <div className="mb-2 font-display text-[22px] font-bold text-coach-t1">Feature Locked</div>
        <div className="mb-4 font-body text-sm leading-relaxed text-coach-t2">
          {'This requires '}
          <span className="font-semibold text-coach-t1">{requirementPhrase}</span>
          {'. Choose a plan:'}
        </div>

        <div className="mb-3 text-left">
          {options.map(function (option) {
            const accent = ACCENT[option.accent];
            return (
              <div
                key={option.tier}
                className={[
                  'mb-2.5 rounded-[14px] border bg-coach-card p-3.5',
                  accent.border,
                  option.selectable ? '' : 'opacity-50',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="font-display text-base font-semibold text-coach-t1">
                      {option.label}
                    </div>
                    <div className={`font-display text-sm ${accent.text}`}>{option.displayPrice}</div>
                  </div>
                  {!option.selectable ? (
                    <span className="font-body text-[10px] font-semibold uppercase text-coach-t3">
                      Below required
                    </span>
                  ) : null}
                </div>
                {option.features.map(function (item) {
                  return (
                    <div key={item} className="mb-1 font-body text-xs text-coach-t2">
                      {item}
                    </div>
                  );
                })}
                <div className="mt-3">
                  <Btn
                    primary={option.selectable}
                    full
                    disabled={submitting || !option.selectable}
                    onClick={function () {
                      if (!option.selectable) {
                        return;
                      }
                      onUpgrade(option.tier);
                    }}
                  >
                    {option.selectable ? `Upgrade to ${option.label}` : `${option.label} unavailable`}
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>

        {showTrial && onStartTrial ? (
          <>
            <Btn full disabled={submitting} onClick={onStartTrial}>
              Start free trial
            </Btn>
            <div className="h-2.5" />
          </>
        ) : null}

        <Btn
          full
          disabled={submitting}
          onClick={function () {
            if (onBrowseFree) {
              onBrowseFree();
              return;
            }
            onClose();
          }}
        >
          Browse free content
        </Btn>
        <div className="h-2.5" />
        <button
          type="button"
          disabled={submitting}
          onClick={onClose}
          className="w-full cursor-pointer border-none bg-transparent py-2 font-body text-xs text-coach-t3"
        >
          Maybe Later
        </button>

        {error ? <p className="mt-3 font-body text-xs text-coach-red">{error}</p> : null}

        {/* Trace markers for tests: canActivateTrial / shouldShowPaywallTrialCta */}
        <span className="hidden" data-trial-available={showTrial ? 'true' : 'false'} />
        <span className="hidden" data-can-activate={canActivateTrial(subscription) ? 'true' : 'false'} />
      </div>
    </div>
  );
}
