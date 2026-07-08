import {
  rosterMemberSchema,
  teamInvitePreviewSchema,
  teamInviteWithLinkSchema,
  type RosterMember,
  type TeamInvitePreview,
  type TeamInviteWithLink,
} from '@coach360/domain';

type RosterRow = {
  id: string;
  team_id: string;
  profile_id: string;
  roster_role: string;
  status: string;
  joined_at: string;
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
};

type InviteRow = {
  id: string;
  team_id: string;
  code: string;
  invited_email: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  teams?: { name: string } | { name: string }[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export function mapRosterMemberRow(row: RosterRow): RosterMember {
  const profile = firstRelation(row.profiles);
  return rosterMemberSchema.parse({
    id: row.id,
    teamId: row.team_id,
    profileId: row.profile_id,
    displayName: profile?.display_name ?? null,
    rosterRole: row.roster_role,
    status: row.status,
    joinedAt: row.joined_at,
  });
}

export function mapTeamInviteRow(row: InviteRow, inviteUrl: string): TeamInviteWithLink {
  return teamInviteWithLinkSchema.parse({
    id: row.id,
    teamId: row.team_id,
    code: row.code,
    invitedEmail: row.invited_email,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    inviteUrl,
  });
}

export function mapTeamInvitePreviewRow(row: InviteRow): TeamInvitePreview {
  const team = firstRelation(row.teams);
  return teamInvitePreviewSchema.parse({
    id: row.id,
    teamId: row.team_id,
    code: row.code,
    invitedEmail: row.invited_email,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    teamName: team?.name ?? 'Team',
  });
}

export const ROSTER_MEMBER_SELECT =
  'id, team_id, profile_id, roster_role, status, joined_at, profiles(display_name)';

export const TEAM_INVITE_SELECT =
  'id, team_id, code, invited_email, status, expires_at, created_at';

export const TEAM_INVITE_PREVIEW_SELECT =
  'id, team_id, code, invited_email, status, expires_at, created_at, teams(name)';
