import type {
  CoachProfileInput,
  PlayerProfileInput,
  Profile,
  TeamManagerProfileInput,
} from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { ProfileRepository } from '../../ports/profile-repository.js';

export class RestProfileRepository implements ProfileRepository {
  async getById(id: string): Promise<Profile | null> {
    void id;
    throw new NotImplementedAdapterError('rest', 'getProfileById');
  }

  async updateCoachProfile(id: string, input: CoachProfileInput): Promise<Profile> {
    void id;
    void input;
    throw new NotImplementedAdapterError('rest', 'updateCoachProfile');
  }

  async updatePlayerProfile(id: string, input: PlayerProfileInput): Promise<Profile> {
    void id;
    void input;
    throw new NotImplementedAdapterError('rest', 'updatePlayerProfile');
  }

  async updateTeamManagerProfile(
    id: string,
    input: TeamManagerProfileInput,
  ): Promise<Profile> {
    void id;
    void input;
    throw new NotImplementedAdapterError('rest', 'updateTeamManagerProfile');
  }

  async enterTeamSetupPath(id: string, input?: TeamManagerProfileInput): Promise<Profile> {
    void id;
    void input;
    throw new NotImplementedAdapterError('rest', 'enterTeamSetupPath');
  }

  async completeCoachOnboarding(id: string): Promise<Profile> {
    void id;
    throw new NotImplementedAdapterError('rest', 'completeCoachOnboarding');
  }

  async uploadAvatar(id: string, file: Blob, fileName: string): Promise<string> {
    void id;
    void file;
    void fileName;
    throw new NotImplementedAdapterError('rest', 'uploadAvatar');
  }
}
