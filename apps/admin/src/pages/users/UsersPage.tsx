import { useState } from 'react';
import { PageHeader, Card, Badge, Button } from '@coach360/ui';
import type { AppRole } from '@coach360/domain';
import {
  useUserListQuery,
  useUpdateUserMutation,
  useUserTeamsQuery,
} from '@/entities/user/api/user-queries.js';

const ROLE_OPTIONS: AppRole[] = ['coach', 'player', 'team_manager', 'admin'];

function UserDetail({ userId }: { userId: string }) {
  const { data: teams, isLoading } = useUserTeamsQuery(userId);

  return (
    <div className="mt-3 border-t border-coach-border pt-3">
      <p className="text-xs uppercase text-coach-t3">Team rosters</p>
      {isLoading ? <p className="mt-1 text-sm text-coach-t2">Loading teams…</p> : null}
      {!isLoading && (teams ?? []).length === 0 ? (
        <p className="mt-1 text-sm text-coach-t2">Not on any team.</p>
      ) : null}
      <div className="mt-2 space-y-1">
        {(teams ?? []).map((team) => (
          <p key={team.id} className="text-sm text-coach-t1">
            {team.name}
          </p>
        ))}
      </div>
    </div>
  );
}

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, error } = useUserListQuery(search);
  const updateUser = useUpdateUserMutation();

  return (
    <div>
      <PageHeader title="Users" subtitle="Profiles, roles, and account status." />
      <input
        type="text"
        placeholder="Search by name…"
        aria-label="Search users"
        className="mb-4 w-full max-w-sm rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {isLoading ? <p className="text-coach-t2">Loading users…</p> : null}
      {error ? <p className="text-coach-red">{(error as Error).message}</p> : null}
      <div className="space-y-3">
        {(data?.items ?? []).map((user) => {
          const isExpanded = expandedId === user.id;
          return (
            <Card key={user.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-coach-t1">{user.displayName ?? user.email}</p>
                  <p className="text-xs text-coach-t3">{user.role}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={user.isSuspended ? 'yellow' : 'green'}>
                    {user.isSuspended ? 'Suspended' : 'Active'}
                  </Badge>
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedId(isExpanded ? null : user.id)}
                  >
                    {isExpanded ? 'Close' : 'Manage'}
                  </Button>
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      aria-label={`Display name for ${user.displayName ?? user.email}`}
                      className="rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
                      defaultValue={user.displayName ?? ''}
                      onBlur={(event) => {
                        const displayName = event.target.value;
                        if (displayName !== (user.displayName ?? '')) {
                          updateUser.mutate({ id: user.id, input: { displayName } });
                        }
                      }}
                    />
                    <select
                      aria-label={`Role for ${user.displayName ?? user.email}`}
                      className="rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
                      value={user.role}
                      disabled={updateUser.isPending}
                      onChange={(event) =>
                        updateUser.mutate({
                          id: user.id,
                          input: { role: event.target.value as AppRole },
                        })
                      }
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      disabled={updateUser.isPending}
                      onClick={() =>
                        updateUser.mutate({
                          id: user.id,
                          input: { isSuspended: !user.isSuspended },
                        })
                      }
                    >
                      {user.isSuspended ? 'Reactivate' : 'Suspend'}
                    </Button>
                  </div>
                  {updateUser.isError ? (
                    <p className="text-xs text-coach-red">
                      {(updateUser.error as Error).message}
                    </p>
                  ) : null}
                  <UserDetail userId={user.id} />
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
