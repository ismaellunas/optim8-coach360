import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { buildPackageDripProgressView, moduleLockLabel } from '@coach360/domain';
import { Card } from '@/shared/ui/primitives.jsx';

function IconLockSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function IconCheckSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function formatUnlockDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function moduleTitle(moduleId, index) {
  const trimmed = String(moduleId || '').replace(/^mod[-_]/i, '').replace(/[-_]+/g, ' ').trim();
  if (!trimmed) return `Module ${index + 1}`;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * STORY-10.3 — owned package drip timeline, progress bar, and per-module
 * completion. AC-1: schedule + next unlock; AC-2: completed vs total bar;
 * AC-3: locked modules show unlock date or tier requirement.
 */
export function OwnedPackageProgress({ purchaseId, hasDripAccess, dripLabel }) {
  const repos = useRepositories();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyModuleId, setBusyModuleId] = useState(null);

  const load = useCallback(async () => {
    if (!purchaseId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await repos.marketplaceDrip.listForPurchase(purchaseId);
      setRows(next || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'drip_progress_load_failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [purchaseId, repos.marketplaceDrip]);

  useEffect(() => {
    void load();
  }, [load]);

  const view = useMemo(
    () => buildPackageDripProgressView(rows, { hasDripAccess: Boolean(hasDripAccess) }),
    [rows, hasDripAccess],
  );

  async function markComplete(moduleId) {
    setBusyModuleId(moduleId);
    setError(null);
    try {
      await repos.marketplaceDrip.markModuleCompleted(purchaseId, moduleId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'drip_module_complete_failed');
    } finally {
      setBusyModuleId(null);
    }
  }

  if (loading) {
    return (
      <div className="mt-4 font-body text-sm text-coach-t3" data-testid="owned-package-progress">
        Loading progress…
      </div>
    );
  }

  if (view.totalModules === 0) {
    return (
      <div className="mt-4" data-testid="owned-package-progress">
        <div className="font-body text-sm font-semibold text-coach-green">Owned</div>
        {error ? <div className="mt-2 font-body text-xs text-coach-red">{error}</div> : null}
      </div>
    );
  }

  const barColor = view.completionPercent === 100 ? '#22C55E' : '#FF6B35';
  const nextUnlockLabel = view.nextUnlockAt ? formatUnlockDate(view.nextUnlockAt) : null;

  return (
    <div className="mt-4" data-testid="owned-package-progress">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-body text-sm font-semibold text-coach-green">Owned</span>
        {dripLabel ? (
          <span className="font-body text-xs text-coach-t3" data-testid="package-drip-schedule">
            Drips every {dripLabel}
          </span>
        ) : null}
      </div>

      <div className="mb-1.5 flex justify-between">
        <span className="font-body text-xs text-coach-t2">Progress</span>
        <span
          className={`font-mono text-xs ${view.completionPercent === 100 ? 'text-coach-green' : 'text-coach-orange'}`}
          data-testid="package-progress-percent"
        >
          {view.completedModules}/{view.totalModules} · {view.completionPercent}%
        </span>
      </div>
      <div className="h-2 rounded bg-coach-border" data-testid="package-progress-bar">
        <div
          className="h-full rounded"
          style={{ width: `${view.completionPercent}%`, backgroundColor: barColor }}
        />
      </div>

      {nextUnlockLabel ? (
        <div className="mt-2 font-body text-xs text-coach-t3" data-testid="package-next-unlock">
          Next unlock: {nextUnlockLabel}
        </div>
      ) : view.allUnlocked ? (
        <div className="mt-2 font-body text-xs text-coach-green" data-testid="package-all-unlocked">
          All modules unlocked
        </div>
      ) : null}

      <div className="mt-4" data-testid="package-module-list">
        {view.modules.map((module) => {
          const lockLabel = moduleLockLabel(module.lock);
          const unlocked = module.lock.kind === 'unlocked';
          return (
            <Card key={module.moduleId} className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  module.completed
                    ? 'bg-coach-green/15 text-coach-green'
                    : unlocked
                      ? 'bg-coach-orange-glow text-coach-orange'
                      : 'bg-coach-border text-coach-t3'
                }`}
              >
                {module.completed ? <IconCheckSmall /> : unlocked ? module.moduleIndex + 1 : <IconLockSmall />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-body text-[13px] font-semibold text-coach-t1">
                  {moduleTitle(module.moduleId, module.moduleIndex)}
                </div>
                {lockLabel ? (
                  <div className="font-body text-[11px] text-coach-t3" data-testid="module-lock-label">
                    {lockLabel}
                  </div>
                ) : module.completed ? (
                  <div className="font-body text-[11px] text-coach-green">Completed</div>
                ) : (
                  <div className="font-body text-[11px] text-coach-t3">Unlocked</div>
                )}
              </div>
              {unlocked && !module.completed ? (
                <button
                  type="button"
                  data-testid="module-mark-complete"
                  disabled={busyModuleId === module.moduleId}
                  onClick={() => void markComplete(module.moduleId)}
                  className="shrink-0 cursor-pointer rounded-lg border border-coach-border bg-transparent px-2.5 py-1.5 font-body text-[11px] font-semibold text-coach-orange disabled:opacity-50"
                >
                  {busyModuleId === module.moduleId ? 'Saving…' : 'Mark done'}
                </button>
              ) : null}
            </Card>
          );
        })}
      </div>

      {error ? <div className="mt-2 font-body text-xs text-coach-red">{error}</div> : null}
    </div>
  );
}
