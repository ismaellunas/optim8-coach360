import { NotImplementedAdapterError } from '../../client/types.js';
import type {
  CoachLibraryItem,
  InitiateVideoUploadResult,
  LibraryMediaFile,
  LibraryRepository,
  PurchasedContentItem,
} from '../../ports/library-repository.js';
import type {
  CreateCoachLibraryItemInput,
  CreateCoachPackageInput,
} from '@coach360/domain';

export class RestLibraryRepository implements LibraryRepository {
  async listCoachLibrary(userId: string): Promise<CoachLibraryItem[]> {
    void userId;
    throw new NotImplementedAdapterError('rest', 'listCoachLibrary');
  }

  async listPurchasedContent(userId: string): Promise<PurchasedContentItem[]> {
    void userId;
    throw new NotImplementedAdapterError('rest', 'listPurchasedContent');
  }

  async createItem(
    userId: string,
    input: CreateCoachLibraryItemInput,
  ): Promise<CoachLibraryItem> {
    void userId;
    void input;
    throw new NotImplementedAdapterError('rest', 'createItem');
  }

  async createPackage(
    userId: string,
    input: CreateCoachPackageInput,
  ): Promise<CoachLibraryItem> {
    void userId;
    void input;
    throw new NotImplementedAdapterError('rest', 'createPackage');
  }

  async uploadMedia(userId: string, file: LibraryMediaFile): Promise<string> {
    void userId;
    void file;
    throw new NotImplementedAdapterError('rest', 'uploadMedia');
  }

  async initiateVideoUpload(
    userId: string,
    libraryItemId: string,
  ): Promise<InitiateVideoUploadResult> {
    void userId;
    void libraryItemId;
    throw new NotImplementedAdapterError('rest', 'initiateVideoUpload');
  }
}
