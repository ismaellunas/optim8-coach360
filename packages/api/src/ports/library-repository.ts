import type { SessionContentKind } from '@coach360/domain';
import type {
  CoachLibraryTranscodeStatus,
  CreateCoachLibraryItemInput,
  CreateCoachPackageInput,
} from '@coach360/domain';

export type CoachLibraryItem = {
  id: string;
  kind: SessionContentKind;
  title: string;
  source: 'library';
  instructions?: string | null;
  mediaUrl?: string | null;
  itemIds?: string[];
  muxUploadId?: string | null;
  muxAssetId?: string | null;
  muxPlaybackId?: string | null;
  transcodeStatus?: CoachLibraryTranscodeStatus;
};

export type PurchasedContentItem = {
  id: string;
  purchaseId: string;
  kind: 'package';
  title: string;
  source: 'purchase';
};

export type InitiateVideoUploadResult = {
  libraryItemId: string;
  uploadId: string;
  uploadUrl: string;
  transcodeStatus: 'pending';
};

export type LibraryMediaFile = {
  file: Blob;
  fileName: string;
};

export type LibraryRepository = {
  /** Personal library for the coach (Path A — STORY-9.2). */
  listCoachLibrary(userId: string): Promise<CoachLibraryItem[]>;
  /** Marketplace purchases attachable as package units (OQ-3.3 / OQ-3.4). */
  listPurchasedContent(userId: string): Promise<PurchasedContentItem[]>;
  /** Create drill / video / strategy in personal library (STORY-9.2 AC-1). */
  createItem(userId: string, input: CreateCoachLibraryItemInput): Promise<CoachLibraryItem>;
  /** Bundle library items into a package (STORY-9.2 AC-3). */
  createPackage(userId: string, input: CreateCoachPackageInput): Promise<CoachLibraryItem>;
  /** Optional drill/strategy media → Supabase Storage. */
  uploadMedia(userId: string, file: LibraryMediaFile): Promise<string>;
  /** Initiate Mux Direct Upload for a video library item (STORY-9.2 AC-2). */
  initiateVideoUpload(userId: string, libraryItemId: string): Promise<InitiateVideoUploadResult>;
};
