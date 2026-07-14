function ProfileBtn({ children, primary, disabled, onClick, type = 'button' }) {
  return (
    <button
      type={type}
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

export function TeamManagerProfileFlow({
  submitting,
  error,
  onEnterTeamSetupPath,
}) {
  const bioId = 'team-manager-profile-bio';

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const bio = form.elements.namedItem(bioId)?.value?.trim() ?? '';
    await onEnterTeamSetupPath({ bio: bio || undefined });
  }

  return (
    <form onSubmit={handleProfileSubmit} className="px-6 py-10">
      <div className="mb-1 font-display text-2xl font-bold text-coach-t1">TEAM MANAGER PROFILE</div>
      <div className="mb-6 font-body text-sm text-coach-t2">
        Set up your manager profile, then create your team. Inviting players happens after your
        team exists.
      </div>
      <div className="mb-3.5">
        <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Bio (optional)</div>
        <textarea
          id={bioId}
          name={bioId}
          rows={3}
          placeholder="Your experience managing teams…"
          className="box-border w-full resize-none rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        />
      </div>
      {error ? <p className="mb-4 font-body text-sm text-coach-red">{error}</p> : null}
      <ProfileBtn primary type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Continue to create team'}
      </ProfileBtn>
    </form>
  );
}
