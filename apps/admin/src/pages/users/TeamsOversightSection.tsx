import { useState } from 'react';
import type { Team, TeamProfileInput } from '@coach360/domain';
import { Card, Badge, Button } from '@coach360/ui';
import {
  useAllTeamsQuery,
  useTeamMembersQuery,
  useAdminUpdateTeamMutation,
  useSetTeamArchivedMutation,
  useAdminAssignCoachMutation,
  useAdminUnassignCoachMutation,
} from '@/entities/team/api/team-queries.js';

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function CoachAssignments({ teamId }: { teamId: string }) {
  const { data: members, isLoading } = useTeamMembersQuery(teamId);
  const assignCoach = useAdminAssignCoachMutation();
  const unassignCoach = useAdminUnassignCoachMutation();
  const [email, setEmail] = useState('');

  const coaches = (members ?? []).filter((member) => member.rosterRole === 'assistant_coach');

  return (
    <div className="rounded-[12px] border border-coach-border p-3">
      <p className="font-body text-xs uppercase text-coach-t3">Coach assignments</p>
      {isLoading ? <p className="mt-1 text-sm text-coach-t2">Loading coaches…</p> : null}
      {!isLoading && coaches.length === 0 ? (
        <p className="mt-1 text-sm text-coach-t2">No coaches assigned.</p>
      ) : null}
      <div className="mt-2 space-y-2">
        {coaches.map((coach) => (
          <div key={coach.profileId} className="flex items-center justify-between">
            <p className="text-sm text-coach-t1">{coach.displayName ?? coach.profileId}</p>
            <Button
              variant="ghost"
              disabled={unassignCoach.isPending}
              onClick={() => unassignCoach.mutate({ teamId, profileId: coach.profileId })}
            >
              Unassign
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="email"
          aria-label={`Assign coach email for ${teamId}`}
          placeholder="coach@email.com"
          className="rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button
          variant="ghost"
          disabled={assignCoach.isPending || !email.trim()}
          onClick={() =>
            assignCoach.mutate(
              { teamId, email: email.trim() },
              { onSuccess: () => setEmail('') },
            )
          }
        >
          Assign coach
        </Button>
      </div>
      {assignCoach.isError ? (
        <p className="mt-2 text-xs text-coach-red">{(assignCoach.error as Error).message}</p>
      ) : null}
      {unassignCoach.isError ? (
        <p className="mt-2 text-xs text-coach-red">{(unassignCoach.error as Error).message}</p>
      ) : null}
    </div>
  );
}

function TeamEditor({ team }: { team: Team }) {
  const updateTeam = useAdminUpdateTeamMutation();
  const setArchived = useSetTeamArchivedMutation();
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? '');
  const [ageMin, setAgeMin] = useState(team.ageMin != null ? String(team.ageMin) : '');
  const [ageMax, setAgeMax] = useState(team.ageMax != null ? String(team.ageMax) : '');
  const [gradeLevel, setGradeLevel] = useState(team.gradeLevel ?? '');
  const [division, setDivision] = useState(team.division ?? '');

  function save() {
    const input: TeamProfileInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      ageMin: numberOrNull(ageMin),
      ageMax: numberOrNull(ageMax),
      gradeLevel: gradeLevel.trim() || null,
      division: division.trim() || null,
    };
    updateTeam.mutate({ teamId: team.id, input });
  }

  const isArchived = team.archivedAt !== null;

  return (
    <div className="mt-4 space-y-4 border-t border-coach-border pt-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Team name</span>
          <input
            type="text"
            aria-label={`Team name for ${team.id}`}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Division</span>
          <input
            type="text"
            aria-label={`Division for ${team.id}`}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={division}
            onChange={(event) => setDivision(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Age min</span>
          <input
            type="number"
            aria-label={`Age min for ${team.id}`}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={ageMin}
            onChange={(event) => setAgeMin(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Age max</span>
          <input
            type="number"
            aria-label={`Age max for ${team.id}`}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={ageMax}
            onChange={(event) => setAgeMax(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Grade level</span>
          <input
            type="text"
            aria-label={`Grade level for ${team.id}`}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={gradeLevel}
            onChange={(event) => setGradeLevel(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="font-body text-xs text-coach-t3">Description</span>
          <input
            type="text"
            aria-label={`Description for ${team.id}`}
            className="mt-1 w-full rounded-[10px] border border-coach-border bg-coach-surface px-3 py-2 font-body text-sm text-coach-t1"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={updateTeam.isPending} onClick={save}>
          Save team settings
        </Button>
        <Button
          variant="ghost"
          disabled={setArchived.isPending}
          onClick={() => setArchived.mutate({ teamId: team.id, archived: !isArchived })}
        >
          {isArchived ? 'Restore' : 'Archive'}
        </Button>
      </div>
      {updateTeam.isError ? (
        <p className="text-xs text-coach-red">{(updateTeam.error as Error).message}</p>
      ) : null}
      {setArchived.isError ? (
        <p className="text-xs text-coach-red">{(setArchived.error as Error).message}</p>
      ) : null}

      <CoachAssignments teamId={team.id} />
    </div>
  );
}

export function TeamsOversightSection() {
  const { data: teams, isLoading, error } = useAllTeamsQuery();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <h2 className="mb-4 font-display text-lg font-semibold text-coach-t1">Team oversight</h2>
      {isLoading ? <p className="text-coach-t2">Loading teams…</p> : null}
      {error ? <p className="text-coach-red">{(error as Error).message}</p> : null}
      <div className="space-y-3">
        {(teams ?? []).map((team) => {
          const isExpanded = expandedId === team.id;
          const isArchived = team.archivedAt !== null;
          return (
            <Card key={team.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-coach-t1">{team.name}</p>
                  <p className="text-xs text-coach-t3">{team.division ?? 'No division'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={isArchived ? 'yellow' : 'green'}>
                    {isArchived ? 'Archived' : 'Active'}
                  </Badge>
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedId(isExpanded ? null : team.id)}
                  >
                    {isExpanded ? 'Close' : 'Manage'}
                  </Button>
                </div>
              </div>
              {isExpanded ? <TeamEditor team={team} /> : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
