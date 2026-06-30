import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '@coach360/ui';
import { adminNavItems, adminPaths } from '@/app/router/paths.js';
import { useAuth } from '@/features/auth/model/auth-context.js';

export function AdminShell() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-coach-bg text-coach-t1">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="w-64 border-r border-coach-border bg-coach-surface p-6">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-coach-t3">Coach360</p>
            <h1 className="font-display text-2xl font-bold text-coach-orange">Admin</h1>
          </div>
          <nav className="space-y-2">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2 text-sm font-semibold ${
                    isActive ? 'bg-coach-orange-glow text-coach-orange' : 'text-coach-t2 hover:bg-coach-card'
                  }`
                }
                end={item.path === adminPaths.root}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-8">
            <Button variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </aside>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
