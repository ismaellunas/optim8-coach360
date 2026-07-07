import type { Team, TeamProfileInput } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { TeamLogoFile, TeamRepository } from '../../ports/team-repository.js';

export class RestTeamRepository implements TeamRepository {
  async listForUser(userId: string): Promise<Team[]> {
    void userId;
    throw new NotImplementedAdapterError('rest', 'listTeamsForUser');
  }

  async getById(teamId: string): Promise<Team | null> {
    void teamId;
    throw new NotImplementedAdapterError('rest', 'getTeamById');
  }

  async createTeam(
    userId: string,
    input: TeamProfileInput,
    logoFile?: TeamLogoFile,
  ): Promise<Team> {
    void userId;
    void input;
    void logoFile;
    throw new NotImplementedAdapterError('rest', 'createTeam');
  }

  async updateTeam(
    teamId: string,
    userId: string,
    input: TeamProfileInput,
    logoFile?: TeamLogoFile,
  ): Promise<Team> {
    void teamId;
    void userId;
    void input;
    void logoFile;
    throw new NotImplementedAdapterError('rest', 'updateTeam');
  }

  async uploadLogo(teamId: string, userId: string, file: Blob, fileName: string): Promise<string> {
    void teamId;
    void userId;
    void file;
    void fileName;
    throw new NotImplementedAdapterError('rest', 'uploadTeamLogo');
  }
}
