import type { AssignContentInput } from '@coach360/domain';
import type { CoachLibraryTranscodeStatus, SessionContentKind } from '@coach360/domain';

export type ContentAssignmentPackageChild = {
  id: string;
  title: string;
  kind: SessionContentKind;
};

export type ContentAssignment = {
  id: string;
  libraryItemId: string;
  coachId: string;
  teamId: string | null;
  playerId: string | null;
  createdAt: string;
  title: string;
  kind: SessionContentKind;
  coachDisplayName: string | null;
  instructions: string | null;
  mediaUrl: string | null;
  muxPlaybackId: string | null;
  transcodeStatus: CoachLibraryTranscodeStatus;
  itemIds: string[];
  /** Populated for package assignments when children are readable. */
  packageItems?: ContentAssignmentPackageChild[];
};

export type ContentAssignmentRepository = {
  /** Path A — assign library item to full team or one roster player (STORY-9.4). */
  assign(coachId: string, input: AssignContentInput): Promise<ContentAssignment>;
  /** Player content tab — assignments visible to this player (STORY-9.4 AC-3). */
  listAssignedForPlayer(playerId: string): Promise<ContentAssignment[]>;
};
