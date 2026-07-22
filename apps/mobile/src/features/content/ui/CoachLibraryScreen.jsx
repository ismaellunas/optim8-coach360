import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import {
  buildMuxHlsUrl,
  buildSessionPrefillFromLibraryItem,
  createCoachPackageInputSchema,
  mapContentError,
} from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { SessionVideoPlayer } from '@/features/session/ui/SessionVideoPlayer.jsx';
import {
  Button as Btn,
  Card,
  Field,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

/**
 * Coach personal library — created content appears here immediately (STORY-9.2 AC-4).
 */
export function CoachLibraryScreen({
  onBack,
  onAttachToSession,
  onDistribute,
  highlightId = null,
  seedPackageItemId = null,
}) {
  const repos = useRepositories();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(() =>
    seedPackageItemId ? { [seedPackageItemId]: true } : {},
  );
  const [packageTitle, setPackageTitle] = useState('');
  const [savingPackage, setSavingPackage] = useState(false);
  const [packageMessage, setPackageMessage] = useState(null);

  const load = useCallback(
    async function () {
      if (!userId) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const rows = await repos.library.listCoachLibrary(userId);
        setItems(rows ?? []);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'library_load_failed');
      } finally {
        setLoading(false);
      }
    },
    [repos.library, userId],
  );

  useEffect(
    function () {
      load();
    },
    [load],
  );

  function toggleSelect(id) {
    setSelected(function (prev) {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }

  async function handleCreatePackage() {
    if (!userId) {
      return;
    }
    setSavingPackage(true);
    setPackageMessage(null);
    setError(null);
    try {
      const itemIds = Object.keys(selected).filter(function (id) {
        const row = items.find((entry) => entry.id === id);
        return row && row.kind !== 'package';
      });
      const input = createCoachPackageInputSchema.parse({
        title: packageTitle,
        itemIds,
      });
      const created = await repos.library.createPackage(userId, input);
      setPackageMessage(`Package “${created.title}” saved to library`);
      setPackageTitle('');
      setSelected({});
      await load();
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : 'library_package_failed';
      setError(mapContentError(raw));
    } finally {
      setSavingPackage(false);
    }
  }

  const selectedCount = Object.keys(selected).length;

  return (
    <ScreenContainer>
      <PageHeader title="MY LIBRARY" onBack={onBack} />
      <p className="mb-3 font-body text-[13px] text-coach-t2">
        Content you create appears here right away. Select items to build a package, or attach one to
        a session.
      </p>

      {loading ? (
        <div className="font-body text-sm text-coach-t3">Loading library…</div>
      ) : null}

      {error ? (
        <p className="mb-3 font-body text-sm text-coach-red" data-testid="coach-library-error">
          {error}
        </p>
      ) : null}

      {packageMessage ? (
        <p className="mb-3 font-body text-sm text-coach-green" data-testid="coach-library-package-ok">
          {packageMessage}
        </p>
      ) : null}

      <div data-testid="coach-library-list">
        {items.map(function (item) {
          const highlighted = highlightId === item.id;
          const checked = Boolean(selected[item.id]);
          return (
            <Card
              key={item.id}
              data-testid={`coach-library-item-${item.id}`}
              className={highlighted ? 'border-coach-orange' : ''}
            >
              <div className="flex items-start gap-3">
                {item.kind !== 'package' ? (
                  <input
                    type="checkbox"
                    checked={checked}
                    data-testid={`coach-library-select-${item.id}`}
                    onChange={function () {
                      toggleSelect(item.id);
                    }}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 w-4" />
                )}
                <div className="flex-1">
                  <div className="font-display text-base font-semibold text-coach-t1">{item.title}</div>
                  <div className="font-body text-[11px] uppercase text-coach-t3">
                    {item.kind}
                    {item.transcodeStatus === 'pending' ? ' · mux pending' : ''}
                    {item.transcodeStatus === 'ready' ? ' · ready' : ''}
                    {item.transcodeStatus === 'error' ? ' · mux error' : ''}
                    {item.kind === 'package' && item.itemIds?.length
                      ? ` · ${item.itemIds.length} items`
                      : ''}
                  </div>
                  {item.instructions ? (
                    <div className="mt-1 font-body text-[12px] text-coach-t2 line-clamp-2">
                      {item.instructions}
                    </div>
                  ) : null}
                  {item.kind === 'video' && item.transcodeStatus === 'ready' ? (
                    <div className="mt-2" data-testid={`coach-library-video-${item.id}`}>
                      <SessionVideoPlayer
                        src={
                          item.mediaUrl ||
                          (item.muxPlaybackId ? buildMuxHlsUrl(item.muxPlaybackId) : null)
                        }
                        title={item.title}
                      />
                    </div>
                  ) : null}
                  {item.kind === 'video' && item.transcodeStatus === 'error' ? (
                    <div
                      className="mt-2 font-body text-[12px] text-coach-red"
                      data-testid={`coach-library-video-error-${item.id}`}
                    >
                      Video processing failed. Try uploading again.
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Btn
                    small
                    data-testid={`coach-library-distribute-${item.id}`}
                    onClick={function () {
                      onDistribute?.(item);
                    }}
                  >
                    Distribute
                  </Btn>
                  <Btn
                    small
                    data-testid={`coach-library-attach-${item.id}`}
                    onClick={function () {
                      onAttachToSession?.(buildSessionPrefillFromLibraryItem(item));
                    }}
                  >
                    Session
                  </Btn>
                </div>
              </div>
            </Card>
          );
        })}
        {!loading && items.length === 0 ? (
          <div className="font-body text-sm text-coach-t3">No library items yet.</div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-coach-border pt-4" data-testid="coach-library-package-form">
        <div className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-coach-t1">
          Bundle into package
        </div>
        <Field
          label="Package title"
          id="package-title"
          placeholder="e.g. Weekend Practice Pack"
          value={packageTitle}
          onChange={function (e) {
            setPackageTitle(e.target.value);
          }}
        />
        <Btn
          primary
          full
          disabled={savingPackage || selectedCount === 0}
          data-testid="coach-library-create-package"
          onClick={handleCreatePackage}
        >
          {savingPackage
            ? 'Saving…'
            : selectedCount
              ? `Create package (${selectedCount})`
              : 'Select items above'}
        </Btn>
      </div>
    </ScreenContainer>
  );
}
