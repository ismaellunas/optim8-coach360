import { useState } from 'react';
import { PageHeader, Card, Badge, Button } from '@coach360/ui';
import type { AppRole, SubscriptionTier } from '@coach360/domain';
import {
  useUserListQuery,
  useUpdateUserMutation,
  useUserTeamsQuery,
} from '@/entities/user/api/user-queries.js';
import {
  useUserSubscriptionQuery,
  useOverrideUserTierMutation,
} from '@/entities/subscription/api/subscription-queries.js';
import { TeamsOversightSection } from '@/pages/users/TeamsOversightSection.js';
import { OnboardingConfigSection } from '@/pages/users/OnboardingConfigSection.js';

type UsersTab = 'users' | 'teams' | 'onboarding';

const USERS_TABS: { id: UsersTab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'teams', label: 'Teams' },
  { id: 'onboarding', label: 'Onboarding' },
];

const ROLE_OPTIONS: AppRole[] = ['coach', 'player', 'team_manager', 'admin'];
const TIER_OPTIONS: SubscriptionTier[] = ['trial', 'basic', 'advanced', 'pro'];

function UserDetail({ userId }: { userId: string }) {
  const { data: teams, isLoading } = useUserTeamsQuery(userId);
  const { data: subscription, isLoading: subLoading } = useUserSubscriptionQuery(userId);
  const overrideTier = useOverrideUserTierMutation();

  return (
    <div className="mt-3 space-y-4 border-t border-coach-border pt-3">
      <div>
        <p className="text-xs uppercase text-coach-t3">Subscription tier</p>
        {subLoading ? (
          <p className="mt-1 text-sm text-coach-t2">Loading subscription…</p>
        ) : (
          <select
            aria-label="Override subscription tier"
            className="mt-2 rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={subscription?.tier ?? 'basic'}
            disabled={overrideTier.isPending}
            onChange={(event) =>
              overrideTier.mutate({
                profileId: userId,
                tier: event.target.value as SubscriptionTier,
              })
            }
          >
            {TIER_OPTIONS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        )}
        {overrideTier.isError ? (
          <p className="mt-1 text-xs text-coach-red">{(overrideTier.error as Error).message}</p>
        ) : null}
      </div>

      <div>
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
    </div>
  );
}

function UsersDirectory() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, error } = useUserListQuery(search);
  const updateUser = useUpdateUserMutation();

  return (
    <div>
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

export function UsersPage() {
  const [tab, setTab] = useState<UsersTab>('users');

  return (
    <div>
      <PageHeader title="Users" subtitle="Profiles, roles, teams, and onboarding." />
      <div className="mb-6 flex gap-2">
        {USERS_TABS.map((item) => (
          <Button
            key={item.id}
            variant={tab === item.id ? 'primary' : 'ghost'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {tab === 'users' ? <UsersDirectory /> : null}
      {tab === 'teams' ? <TeamsOversightSection /> : null}
      {tab === 'onboarding' ? <OnboardingConfigSection /> : null}
    </div>
  );
}
