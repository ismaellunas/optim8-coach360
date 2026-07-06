import { useAuth } from '../model/use-auth.js';
import { AuthFlow } from '../ui/AuthFlow.jsx';

export function AuthGate({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-coach-t2">
        Restoring session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthFlow />;
  }

  return children;
}
