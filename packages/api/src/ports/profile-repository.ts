import type {
  CoachProfileInput,
  PlayerProfileInput,
  Profile,
  SelfProfileInput,
  TeamManagerProfileInput,
} from '@coach360/domain';

export type ProfileRepository = {
  getById(id: string): Promise<Profile | null>;
  updateCoachProfile(id: string, input: CoachProfileInput): Promise<Profile>;
  updatePlayerProfile(id: string, input: PlayerProfileInput): Promise<Profile>;
  updateTeamManagerProfile(id: string, input: TeamManagerProfileInput): Promise<Profile>;
  /** Name, bio, and photo for any role. Does not change email, role, or tier. */
  updateSelfProfile(id: string, input: SelfProfileInput): Promise<Profile>;
  enterTeamSetupPath(id: string, input?: TeamManagerProfileInput): Promise<Profile>;
  completeCoachOnboarding(id: string): Promise<Profile>;
  completePlayerOnboarding(id: string): Promise<Profile>;
  logPlayerFirstDrill(id: string): Promise<Profile>;
  uploadAvatar(id: string, file: Blob, fileName: string): Promise<string>;
};
