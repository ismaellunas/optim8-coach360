/** Self-contained STORY-10.2 drip unlock selection for Deno edge + vitest. */

export type DripUnlockCandidate = {
  purchase_id: string;
  profile_id: string;
  module_id: string;
  scheduled_unlock_at: string;
  sanity_document_id?: string | null;
};

export type DripModuleUnlockedEnqueue = {
  purchaseId: string;
  profileId: string;
  moduleId: string;
  sanityDocumentId: string | null;
  event: 'drip_module_unlocked';
};

export type ProcessDripUnlocksResult = {
  unlocked: DripModuleUnlockedEnqueue[];
  skipped: number;
};

/**
 * Emit drip_module_unlocked for each due locked module (scheduled_unlock_at <= now).
 * Callers persist unlock + enqueue notifications (DEP-07 / STORY-14.1).
 */
export function processDripUnlocks(options: {
  candidates: DripUnlockCandidate[];
  alreadyUnlockedKeys?: Iterable<string>;
  now?: Date;
}): ProcessDripUnlocksResult {
  const unlockedKeys = new Set(options.alreadyUnlockedKeys ?? []);
  const now = options.now ?? new Date();
  const unlocked: DripModuleUnlockedEnqueue[] = [];
  let skipped = 0;

  for (const candidate of options.candidates) {
    const key = `${candidate.purchase_id}:${candidate.module_id}`;
    if (unlockedKeys.has(key) || !candidate.scheduled_unlock_at) {
      skipped += 1;
      continue;
    }

    const dueAt = new Date(candidate.scheduled_unlock_at);
    if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() > now.getTime()) {
      skipped += 1;
      continue;
    }

    unlocked.push({
      purchaseId: candidate.purchase_id,
      profileId: candidate.profile_id,
      moduleId: candidate.module_id,
      sanityDocumentId: candidate.sanity_document_id ?? null,
      event: 'drip_module_unlocked',
    });
    unlockedKeys.add(key);
  }

  return { unlocked, skipped };
}
