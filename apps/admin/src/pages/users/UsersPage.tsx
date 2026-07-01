import { PageHeader, Card, Badge } from '@coach360/ui';
import { useUserListQuery } from '@/entities/user/api/user-queries.js';

export function UsersPage() {
  const { data, isLoading, error } = useUserListQuery();

  return (
    <div>
      <PageHeader title="Users" subtitle="Profiles, roles, and account status." />
      {isLoading ? <p className="text-coach-t2">Loading users…</p> : null}
      {error ? <p className="text-coach-red">{(error as Error).message}</p> : null}
      <div className="space-y-3">
        {(data?.items ?? []).map((user) => (
          <Card key={user.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-coach-t1">{user.displayName ?? user.email}</p>
              <p className="text-xs text-coach-t3">{user.role}</p>
            </div>
            <Badge tone={user.isSuspended ? 'yellow' : 'green'}>
              {user.isSuspended ? 'Suspended' : 'Active'}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
