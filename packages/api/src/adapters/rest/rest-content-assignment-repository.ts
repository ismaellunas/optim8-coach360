import { NotImplementedAdapterError } from '../../client/types.js';
import type { AssignContentInput } from '@coach360/domain';
import type {
  ContentAssignment,
  ContentAssignmentRepository,
} from '../../ports/content-assignment-repository.js';

export class RestContentAssignmentRepository implements ContentAssignmentRepository {
  async assign(coachId: string, input: AssignContentInput): Promise<ContentAssignment> {
    void coachId;
    void input;
    throw new NotImplementedAdapterError('rest', 'assign');
  }

  async listAssignedForPlayer(playerId: string): Promise<ContentAssignment[]> {
    void playerId;
    throw new NotImplementedAdapterError('rest', 'listAssignedForPlayer');
  }
}
