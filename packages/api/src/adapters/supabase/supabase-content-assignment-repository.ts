import {
  assertPlayerOnRosterForDistribution,
  assignContentInputSchema,
  type AssignContentInput,
  type CoachLibraryTranscodeStatus,
  type SessionContentKind,
} from '@coach360/domain';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type {
  ContentAssignment,
  ContentAssignmentPackageChild,
  ContentAssignmentRepository,
} from '../../ports/content-assignment-repository.js';

const ASSIGNMENT_SELECT =
  'id, library_item_id, coach_id, team_id, player_id, created_at, title, kind';

const LIBRARY_EMBED =
  'title, kind, instructions, media_url, mux_playback_id, transcode_status, item_ids';

type LibraryEmbed = {
  id?: string;
  title?: string;
  kind?: SessionContentKind;
  instructions?: string | null;
  media_url?: string | null;
  mux_playback_id?: string | null;
  transcode_status?: string | null;
  item_ids?: string[] | null;
};

function mapWriteError(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === '42501' || /row-level security/i.test(error.message)) {
    return 'non_roster_distribution_forbidden';
  }
  if (/non_roster_distribution_forbidden/.test(error.message)) {
    return 'non_roster_distribution_forbidden';
  }
  return `${fallback}:${error.message}`;
}

function mapAssignmentRow(
  row: {
    id: string;
    library_item_id: string;
    coach_id: string;
    team_id: string | null;
    player_id: string | null;
    created_at: string;
    title?: string | null;
    kind?: string | null;
  },
  meta: {
    title: string;
    kind: SessionContentKind;
    coachDisplayName: string | null;
    instructions: string | null;
    mediaUrl: string | null;
    muxPlaybackId: string | null;
    transcodeStatus: CoachLibraryTranscodeStatus;
    itemIds: string[];
    packageItems?: ContentAssignmentPackageChild[];
  },
): ContentAssignment {
  const base: ContentAssignment = {
    id: row.id,
    libraryItemId: row.library_item_id,
    coachId: row.coach_id,
    teamId: row.team_id,
    playerId: row.player_id,
    createdAt: row.created_at,
    title: meta.title || row.title || 'Assigned content',
    kind: (meta.kind || row.kind || 'drill') as SessionContentKind,
    coachDisplayName: meta.coachDisplayName,
    instructions: meta.instructions,
    mediaUrl: meta.mediaUrl,
    muxPlaybackId: meta.muxPlaybackId,
    transcodeStatus: meta.transcodeStatus,
    itemIds: meta.itemIds,
  };
  if (meta.packageItems) {
    base.packageItems = meta.packageItems;
  }
  return base;
}

function metaFromLibrary(
  item: LibraryEmbed | null,
  coachDisplayName: string | null,
  packageItems?: ContentAssignmentPackageChild[],
  snapshot?: { title?: string | null; kind?: string | null },
) {
  const base = {
    title: item?.title ?? snapshot?.title ?? 'Assigned content',
    kind: (item?.kind ?? snapshot?.kind ?? 'drill') as SessionContentKind,
    coachDisplayName,
    instructions: item?.instructions ?? null,
    mediaUrl: item?.media_url ?? null,
    muxPlaybackId: item?.mux_playback_id ?? null,
    transcodeStatus: (item?.transcode_status as CoachLibraryTranscodeStatus) ?? 'none',
    itemIds: item?.item_ids ?? [],
  };
  if (packageItems && packageItems.length > 0) {
    return { ...base, packageItems };
  }
  if ((item?.kind ?? snapshot?.kind) === 'package') {
    return { ...base, packageItems: packageItems ?? [] };
  }
  return base;
}

export class SupabaseContentAssignmentRepository implements ContentAssignmentRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async requireUser(): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) {
      throw new Error('unauthorized');
    }
    return data.user;
  }

  private async rosterPlayerIdsForCoach(coachId: string): Promise<string[]> {
    const { data: teams, error: teamError } = await this.client
      .from('teams')
      .select('id')
      .eq('created_by', coachId);
    if (teamError) {
      throw new Error(`content_assign_failed:${teamError.message}`);
    }

    const { data: coachRoster, error: coachRosterError } = await this.client
      .from('rosters')
      .select('team_id')
      .eq('profile_id', coachId)
      .in('roster_role', ['assistant_coach', 'manager'])
      .eq('status', 'active');
    if (coachRosterError) {
      throw new Error(`content_assign_failed:${coachRosterError.message}`);
    }

    const teamIds = [
      ...new Set([
        ...(teams ?? []).map((row) => row.id as string),
        ...(coachRoster ?? []).map((row) => row.team_id as string),
      ]),
    ];
    if (teamIds.length === 0) {
      return [];
    }

    const { data: members, error: memberError } = await this.client
      .from('rosters')
      .select('profile_id')
      .in('team_id', teamIds)
      .eq('roster_role', 'player')
      .eq('status', 'active');
    if (memberError) {
      throw new Error(`content_assign_failed:${memberError.message}`);
    }

    return [...new Set((members ?? []).map((row) => row.profile_id as string))];
  }

  private async loadPackageChildren(itemIds: string[]): Promise<ContentAssignmentPackageChild[]> {
    if (itemIds.length === 0) {
      return [];
    }
    const { data, error } = await this.client
      .from('coach_library_items')
      .select('id, title, kind')
      .in('id', itemIds);
    if (error || !data) {
      return [];
    }
    return data.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      kind: row.kind as SessionContentKind,
    }));
  }

  async assign(coachId: string, input: AssignContentInput): Promise<ContentAssignment> {
    const user = await this.requireUser();
    if (user.id !== coachId) {
      throw new Error('unauthorized');
    }

    const parsed = assignContentInputSchema.parse(input);

    if (parsed.playerId) {
      const rosterIds = await this.rosterPlayerIdsForCoach(coachId);
      assertPlayerOnRosterForDistribution(parsed.playerId, rosterIds);
    }

    const { data: libraryItem, error: libraryError } = await this.client
      .from('coach_library_items')
      .select(LIBRARY_EMBED)
      .eq('id', parsed.libraryItemId)
      .maybeSingle();

    if (libraryError || !libraryItem) {
      throw new Error(
        mapWriteError(libraryError ?? { message: 'library_item_missing' }, 'content_assign_failed'),
      );
    }

    const { data, error } = await this.client
      .from('content_assignments')
      .insert({
        library_item_id: parsed.libraryItemId,
        coach_id: coachId,
        team_id: parsed.teamId ?? null,
        player_id: parsed.playerId ?? null,
        title: libraryItem.title,
        kind: libraryItem.kind,
      })
      .select(ASSIGNMENT_SELECT)
      .single();

    if (error || !data) {
      throw new Error(mapWriteError(error ?? { message: 'insert_failed' }, 'content_assign_failed'));
    }

    const { data: coach } = await this.client
      .from('profiles')
      .select('display_name')
      .eq('id', coachId)
      .maybeSingle();

    const packageItems =
      libraryItem.kind === 'package'
        ? await this.loadPackageChildren(libraryItem.item_ids ?? [])
        : undefined;

    return mapAssignmentRow(
      data,
      metaFromLibrary(
        libraryItem as LibraryEmbed,
        coach?.display_name ?? null,
        packageItems,
        { title: data.title, kind: data.kind },
      ),
    );
  }

  async listAssignedForPlayer(playerId: string): Promise<ContentAssignment[]> {
    const user = await this.requireUser();
    if (user.id !== playerId) {
      throw new Error('unauthorized');
    }

    // Flat select only — nested embeds fail when FK hints / RLS hide related rows.
    const { data, error } = await this.client
      .from('content_assignments')
      .select(ASSIGNMENT_SELECT)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`content_assign_load_failed:${error.message}`);
    }

    const rows = data ?? [];
    const results: ContentAssignment[] = [];

    const libraryIds = [...new Set(rows.map((row) => row.library_item_id as string))];
    const coachIds = [...new Set(rows.map((row) => row.coach_id as string))];

    const libraryById = new Map<string, LibraryEmbed>();
    if (libraryIds.length > 0) {
      const { data: libraryRows } = await this.client
        .from('coach_library_items')
        .select(`id, ${LIBRARY_EMBED}`)
        .in('id', libraryIds);
      for (const lib of libraryRows ?? []) {
        libraryById.set(lib.id as string, lib as LibraryEmbed);
      }
    }

    const coachNameById = new Map<string, string | null>();
    if (coachIds.length > 0) {
      const { data: coaches } = await this.client
        .from('profiles')
        .select('id, display_name')
        .in('id', coachIds);
      for (const coach of coaches ?? []) {
        coachNameById.set(coach.id as string, (coach.display_name as string | null) ?? null);
      }
    }

    for (const row of rows) {
      const item = libraryById.get(row.library_item_id as string) ?? null;
      const packageItems =
        (item?.kind ?? row.kind) === 'package'
          ? await this.loadPackageChildren(item?.item_ids ?? [])
          : undefined;

      results.push(
        mapAssignmentRow(
          {
            id: row.id,
            library_item_id: row.library_item_id,
            coach_id: row.coach_id,
            team_id: row.team_id,
            player_id: row.player_id,
            created_at: row.created_at,
            title: row.title,
            kind: row.kind,
          },
          metaFromLibrary(
            item,
            coachNameById.get(row.coach_id as string) ?? null,
            packageItems,
            { title: row.title, kind: row.kind },
          ),
        ),
      );
    }

    return results;
  }
}
