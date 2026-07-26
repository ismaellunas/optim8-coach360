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
  removeMember(teamId: string, userId: string, profileId: string): Promise<RosterMember>;
  assignCoachByEmail(teamId: string, userId: string, email: string): Promise<RosterMember>;
  /** Admin oversight (STORY-12.5): assign a coach to any team by email. */
  adminAssignCoachByEmail(teamId: string, email: string): Promise<RosterMember>;
  /** Admin oversight (STORY-12.5): remove a coach assignment from any team. */
  adminUnassignCoach(teamId: string, profileId: string): Promise<RosterMember>;
};
