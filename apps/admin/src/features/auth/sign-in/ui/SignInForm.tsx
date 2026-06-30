import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@coach360/ui';
import { useAuth } from '@/features/auth/model/auth-context.js';
import { adminPaths } from '@/app/router/paths.js';

export function SignInForm() {
  const { signIn, isAdmin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAdmin) {
    return <Navigate to={adminPaths.root} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'sign_in_failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-24 w-full max-w-md space-y-4 rounded-[14px] border border-coach-border bg-coach-card p-6">
      <h1 className="font-display text-xl font-bold text-coach-t1">Admin sign in</h1>
      <label className="block space-y-1 text-sm text-coach-t2">
        Email
        <input
          className="h-11 w-full rounded-xl border border-coach-border bg-coach-surface px-3 text-coach-t1"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="block space-y-1 text-sm text-coach-t2">
        Password
        <input
          className="h-11 w-full rounded-xl border border-coach-border bg-coach-surface px-3 text-coach-t1"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error ? <p className="text-sm text-coach-red">{error}</p> : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
