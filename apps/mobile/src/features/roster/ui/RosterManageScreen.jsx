import { useState } from 'react';
import { Badge, Button as Btn, Card, Field, PageHeader, ScreenContainer } from '@/shared/ui/primitives.jsx';

const ROLE_BADGE_TONES = {
  player: 'blue',
  assistant_coach: 'orange',
  manager: 'purple',
};

const ROLE_LABELS = {
  player: 'Player',
  assistant_coach: 'Assistant coach',
  manager: 'Manager',
};

export function RosterManageScreen({
  team,
  members,
  submitting,
  error,
  canRemovePlayers,
  canAssignCoach,
  onBack,
  onRemovePlayer,
  onAssignCoach,
}) {
  const [coachEmail, setCoachEmail] = useState('');
  const [notice, setNotice] = useState(null);

  const activeMembers = members.filter(function (member) {
    return member.status === 'active';
  });

  async function handleAssignCoach(event) {
    event.preventDefault();
    const trimmed = coachEmail.trim();
    if (!trimmed) {
      return;
    }
    setNotice(null);
    try {
      await onAssignCoach(trimmed);
      setCoachEmail('');
      setNotice('Coach assigned to the team roster.');
    } catch {
      setNotice(null);
    }
  }

  return (
    <ScreenContainer className="pb-6">
      <PageHeader title="MANAGE ROSTER" subtitle={team?.name} onBack={onBack} />
      <Card className="p-4">
        <p className="font-display text-sm font-semibold uppercase tracking-wider text-coach-t1">
          Team members
        </p>
        <p className="mt-1 font-body text-xs text-coach-t3">
          View your full roster, remove players, and assign assistant coaches based on your plan.
        </p>
      </Card>

      {error ? <p className="mb-3 font-body text-sm text-coach-red">{error}</p> : null}
      {notice ? <p className="mb-3 font-body text-sm text-coach-green">{notice}</p> : null}

      {activeMembers.length === 0 ? (
        <Card className="p-4">
          <p className="font-body text-sm text-coach-t2">No active roster members yet.</p>
        </Card>
      ) : null}

      {activeMembers.map(function (member) {
        return (
          <Card key={member.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-semibold text-coach-t1">
                  {member.displayName || 'Team member'}
                </div>
                <div className="mt-2">
                  <Badge tone={ROLE_BADGE_TONES[member.rosterRole] || 'blue'}>
                    {ROLE_LABELS[member.rosterRole] || member.rosterRole}
                  </Badge>
                </div>
              </div>
              {canRemovePlayers && member.rosterRole === 'player' ? (
                <Btn
                  small
                  disabled={submitting}
                  onClick={function () {
                    onRemovePlayer(member);
                  }}
                >
                  Remove
                </Btn>
              ) : null}
            </div>
          </Card>
        );
      })}

      {canAssignCoach ? (
        <Card className="mt-4 p-4">
          <p className="font-display text-sm font-semibold uppercase tracking-wider text-coach-t1">
            Assign coach
          </p>
          <p className="mt-1 font-body text-xs text-coach-t3">
            Add an existing Coach360 coach to this team as an assistant coach.
          </p>
          <form onSubmit={handleAssignCoach} className="mt-3">
            <Field
              id="assign-coach-email"
              label="Coach email"
              type="email"
              placeholder="coach@example.com"
              value={coachEmail}
              onChange={function (event) {
                setCoachEmail(event.target.value);
              }}
            />
            <Btn full disabled={submitting || !coachEmail.trim()} type="submit">
              {submitting ? 'Assigning…' : 'Assign coach'}
            </Btn>
          </form>
        </Card>
      ) : null}
    </ScreenContainer>
  );
}
