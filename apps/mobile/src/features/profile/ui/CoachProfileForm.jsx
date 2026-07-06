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

const CONTEXT_OPTIONS = [
  {
    id: 'independent',
    label: 'Independent coach',
    desc: 'Work with individual players without a team',
    emoji: '\uD83C\uDFC0',
  },
  {
    id: 'team',
    label: 'Team coach',
    desc: 'Create or join a team later',
    emoji: '\uD83D\uDC65',
  },
];

export function CoachProfileForm({ submitting, error, onSubmit }) {
  const bioId = 'coach-profile-bio';

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const coachContext = form.elements.namedItem('coach-context')?.value;
    const bio = form.elements.namedItem(bioId)?.value?.trim();
    if (!coachContext) return;
    await onSubmit({
      coachContext,
      bio: bio || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-10">
      <div className="mb-1 font-display text-2xl font-bold text-coach-t1">COACH PROFILE</div>
      <div className="mb-6 font-body text-sm text-coach-t2">
        How will you use Coach360?
      </div>
      {CONTEXT_OPTIONS.map(function (option) {
        return (
          <label
            key={option.id}
            className="mb-2.5 flex w-full cursor-pointer items-center gap-3.5 rounded-[14px] border border-coach-border bg-coach-card p-4 text-left has-[:checked]:border-2 has-[:checked]:border-coach-orange"
          >
            <input
              type="radio"
              name="coach-context"
              value={option.id}
              required
              className="sr-only"
            />
            <div className="text-[28px]">{option.emoji}</div>
            <div className="flex-1">
              <div className="font-display text-lg font-semibold text-coach-t1">{option.label}</div>
              <div className="font-body text-xs text-coach-t3">{option.desc}</div>
            </div>
          </label>
        );
      })}
      <div className="mb-3.5 mt-4">
        <div className="mb-1.5 font-body text-xs uppercase text-coach-t3">Bio (optional)</div>
        <textarea
          id={bioId}
          name={bioId}
          rows={3}
          placeholder="Coaching background, certifications…"
          className="box-border w-full resize-none rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        />
      </div>
      {error ? <p className="mb-4 font-body text-sm text-coach-red">{error}</p> : null}
      <ProfileBtn primary type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Continue'}
      </ProfileBtn>
    </form>
  );
}
