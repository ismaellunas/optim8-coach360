import { useState } from 'react';
import { PLAYER_ONBOARDING_STEPS } from '../lib/player-onboarding-steps.js';
import { MOCK_MARKETPLACE_CATALOG } from '../lib/mock-marketplace-catalog.js';
import { MOCK_ASSIGNED_CONTENT } from '../lib/mock-assigned-content.js';
import { CoachOnboardingProgress } from './CoachOnboardingProgress.jsx';

function WizardBtn({ children, primary, disabled, onClick, className = '' }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={[
        'w-full rounded-xl border-none px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider',
        className,
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

export function PlayerOnboardingWizard({
  displayName,
  drillsCompletedCount,
  submitting,
  error,
  onComplete,
  onLogFirstDrill,
  onAcceptInvite,
  inviteSubmitting = false,
  inviteError = null,
  pendingInviteCode = '',
  inviteAccepted = false,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteNotice, setInviteNotice] = useState(null);
  const step = PLAYER_ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === PLAYER_ONBOARDING_STEPS.length - 1;
  const resolvedInviteCode = pendingInviteCode || inviteCode;

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
        stepCount={PLAYER_ONBOARDING_STEPS.length}
      />

      <div className="mb-3 font-display text-2xl font-bold text-coach-t1">{step.title}</div>
      <p className="mb-8 font-body text-sm leading-relaxed text-coach-t2">
        {step.id === 'welcome'
          ? `Welcome to Coach360${displayName ? `, ${displayName}` : ''}! This quick guide shows you how to browse training content, complete your first drill, and track progress.`
          : step.description}
      </p>

      {step.id === 'profile' && (
        <div className="mb-6 rounded-[14px] border border-coach-border bg-coach-card p-4 text-left">
          <p className="font-body text-xs text-coach-t3">Independent training</p>
          <p className="mt-1 font-body text-sm text-coach-t2">
            Skip team join for now. You can train independently and join a team later via invite
            from your coach.
          </p>
        </div>
      )}

      {step.id === 'browse' && (
        <div className="mb-6 text-left">
          <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-coach-t3">
            Marketplace
          </p>
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
          <p className="mb-4 mt-2 font-body text-xs text-coach-t3">
            Browse only — no purchase required.
          </p>
          <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-coach-t3">
            Assigned to you
          </p>
          {MOCK_ASSIGNED_CONTENT.map(function (item) {
            return (
              <div
                key={item.id}
                className="mb-2.5 rounded-[14px] border border-coach-border bg-coach-card p-4"
              >
                <div className={`font-display text-base font-semibold ${item.accentClass}`}>
                  {item.title}
                </div>
                <div className="mt-1 font-body text-xs text-coach-t3">
                  From {item.coachName} · {item.tag}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {step.id === 'drill' && (
        <div className="mb-6">
          <div className="mb-4 rounded-[14px] border border-coach-border bg-coach-card p-4 text-left">
            <div className="font-display text-base font-semibold text-coach-orange">
              Form Shooting — 50 makes
            </div>
            <p className="mt-1 font-body text-xs text-coach-t3">
              Focus on balance and follow-through. Log when complete.
            </p>
          </div>
          <WizardBtn disabled={submitting} onClick={onLogFirstDrill}>
            Log first drill
          </WizardBtn>
        </div>
      )}

      {step.id === 'progress' && (
        <div className="mb-6 rounded-[14px] border border-coach-border bg-coach-card p-4 text-left">
          <p className="font-body text-xs uppercase text-coach-t3">Drills completed</p>
          <div className="mt-1 font-display text-[28px] font-bold text-coach-t1">
            {drillsCompletedCount}
          </div>
          <p className="mt-2 font-body text-xs text-coach-t3">
            Stats appear in your profile and Progress tab.
          </p>
        </div>
      )}

      {step.id === 'team' && (
        <div className="mb-6 rounded-[14px] border border-dashed border-coach-border bg-coach-card/50 p-4 text-left">
          <p className="mb-3 font-body text-sm text-coach-t2">
            {inviteAccepted
              ? 'You already joined your team from the invite link. You can finish onboarding and start training.'
              : pendingInviteCode
                ? 'We found your invite code from the link you used. Join the team when you are ready.'
                : 'Have an invite code from your coach? Enter it when you are ready. This step is optional.'}
          </p>
          {pendingInviteCode ? (
            <div className="rounded-xl border border-coach-border bg-coach-surface px-4 py-3">
              <p className="font-body text-[10px] uppercase tracking-wider text-coach-t3">
                Invite code
              </p>
              <p className="mt-1 font-display text-base font-semibold tracking-[0.18em] text-coach-t1">
                {resolvedInviteCode}
              </p>
            </div>
          ) : (
            <input
              type="text"
              placeholder="Team invite code"
              value={inviteCode}
              onChange={function (event) {
                setInviteCode(event.target.value.toUpperCase());
                setInviteNotice(null);
              }}
              className="w-full rounded-xl border border-coach-border bg-coach-surface px-4 py-3 font-body text-sm text-coach-t1 outline-none placeholder:text-coach-t3"
            />
          )}
          {inviteError ? (
            <p className="mt-2 font-body text-sm text-coach-red">{inviteError}</p>
          ) : null}
          {inviteNotice ? (
            <p className="mt-2 font-body text-sm text-coach-green">{inviteNotice}</p>
          ) : null}
          {onAcceptInvite && !inviteAccepted ? (
            <WizardBtn
              className="mt-4"
              disabled={inviteSubmitting || !inviteCode.trim()}
              onClick={async function () {
                try {
                  await onAcceptInvite(resolvedInviteCode);
                  setInviteNotice('You joined the team roster.');
                } catch {
                  setInviteNotice(null);
                }
              }}
            >
              {inviteSubmitting ? 'Joining…' : 'Join team'}
            </WizardBtn>
          ) : null}
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
