function ProfileBtn({ children, primary, disabled, onClick }) {
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

export function TeamSetupPathScreen({ submitting, error, onContinue }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mb-3 font-display text-2xl font-bold text-coach-t1">SET UP YOUR TEAM</div>
      <div className="mb-8 font-body text-sm leading-relaxed text-coach-t2">
        Team managers must configure a team as part of onboarding. You will create your team
        profile with name, age group, and roster in the next step (EPIC-3).
      </div>
      <div className="mb-6 rounded-[14px] border border-coach-border bg-coach-card p-5 text-left">
        <div className="mb-2 font-display text-base font-semibold text-coach-t1">What&apos;s next</div>
        <ul className="space-y-2 font-body text-sm text-coach-t2">
          <li>• Create team name and age range</li>
          <li>• Invite players via link or code</li>
          <li>• Browse packages for your roster</li>
        </ul>
      </div>
      {error ? <p className="mb-4 font-body text-sm text-coach-red">{error}</p> : null}
      <ProfileBtn primary disabled={submitting} onClick={onContinue}>
        {submitting ? 'Continuing…' : 'Continue to team setup'}
      </ProfileBtn>
    </div>
  );
}
