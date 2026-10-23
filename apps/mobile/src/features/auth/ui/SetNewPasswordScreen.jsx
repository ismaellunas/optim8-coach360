import { useState } from 'react';
import { useAuth } from '../model/use-auth.js';

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

/** BUG-QA2-06 — shown after a tapped recovery deep link establishes a session. */
export function SetNewPasswordScreen() {
  const { completePasswordReset, signOut } = useAuth();
  const passwordId = 'set-new-password';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const newPassword = form.elements.namedItem(passwordId).value;

    setSubmitting(true);
    setError(null);
    try {
      await completePasswordReset({ newPassword });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'password_reset_failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-10">
      <div className="mb-1 font-display text-2xl font-bold text-coach-t1">SET NEW PASSWORD</div>
      <div className="mb-6 font-body text-sm text-coach-t2">
        Choose a new password for your account.
      </div>
      <input
        id={passwordId}
        name={passwordId}
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        placeholder="New password (min 6 characters)"
        className="mb-5 box-border w-full rounded-xl border border-coach-border bg-coach-card px-4 py-3.5 font-body text-base text-coach-t1 outline-none"
      />
      {error ? <p className="mb-4 font-body text-sm text-coach-red">{error}</p> : null}
      <AuthBtn primary type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save password'}
      </AuthBtn>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={function () {
            signOut();
          }}
          className="cursor-pointer border-none bg-transparent font-body text-sm text-coach-orange"
        >
          Sign out and start over
        </button>
      </div>
    </form>
  );
}
