import { Navigate, Route, Routes } from 'react-router-dom';
import { adminPaths } from '@/app/router/paths.js';
import { AdminRouteGuard } from '@/app/router/AdminRouteGuard.js';
import { AdminShell } from '@/widgets/admin-shell/ui/AdminShell.js';
import { DashboardStats } from '@/widgets/dashboard-stats/ui/DashboardStats.js';
import { AdminLoginPage } from '@/pages/login/AdminLoginPage.js';
import { UsersPage } from '@/pages/users/UsersPage.js';
import { SubscriptionsPage } from '@/pages/subscriptions/SubscriptionsPage.js';
import { ContentPage } from '@/pages/content/ContentPage.js';
import { MonitorPage } from '@/pages/monitor/MonitorPage.js';
import { StudioPage } from '@/pages/studio/StudioPage.js';

export function AppRouter() {
  return (
    <Routes>
      <Route path={adminPaths.login} element={<AdminLoginPage />} />
      <Route element={<AdminRouteGuard />}>
        {/* Full-bleed Studio — outside AdminShell chrome */}
        <Route path={`${adminPaths.studio}/*`} element={<StudioPage />} />
        <Route element={<AdminShell />}>
          <Route path={adminPaths.root} element={<DashboardStats />} />
          <Route path={adminPaths.users} element={<UsersPage />} />
          <Route path={adminPaths.subscriptions} element={<SubscriptionsPage />} />
          <Route path={adminPaths.content} element={<ContentPage />} />
          <Route path={adminPaths.monitor} element={<MonitorPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={adminPaths.login} replace />} />
    </Routes>
  );
}
