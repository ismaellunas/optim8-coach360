import type { SessionContentKind } from '@coach360/domain';

export type CoachLibraryItem = {
  id: string;
  kind: SessionContentKind;
  title: string;
  source: 'library';
};

export type PurchasedContentItem = {
  id: string;
  purchaseId: string;
  kind: 'package';
  title: string;
  source: 'purchase';
};

export type LibraryRepository = {
  /** Personal library for the coach (provisional until STORY-9.x / Sanity). */
  listCoachLibrary(userId: string): Promise<CoachLibraryItem[]>;
  /** Marketplace purchases attachable as package units (OQ-3.3 / OQ-3.4). */
  listPurchasedContent(userId: string): Promise<PurchasedContentItem[]>;
};
