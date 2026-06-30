import { NotImplementedAdapterError } from '../../client/types.js';
import type { ContentItem, ContentRepository } from '../../ports/content-repository.js';

export class RestContentRepository implements ContentRepository {
  async list(): Promise<ContentItem[]> {
    throw new NotImplementedAdapterError('rest', 'listContent');
  }
}
