import { useState } from 'react';
import { useAuth } from '../model/use-auth.js';
import { SignInScreen, SignUpScreen } from './AuthScreens.jsx';
import { ForgotPasswordScreen } from './ForgotPasswordScreen.jsx';
import { RoleSelectScreen } from './RoleSelectScreen.jsx';

function AuthBtn({ children, primary, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full cursor-pointer rounded-xl border-none px-5 py-3 font-display text-sm font-semibold uppercase tracking-wider',
        primary ? 'bg-coach-orange text-white' : 'bg-coach-orange-glow text-coach-orange',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

const RECOVERY_REDIRECT_URL = 'com.optim8.coach360.app://reset-password';

export function AuthFlow() {
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState('welcome');
  const [signupRole, setSignupRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  if (mode === 'welcome') {
    return (
      <div className="px-6 py-[60px] text-center">
        <div className="mb-2 font-display text-5xl font-bold tracking-widest text-coach-orange">
          COACH360
        </div>
        <div className="mb-12 font-body text-base text-coach-t2">
          Basketball coaching and player development
        </div>
        <div className="space-y-3">
          <AuthBtn
            primary
            onClick={function () {
              setMode('sign-up-role');
              setSignupRole(null);
              setError(null);
            }}
          >
            Create account
          </AuthBtn>
          <AuthBtn onClick={function () { setMode('sign-in'); setError(null); }}>
            Sign in
          </AuthBtn>
        </div>
      </div>
    );
  }

  if (mode === 'sign-in') {
    return (
      <SignInScreen
        submitting={submitting}
        error={error}
        onSwitchToSignUp={function () {
          setMode('sign-up-role');
          setSignupRole(null);
          setError(null);
          setVerificationSent(false);
        }}
        onForgotPassword={function () {
          setMode('forgot-password');
          setForgotPasswordSent(false);
          setError(null);
        }}
        onSubmit={async function (input) {
          setSubmitting(true);
          setError(null);
          try {
            await signIn(input);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'sign_in_failed');
          } finally {
            setSubmitting(false);
          }
        }}
      />
    );
  }

  if (mode === 'sign-up-role') {
    return (
      <RoleSelectScreen
        selectedRole={signupRole}
        onSelect={setSignupRole}
        onContinue={function () { setMode('sign-up'); }}
        onBack={function () {
          setMode('welcome');
          setSignupRole(null);
        }}
      />
    );
  }

  if (mode === 'forgot-password') {
    return (
      <ForgotPasswordScreen
        sent={forgotPasswordSent}
        submitting={submitting}
        error={error}
        onBack={function () {
          setMode('sign-in');
          setForgotPasswordSent(false);
          setError(null);
        }}
        onSubmit={async function (email) {
          setSubmitting(true);
          setError(null);
          try {
            await requestPasswordReset({ email, redirectTo: RECOVERY_REDIRECT_URL });
            setForgotPasswordSent(true);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'password_reset_request_failed');
          } finally {
            setSubmitting(false);
          }
        }}
      />
    );
  }

  return (
    <SignUpScreen
      role={signupRole}
      submitting={submitting}
      error={error}
      verificationSent={verificationSent}
      onBack={function () {
        setMode('sign-up-role');
        setError(null);
      }}
      onSwitchToSignIn={function () {
        setMode('sign-in');
        setSignupRole(null);
        setError(null);
        setVerificationSent(false);
      }}
      onSubmit={async function (input) {
        setSubmitting(true);
        setError(null);
        try {
          const result = await signUp(input);
          if (result.needsEmailVerification) {
            setVerificationSent(true);
          }
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'sign_up_failed');
        } finally {
          setSubmitting(false);
        }
      }}
    />
  );
}
