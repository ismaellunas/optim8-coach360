import type { Team, TeamProfileInput } from '@coach360/domain';

export type TeamLogoFile = {
  file: Blob;
  fileName: string;
};

export type TeamRepository = {
  listForUser(userId: string): Promise<Team[]>;
  getById(teamId: string): Promise<Team | null>;
  createTeam(userId: string, input: TeamProfileInput, logoFile?: TeamLogoFile): Promise<Team>;
  updateTeam(
    teamId: string,
    userId: string,
    input: TeamProfileInput,
    logoFile?: TeamLogoFile,
  ): Promise<Team>;
  uploadLogo(teamId: string, userId: string, file: Blob, fileName: string): Promise<string>;
};
