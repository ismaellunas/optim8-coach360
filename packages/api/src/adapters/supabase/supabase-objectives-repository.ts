import {
  createObjectiveInputSchema,
  type CreateObjectiveInput,
  type Objective,
} from '@coach360/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ObjectivesRepository } from '../../ports/objectives-repository.js';

const OBJECTIVE_SELECT =
  'id, coach_id, scope, player_id, team_id, title, category, target_completions, current_completions, created_at, updated_at';

type ObjectiveRow = {
  id: string;
  coach_id: string;
  scope: 'player' | 'team';
  player_id: string | null;
  team_id: string | null;
  title: string;
  category: 'shooting' | 'defense' | 'strategy' | 'other' | null;
  target_completions: number;
  current_completions: number;
  created_at: string;
  updated_at: string;
};

function mapObjectiveRow(row: ObjectiveRow): Objective {
  return {
    id: row.id,
    coachId: row.coach_id,
    scope: row.scope,
    playerId: row.player_id,
    teamId: row.team_id,
    title: row.title,
    category: row.category,
    targetCompletions: row.target_completions,
    currentCompletions: row.current_completions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseObjectivesRepository implements ObjectivesRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listForUser(
    userId: string,
    role: 'coach' | 'player' | 'team_manager' | 'admin',
  ): Promise<Objective[]> {
    if (role === 'coach' || role === 'admin') {
      const { data, error } = await this.client
        .from('objectives')
        .select(OBJECTIVE_SELECT)
        .eq('coach_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`objectives_load_failed:${error.message}`);
      }

      return (data ?? []).map(mapObjectiveRow);
    }

    // Player: RLS returns player-scoped + team-scoped rows they can see
    const { data, error } = await this.client
      .from('objectives')
      .select(OBJECTIVE_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`objectives_load_failed:${error.message}`);
    }

    return (data ?? []).map(mapObjectiveRow);
  }

  async create(coachId: string, input: CreateObjectiveInput): Promise<Objective> {
    const parsed = createObjectiveInputSchema.parse(input);
    const payload = {
      coach_id: coachId,
      scope: parsed.scope,
      player_id: parsed.scope === 'player' ? parsed.playerId ?? null : null,
      team_id: parsed.scope === 'team' ? parsed.teamId ?? null : null,
      title: parsed.title,
      category: parsed.category ?? null,
      target_completions: parsed.targetCompletions,
      current_completions: 0,
    };

    const { data, error } = await this.client
      .from('objectives')
      .insert(payload)
      .select(OBJECTIVE_SELECT)
      .single();

    if (error) {
      throw new Error(`objectives_create_failed:${error.message}`);
    }

    return mapObjectiveRow(data);
  }
}
