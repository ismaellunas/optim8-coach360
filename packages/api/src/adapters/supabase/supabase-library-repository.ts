import {
  createCoachLibraryItemInputSchema,
  createCoachPackageInputSchema,
  normalizePackageItemIds,
  type CreateCoachLibraryItemInput,
  type CreateCoachPackageInput,
  type SessionContentKind,
} from '@coach360/domain';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type {
  CoachLibraryItem,
  InitiateVideoUploadResult,
  LibraryMediaFile,
  LibraryRepository,
  PurchasedContentItem,
} from '../../ports/library-repository.js';
import { edgeFunctionErrorDetail } from './edge-function-error.js';

const DEMO_LIBRARY: ReadonlyArray<{
  kind: SessionContentKind;
  title: string;
  media_url?: string;
  instructions?: string;
}> = [
  {
    kind: 'drill',
    title: 'Ball Handling Ladder',
    instructions: 'Alternate hands through the cones for 60 seconds.',
  },
  {
    kind: 'video',
    title: 'Form Shooting Demo',
    media_url:
      'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  { kind: 'strategy', title: 'Motion Offense Sets', instructions: 'Read help-side rotations.' },
  { kind: 'package', title: 'Weekend Practice Pack' },
];

const LIBRARY_SELECT =
  'id, kind, title, instructions, media_url, item_ids, mux_upload_id, mux_asset_id, mux_playback_id, transcode_status';

function mapLibraryRow(row: {
  id: string;
  kind: string;
  title: string;
  instructions?: string | null;
  media_url?: string | null;
  item_ids?: string[] | null;
  mux_upload_id?: string | null;
  mux_asset_id?: string | null;
  mux_playback_id?: string | null;
  transcode_status?: string | null;
}): CoachLibraryItem {
  return {
    id: row.id,
    kind: row.kind as SessionContentKind,
    title: row.title,
    source: 'library',
    instructions: row.instructions ?? null,
    mediaUrl: row.media_url ?? null,
    itemIds: row.item_ids ?? [],
    muxUploadId: row.mux_upload_id ?? null,
    muxAssetId: row.mux_asset_id ?? null,
    muxPlaybackId: row.mux_playback_id ?? null,
    transcodeStatus: (row.transcode_status as CoachLibraryItem['transcodeStatus']) ?? 'none',
  };
}

function mapLibraryWriteError(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === '42501' || /row-level security/i.test(error.message)) {
    return 'unauthorized';
  }
  return `${fallback}:${error.message}`;
}

export class SupabaseLibraryRepository implements LibraryRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async requireUser(): Promise<User> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) {
      throw new Error('unauthorized');
    }
    return data.user;
  }

  async listCoachLibrary(userId: string): Promise<CoachLibraryItem[]> {
    void userId;
    const user = await this.requireUser();

    const { data, error } = await this.client
      .from('coach_library_items')
      .select(LIBRARY_SELECT)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`library_load_failed:${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length > 0) {
      return rows.map(mapLibraryRow);
    }

    // Seed uses DB default owner_id = auth.uid() (no client-supplied owner_id).
    const { data: seeded, error: seedError } = await this.client
      .from('coach_library_items')
      .insert(
        DEMO_LIBRARY.map((item) => ({
          kind: item.kind,
          title: item.title,
          media_url: item.media_url ?? null,
          instructions: item.instructions ?? null,
        })),
      )
      .select(LIBRARY_SELECT);

    if (seedError) {
      throw new Error(mapLibraryWriteError(seedError, 'library_seed_failed'));
    }

    return (seeded ?? []).map(mapLibraryRow);
  }

  async listPurchasedContent(userId: string): Promise<PurchasedContentItem[]> {
    void userId;
    const user = await this.requireUser();

    const { data, error } = await this.client
      .from('purchases')
      .select('id, sanity_document_id')
      .eq('buyer_id', user.id)
      .order('purchased_at', { ascending: false });

    if (error) {
      throw new Error(`purchases_load_failed:${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.sanity_document_id,
      purchaseId: row.id,
      kind: 'package' as const,
      title: row.sanity_document_id,
      source: 'purchase' as const,
    }));
  }

  async createItem(
    _userId: string,
    input: CreateCoachLibraryItemInput,
  ): Promise<CoachLibraryItem> {
    await this.requireUser();
    const parsed = createCoachLibraryItemInputSchema.parse(input);

    // Omit owner_id — column default auth.uid() satisfies RLS WITH CHECK.
    const { data, error } = await this.client
      .from('coach_library_items')
      .insert({
        kind: parsed.kind,
        title: parsed.title,
        instructions: parsed.instructions ?? null,
        media_url: parsed.mediaUrl ?? null,
        transcode_status: 'none',
      })
      .select(LIBRARY_SELECT)
      .single();

    if (error || !data) {
      throw new Error(
        error ? mapLibraryWriteError(error, 'library_create_failed') : 'library_create_failed:unknown',
      );
    }

    return mapLibraryRow(data);
  }

  async createPackage(
    _userId: string,
    input: CreateCoachPackageInput,
  ): Promise<CoachLibraryItem> {
    const user = await this.requireUser();
    const parsed = createCoachPackageInputSchema.parse(input);
    const itemIds = normalizePackageItemIds(parsed.itemIds);

    const { data: members, error: memberError } = await this.client
      .from('coach_library_items')
      .select('id')
      .eq('owner_id', user.id)
      .in('id', itemIds);

    if (memberError) {
      throw new Error(`library_package_failed:${memberError.message}`);
    }

    if ((members ?? []).length !== itemIds.length) {
      throw new Error('library_package_failed:invalid_members');
    }

    const { data, error } = await this.client
      .from('coach_library_items')
      .insert({
        kind: 'package',
        title: parsed.title,
        item_ids: itemIds,
        transcode_status: 'none',
      })
      .select(LIBRARY_SELECT)
      .single();

    if (error || !data) {
      throw new Error(
        error ? mapLibraryWriteError(error, 'library_package_failed') : 'library_package_failed:unknown',
      );
    }

    return mapLibraryRow(data);
  }

  async uploadMedia(_userId: string, file: LibraryMediaFile): Promise<string> {
    const user = await this.requireUser();
    const safeName = file.fileName.replace(/[^\w.\-]+/g, '_');
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    const { error } = await this.client.storage
      .from('coach-library-media')
      .upload(path, file.file, { upsert: false });

    if (error) {
      throw new Error(`media_upload_failed:${error.message}`);
    }

    const { data } = this.client.storage.from('coach-library-media').getPublicUrl(path);
    return data.publicUrl;
  }

  async initiateVideoUpload(
    _userId: string,
    libraryItemId: string,
  ): Promise<InitiateVideoUploadResult> {
    await this.requireUser();

    const { data, error } = await this.client.functions.invoke('create-mux-upload', {
      body: { libraryItemId },
    });

    const payload = data as
      | (InitiateVideoUploadResult & { error?: string; hint?: string })
      | null;

    if (error) {
      throw new Error(await edgeFunctionErrorDetail(error, payload));
    }

    if (!payload?.uploadUrl || !payload.uploadId) {
      throw new Error(payload?.error || 'mux_initiate_failed');
    }

    return {
      libraryItemId: payload.libraryItemId,
      uploadId: payload.uploadId,
      uploadUrl: payload.uploadUrl,
      transcodeStatus: 'pending',
    };
  }
}
