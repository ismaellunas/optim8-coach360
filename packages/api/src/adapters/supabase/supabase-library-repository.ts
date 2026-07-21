import type { SessionContentKind } from '@coach360/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CoachLibraryItem,
  LibraryRepository,
  PurchasedContentItem,
} from '../../ports/library-repository.js';

const DEMO_LIBRARY: ReadonlyArray<{ kind: SessionContentKind; title: string }> = [
  { kind: 'drill', title: 'Ball Handling Ladder' },
  { kind: 'video', title: 'Form Shooting Demo' },
  { kind: 'strategy', title: 'Motion Offense Sets' },
  { kind: 'package', title: 'Weekend Practice Pack' },
];

function mapLibraryRow(row: {
  id: string;
  kind: string;
  title: string;
}): CoachLibraryItem {
  return {
    id: row.id,
    kind: row.kind as SessionContentKind,
    title: row.title,
    source: 'library',
  };
}

export class SupabaseLibraryRepository implements LibraryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listCoachLibrary(userId: string): Promise<CoachLibraryItem[]> {
    const { data, error } = await this.client
      .from('coach_library_items')
      .select('id, kind, title')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`library_load_failed:${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length > 0) {
      return rows.map(mapLibraryRow);
    }

    const { data: seeded, error: seedError } = await this.client
      .from('coach_library_items')
      .insert(
        DEMO_LIBRARY.map((item) => ({
          owner_id: userId,
          kind: item.kind,
          title: item.title,
        })),
      )
      .select('id, kind, title');

    if (seedError) {
      throw new Error(`library_seed_failed:${seedError.message}`);
    }

    return (seeded ?? []).map(mapLibraryRow);
  }

  async listPurchasedContent(userId: string): Promise<PurchasedContentItem[]> {
    const { data, error } = await this.client
      .from('purchases')
      .select('id, sanity_document_id')
      .eq('buyer_id', userId)
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
}
