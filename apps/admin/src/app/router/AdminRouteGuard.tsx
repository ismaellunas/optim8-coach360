import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { canAccessAdmin } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/auth-context.js';
import { adminPaths } from '@/app/router/paths.js';

export function AdminRouteGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="p-8 text-coach-t2">Checking session…</div>;
  }

  const access = canAccessAdmin(user);
  if (!access.ok) {
    return <Navigate to={adminPaths.login} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
