import type { CreateObjectiveInput, Objective } from '@coach360/domain';

export type ObjectivesRepository = {
  /** Coach: objectives they created. Player: assigned player + team objectives. */
  listForUser(userId: string, role: 'coach' | 'player' | 'team_manager' | 'admin'): Promise<Objective[]>;
  create(coachId: string, input: CreateObjectiveInput): Promise<Objective>;
};
