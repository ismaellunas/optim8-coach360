import type { CreateObjectiveInput } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { ObjectivesRepository } from '../../ports/objectives-repository.js';
import type { Objective } from '@coach360/domain';

export class RestObjectivesRepository implements ObjectivesRepository {
  async listForUser(
    userId: string,
    role: 'coach' | 'player' | 'team_manager' | 'admin',
  ): Promise<Objective[]> {
    void userId;
    void role;
    throw new NotImplementedAdapterError('rest', 'listForUser');
  }

  async create(coachId: string, input: CreateObjectiveInput): Promise<Objective> {
    void coachId;
    void input;
    throw new NotImplementedAdapterError('rest', 'create');
  }
}
