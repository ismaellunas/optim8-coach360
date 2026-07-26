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
  /** Admin oversight (STORY-12.5): list every team including archived. */
  listAll(): Promise<Team[]>;
  /** Admin oversight (STORY-12.5): edit any team's settings. */
  adminUpdate(teamId: string, input: TeamProfileInput): Promise<Team>;
  /** Admin oversight (STORY-12.5): archive or restore a team. */
  setArchived(teamId: string, archived: boolean): Promise<Team>;
};
