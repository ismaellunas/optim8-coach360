import { Card } from '@coach360/ui';
import { adminNavItems } from '@/app/router/paths.js';
import { Link } from 'react-router-dom';

export function DashboardStats() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-coach-t1">Dashboard</h2>
        <p className="text-sm text-coach-t2">Flow 7 control plane — four operational pillars.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminNavItems.map((item) => (
          <Link key={item.id} to={item.path}>
            <Card className="transition hover:border-coach-orange">
              <p className="text-xs uppercase tracking-wide text-coach-t3">{item.label}</p>
              <p className="mt-2 font-display text-2xl font-bold text-coach-t1">Open</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
