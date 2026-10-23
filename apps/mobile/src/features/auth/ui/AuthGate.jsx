import { useAuth } from '../model/use-auth.js';
import { AuthFlow } from '../ui/AuthFlow.jsx';
import { SetNewPasswordScreen } from '../ui/SetNewPasswordScreen.jsx';

export function AuthGate({ children }) {
  const { isAuthenticated, isLoading, recoveryMode } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-coach-bg px-6 text-coach-t2">
        Restoring session…
      </div>
    );
  }

  if (recoveryMode) {
    return <SetNewPasswordScreen />;
  }

  if (!isAuthenticated) {
    return <AuthFlow />;
  }

  return children;
}
