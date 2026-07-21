import { NotImplementedAdapterError } from '../../client/types.js';
import type {
  CoachLibraryItem,
  LibraryRepository,
  PurchasedContentItem,
} from '../../ports/library-repository.js';

export class RestLibraryRepository implements LibraryRepository {
  async listCoachLibrary(userId: string): Promise<CoachLibraryItem[]> {
    void userId;
    throw new NotImplementedAdapterError('rest', 'listCoachLibrary');
  }

  async listPurchasedContent(userId: string): Promise<PurchasedContentItem[]> {
    void userId;
    throw new NotImplementedAdapterError('rest', 'listPurchasedContent');
  }
}
