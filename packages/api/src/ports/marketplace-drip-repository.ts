import type { DripProgressRow, TeamMemberPackageCompletion } from '@coach360/domain';

/**
 * Drip progress and completion tracking for owned marketplace packages
 * (STORY-10.3). Rows come from `drip_progress`; team purchase summaries
 * come from `list_team_purchase_completions`.
 */
export interface MarketplaceDripRepository {
  /** Viewer's own module rows for one purchase (AC-1..AC-3). */
  listForPurchase(purchaseId: string): Promise<DripProgressRow[]>;
  /** Mark an unlocked module completed; returns the completion timestamp (AC-2). */
  markModuleCompleted(purchaseId: string, moduleId: string): Promise<string>;
  /** Per-player completion for a team purchase owned by the caller (AC-4). */
  listTeamPurchaseCompletions(purchaseId: string): Promise<TeamMemberPackageCompletion[]>;
}
