import type { CreateObjectiveInput } from '@coach360/domain';
import { NotImplementedAdapterError } from '../../client/types.js';
import type { ObjectivesRepository } from '../../ports/objectives-repository.js';
import type { Objective } from '@coach360/domain';

export class RestObjectivesRepository implements ObjectivesRepository {
  async listForUser(
    userId: string,
    role: 'coach' | 'player' | 'team' | 'admin',
  ): Promise<Objective[]> {
    void userId;
    void role;
    throw new NotImplementedAdapterError('rest', 'listForUser');
  }

  async create(creatorId: string, input: CreateObjectiveInput): Promise<Objective> {
    void creatorId;
    void input;
    throw new NotImplementedAdapterError('rest', 'create');
  }

  async archive(userId: string, objectiveId: string): Promise<void> {
    void userId;
    void objectiveId;
    throw new NotImplementedAdapterError('rest', 'archive');
  }
}
