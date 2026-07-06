import { useState } from 'react';
import { COACH_ONBOARDING_STEPS } from '../lib/coach-onboarding-steps.js';
import { MOCK_MARKETPLACE_CATALOG } from '../lib/mock-marketplace-catalog.js';
import { CoachOnboardingProgress } from './CoachOnboardingProgress.jsx';

function WizardBtn({ children, primary, disabled, onClick }) {
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

export function CoachOnboardingWizard({
  displayName,
  submitting,
  error,
  onComplete,
  onOpenSchedule,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = COACH_ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === COACH_ONBOARDING_STEPS.length - 1;

  function goNext() {
    if (isLastStep) {
      onComplete();
      return;
    }
    setStepIndex(stepIndex + 1);
  }

  return (
    <div className="px-6 py-10 text-center">
      <CoachOnboardingProgress
        stepIndex={stepIndex}
        stepCount={COACH_ONBOARDING_STEPS.length}
      />

      <div className="mb-3 font-display text-2xl font-bold text-coach-t1">{step.title}</div>
      <p className="mb-8 font-body text-sm leading-relaxed text-coach-t2">
        {step.id === 'welcome'
          ? `Welcome to Coach360${displayName ? `, ${displayName}` : ''}! This quick guide shows you how to browse training content, plan sessions, and share with players.`
          : step.description}
      </p>

      {step.id === 'profile' && (
        <div className="mb-6 rounded-[14px] border border-coach-border bg-coach-card p-4 text-left">
          <p className="font-body text-xs text-coach-t3">Team setup</p>
          <p className="mt-1 font-body text-sm text-coach-t2">
            Skip team creation and player invites for now. You can create a team or invite players
            later from Roster.
          </p>
        </div>
      )}

      {step.id === 'marketplace' && (
        <div className="mb-6 text-left">
          {MOCK_MARKETPLACE_CATALOG.map(function (item) {
            return (
              <div
                key={item.id}
                className="mb-2.5 rounded-[14px] border border-coach-border bg-coach-card p-4"
              >
                <div className={`font-display text-base font-semibold ${item.accentClass}`}>
                  {item.title}
                </div>
                <div className="mt-1 font-body text-xs text-coach-t3">
                  {item.lessons} lessons · {item.tag}
                </div>
              </div>
            );
          })}
          <p className="mt-2 font-body text-xs text-coach-t3">Browse only — no purchase required.</p>
        </div>
      )}

      {step.id === 'session' && (
        <div className="mb-6">
          <WizardBtn disabled={submitting} onClick={onOpenSchedule}>
            Open schedule
          </WizardBtn>
        </div>
      )}

      {step.id === 'share' && (
        <div className="mb-6 rounded-[14px] border border-dashed border-coach-border bg-coach-card/50 p-4">
          <p className="font-body text-sm text-coach-t2">
            Share sessions with players or teams when you are ready. This step is optional.
          </p>
        </div>
      )}

      <div className="flex gap-2.5">
        <WizardBtn disabled={submitting} onClick={onComplete}>
          Skip for now
        </WizardBtn>
        {!isLastStep ? (
          <WizardBtn primary disabled={submitting} onClick={goNext}>
            Next
          </WizardBtn>
        ) : (
          <WizardBtn primary disabled={submitting} onClick={onComplete}>
            {"Let's Go!"}
          </WizardBtn>
        )}
      </div>

      {error && <p className="mt-4 font-body text-sm text-coach-red">{error}</p>}
    </div>
  );
}
