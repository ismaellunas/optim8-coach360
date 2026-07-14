import {
  canActivateTrial,
  paywallCopyForFeature,
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

/**
 * Flow 10 — content paywall encounter (modal, non-blocking).
 * Names required tier + unlocked features; trial CTA only if unused (OQ-10.1).
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
  const copy = user ? paywallCopyForFeature(feature, user.role) : null;
  const tierLabel = copy?.tierLabel || 'a higher tier';
  const unlocked = copy?.unlockedFeatures || [];
  const showTrial = shouldShowPaywallTrialCta(subscription);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6">
      <div className="w-full max-w-[340px] rounded-[20px] border border-coach-border bg-coach-surface p-7 text-center">
        <div className="mb-4 text-coach-orange">
          <IconLock />
        </div>
        <div className="mb-2 font-display text-[22px] font-bold text-coach-t1">Feature Locked</div>
        <div className="mb-3 font-body text-sm leading-relaxed text-coach-t2">
          {'This requires '}
          <span className="font-semibold text-coach-t1">{tierLabel}</span>
          {' or above.'}
        </div>
        {unlocked.length > 0 ? (
          <div className="mb-5 rounded-[12px] border border-coach-border bg-coach-card p-3 text-left">
            <div className="mb-2 font-display text-[11px] font-semibold uppercase tracking-wider text-coach-t3">
              {tierLabel} unlocks
            </div>
            {unlocked.map(function (item) {
              return (
                <div key={item} className="mb-1 font-body text-xs text-coach-t2">
                  {item}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-5" />
        )}

        <Btn primary full disabled={submitting} onClick={onUpgrade}>
          Upgrade to {tierLabel}
        </Btn>

        {showTrial && onStartTrial ? (
          <>
            <div className="h-2.5" />
            <Btn full disabled={submitting} onClick={onStartTrial}>
              Start free trial
            </Btn>
          </>
        ) : null}

        <div className="h-2.5" />
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
