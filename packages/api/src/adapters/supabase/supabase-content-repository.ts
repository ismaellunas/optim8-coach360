import type { ContentRepository, ContentItem } from '../../ports/content-repository.js';

/** Placeholder until marketplace metadata is synced to Supabase. */
export class SupabaseContentRepository implements ContentRepository {
  async list(): Promise<ContentItem[]> {
    return [
      { id: '1', title: 'Elite Shooting', status: 'published' },
      { id: '2', title: 'Lockdown Defense', status: 'published' },
      { id: '3', title: 'Rebounding Drills', status: 'review' },
    ];
  }
}
