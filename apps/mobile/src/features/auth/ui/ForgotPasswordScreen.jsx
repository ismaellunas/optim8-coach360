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

/** BUG-QA2-06 — in-app OTP reset (no deep-link infra in this app). */
export function ForgotPasswordScreen({ step, email, onRequestCode, onConfirmReset, onBack, submitting, error }) {
  const emailId = 'forgot-password-email';
  const tokenId = 'forgot-password-token';
  const newPasswordId = 'forgot-password-new-password';

  async function handleRequestSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const value = form.elements.namedItem(emailId).value.trim();
    await onRequestCode(value);
  }

  async function handleConfirmSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const token = form.elements.namedItem(tokenId).value.trim();
    const newPassword = form.elements.namedItem(newPasswordId).value;
    await onConfirmReset({ token, newPassword });
  }

  if (step === 'confirm') {
    return (
      <form key="confirm" onSubmit={handleConfirmSubmit} className="px-6 py-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 cursor-pointer border-none bg-transparent p-0 font-body text-[13px] text-coach-orange"
        >
          Back
        </button>
        <div className="mb-1 font-display text-2xl font-bold text-coach-t1">ENTER CODE</div>
        <div className="mb-6 font-body text-sm text-coach-t2">
          Enter the 6-digit code sent to {email}
        </div>
        <input
          id={tokenId}
          name={tokenId}
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          autoComplete="one-time-code"
          placeholder="6-digit code"
          className="mb-3 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        />
        <input
          id={newPasswordId}
          name={newPasswordId}
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="New password (min 6 characters)"
          className="mb-5 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
        />
        {error ? <p className="mb-4 font-body text-sm text-coach-red">{error}</p> : null}
        <AuthBtn primary type="submit" disabled={submitting}>
          {submitting ? 'Resetting…' : 'Reset password'}
        </AuthBtn>
      </form>
    );
  }

  return (
    <form key="request" onSubmit={handleRequestSubmit} className="px-6 py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 cursor-pointer border-none bg-transparent p-0 font-body text-[13px] text-coach-orange"
      >
        Back
      </button>
      <div className="mb-1 font-display text-2xl font-bold text-coach-t1">FORGOT PASSWORD</div>
      <div className="mb-6 font-body text-sm text-coach-t2">
        We'll email you a 6-digit code to reset your password.
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
        {submitting ? 'Sending code…' : 'Send code'}
      </AuthBtn>
    </form>
  );
}
