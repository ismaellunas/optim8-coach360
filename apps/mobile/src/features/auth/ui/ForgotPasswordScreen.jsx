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

/** BUG-QA2-06 — emails a recovery link; completion happens via a deep link. */
export function ForgotPasswordScreen({ sent, onSubmit, onBack, submitting, error }) {
  const emailId = 'forgot-password-email';

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.namedItem(emailId).value.trim();
    await onSubmit(email);
  }

  if (sent) {
    return (
      <div className="px-6 py-10 text-center">
        <div className="mb-4 font-display text-2xl font-bold text-coach-t1">CHECK YOUR EMAIL</div>
        <p className="mb-6 font-body text-sm leading-relaxed text-coach-t2">
          We sent a password reset link to your email. Open it on this device to continue.
        </p>
        <AuthBtn primary onClick={onBack}>
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
        className="mb-4 cursor-pointer border-none bg-transparent p-0 font-body text-[13px] text-coach-orange"
      >
        Back
      </button>
      <div className="mb-1 font-display text-2xl font-bold text-coach-t1">FORGOT PASSWORD</div>
      <div className="mb-6 font-body text-sm text-coach-t2">
        We'll email you a link to reset your password.
      </div>
      <input
        id={emailId}
        name={emailId}
        type="email"
        required
        autoComplete="email"
        placeholder="Email address"
        className="mb-5 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
      />
      {error ? <p className="mb-4 font-body text-sm text-coach-red">{error}</p> : null}
      <AuthBtn primary type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send reset link'}
      </AuthBtn>
    </form>
  );
}
