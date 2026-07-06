function AuthBtn({ children, primary, disabled, onClick, type = 'button' }) {
  return (
    <button
      type={type}
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

function IconBack() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

const ROLE_LABELS = {
  coach: 'Coach',
  player: 'Player',
  team_manager: 'Team Manager',
};

export function SignInScreen({ onSubmit, onSwitchToSignUp, submitting, error }) {
  const emailId = 'sign-in-email';
  const passwordId = 'sign-in-password';

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.namedItem(emailId).value.trim();
    const password = form.elements.namedItem(passwordId).value;
    await onSubmit({ email, password });
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-10">
      <div className="mb-6 font-display text-2xl font-bold text-coach-t1">SIGN IN</div>
      <input
        id={emailId}
        name={emailId}
        type="email"
        required
        autoComplete="email"
        placeholder="Email address"
        className="mb-3 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
      />
      <input
        id={passwordId}
        name={passwordId}
        type="password"
        required
        autoComplete="current-password"
        placeholder="Password"
        className="mb-5 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
      />
      {error ? <p className="mb-4 font-body text-sm text-coach-red">{error}</p> : null}
      <AuthBtn primary type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </AuthBtn>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="cursor-pointer border-none bg-transparent font-body text-sm text-coach-orange"
        >
          Create an account
        </button>
      </div>
    </form>
  );
}

export function SignUpScreen({
  role,
  onSubmit,
  onSwitchToSignIn,
  onBack,
  submitting,
  error,
  verificationSent,
}) {
  const emailId = 'sign-up-email';
  const passwordId = 'sign-up-password';
  const nameId = 'sign-up-name';

  async function handleSubmit(event) {
    event.preventDefault();
    if (!role) return;

    const form = event.currentTarget;
    const email = form.elements.namedItem(emailId).value.trim();
    const password = form.elements.namedItem(passwordId).value;
    const displayName = form.elements.namedItem(nameId).value.trim();
    await onSubmit({
      email,
      password,
      role,
      displayName: displayName || undefined,
    });
  }

  if (verificationSent) {
    return (
      <div className="px-6 py-10 text-center">
        <div className="mb-4 font-display text-2xl font-bold text-coach-t1">CHECK YOUR EMAIL</div>
        <p className="mb-6 font-body text-sm leading-relaxed text-coach-t2">
          We sent a verification link to confirm your account. Sign in after verifying your email.
        </p>
        <AuthBtn primary onClick={onSwitchToSignIn}>
          Back to sign in
        </AuthBtn>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-coach-orange"
      >
        <IconBack />
        <span className="font-body text-[13px]">Back</span>
      </button>
      <div className="mb-1 font-display text-2xl font-bold text-coach-t1">CREATE ACCOUNT</div>
      <div className="mb-6 font-body text-sm text-coach-t2">
        Signing up as {ROLE_LABELS[role] ?? 'member'}
      </div>
      <input
        id={nameId}
        name={nameId}
        type="text"
        autoComplete="name"
        placeholder="Your name"
        className="mb-3 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
      />
      <input
        id={emailId}
        name={emailId}
        type="email"
        required
        autoComplete="email"
        placeholder="Email address"
        className="mb-3 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
      />
      <input
        id={passwordId}
        name={passwordId}
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        placeholder="Password (min 6 characters)"
        className="mb-5 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
      />
      {error ? <p className="mb-4 font-body text-sm text-coach-red">{error}</p> : null}
      <AuthBtn primary type="submit" disabled={submitting || !role}>
        {submitting ? 'Creating account…' : 'Create account'}
      </AuthBtn>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onSwitchToSignIn}
          className="cursor-pointer border-none bg-transparent font-body text-sm text-coach-orange"
        >
          Already have an account? Sign in
        </button>
      </div>
    </form>
  );
}
