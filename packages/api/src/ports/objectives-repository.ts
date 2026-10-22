import type { CreateObjectiveInput, Objective } from '@coach360/domain';

export type ObjectivesRepository = {
  /** Coach: objectives they created. Player/team: assigned player + team-scope objectives (RLS-gated). */
  listForUser(userId: string, role: 'coach' | 'player' | 'team' | 'admin'): Promise<Objective[]>;
  /** Coach creating for a player/team, or a player self-authoring their own (STORY-11.1 player self-author). */
  create(creatorId: string, input: CreateObjectiveInput): Promise<Objective>;
};
