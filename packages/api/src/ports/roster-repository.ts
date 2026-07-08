import type {
  RosterMember,
  Team,
  TeamInvitePreview,
  TeamInviteWithLink,
} from '@coach360/domain';

export type CreateInviteOptions = {
  invitedEmail?: string;
  origin?: string;
};

export type RosterRepository = {
  listMembers(teamId: string): Promise<RosterMember[]>;
  listMemberTeams(userId: string): Promise<Team[]>;
  createInvite(
    teamId: string,
    userId: string,
    options?: CreateInviteOptions,
  ): Promise<TeamInviteWithLink>;
  getInviteByCode(code: string): Promise<TeamInvitePreview | null>;
  acceptInvite(code: string, userId: string): Promise<{ teamId: string }>;
  addPlayerByEmail(teamId: string, userId: string, email: string): Promise<RosterMember>;
};
