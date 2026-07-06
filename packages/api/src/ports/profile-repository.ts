import type {
  CoachProfileInput,
  PlayerProfileInput,
  Profile,
  TeamManagerProfileInput,
} from '@coach360/domain';

export type ProfileRepository = {
  getById(id: string): Promise<Profile | null>;
  updateCoachProfile(id: string, input: CoachProfileInput): Promise<Profile>;
  updatePlayerProfile(id: string, input: PlayerProfileInput): Promise<Profile>;
  updateTeamManagerProfile(id: string, input: TeamManagerProfileInput): Promise<Profile>;
  enterTeamSetupPath(id: string, input?: TeamManagerProfileInput): Promise<Profile>;
  uploadAvatar(id: string, file: Blob, fileName: string): Promise<string>;
};
