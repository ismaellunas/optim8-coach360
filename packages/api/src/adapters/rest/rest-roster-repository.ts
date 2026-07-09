import type {
  RosterMember,
  Team,
  TeamInvitePreview,
  TeamInviteWithLink,
} from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { CreateInviteOptions, RosterRepository } from '../../ports/roster-repository.js';

export class RestRosterRepository implements RosterRepository {
  async listMembers(teamId: string): Promise<RosterMember[]> {
    void teamId;
    throw new NotImplementedAdapterError('rest', 'listRosterMembers');
  }

  async listMemberTeams(userId: string): Promise<Team[]> {
    void userId;
    throw new NotImplementedAdapterError('rest', 'listMemberTeams');
  }

  async createInvite(
    teamId: string,
    userId: string,
    options?: CreateInviteOptions,
  ): Promise<TeamInviteWithLink> {
    void teamId;
    void userId;
    void options;
    throw new NotImplementedAdapterError('rest', 'createTeamInvite');
  }

  async getInviteByCode(code: string): Promise<TeamInvitePreview | null> {
    void code;
    throw new NotImplementedAdapterError('rest', 'getInviteByCode');
  }

  async acceptInvite(code: string, userId: string): Promise<{ teamId: string }> {
    void code;
    void userId;
    throw new NotImplementedAdapterError('rest', 'acceptTeamInvite');
  }

  async removeMember(teamId: string, userId: string, profileId: string): Promise<RosterMember> {
    void teamId;
    void userId;
    void profileId;
    throw new NotImplementedAdapterError('rest', 'removeRosterMember');
  }

  async assignCoachByEmail(teamId: string, userId: string, email: string): Promise<RosterMember> {
    void teamId;
    void userId;
    void email;
    throw new NotImplementedAdapterError('rest', 'assignCoachToTeam');
  }

  async addPlayerByEmail(teamId: string, userId: string, email: string): Promise<RosterMember> {
    void teamId;
    void userId;
    void email;
    throw new NotImplementedAdapterError('rest', 'addPlayerByEmail');
  }
}
