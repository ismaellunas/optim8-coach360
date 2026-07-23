import { useCallback, useEffect, useState } from 'react';
import { useRepositories } from '@coach360/api';
import { buildMuxHlsUrl, mapContentError } from '@coach360/domain';
import { useAuth } from '@/features/auth/model/use-auth.js';
import { SessionVideoPlayer } from '@/features/session/ui/SessionVideoPlayer.jsx';
import {
  Badge,
  Button as Btn,
  Card,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

const COLORS = {
  orange: '#FF6B35',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  yellow: '#EAB308',
  green: '#22C55E',
};

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L9 12l-7 1 5 5-1 6 6-3 6 3-1-6 5-5-7-1z" />
    </svg>
  );
}

function PackageThumb({ tag, color, size }) {
  const s = size || 'card';
  return (
    <div
      className={`relative overflow-hidden ${s === 'full' ? 'h-40 w-full rounded-[14px]' : 'h-24 w-full rounded-xl'}`}
      style={{ background: `linear-gradient(135deg, ${color}55, ${color}22)` }}
    >
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to top, ${color}cc, ${color}33)` }}
      />
      {s === 'full' ? (
        <div className="absolute bottom-2.5 left-3 font-display text-[11px] font-semibold uppercase tracking-widest text-white/80">
          {tag}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Player content tab — assigned Path A items + marketplace browse (STORY-9.4 AC-3).
 */
export function PlayerContentScreen({ user, tryA, canAccess, accessLevel }) {
  const repos = useRepositories();
  const { session } = useAuth();
  const playerId = session?.user?.id ?? null;

  const [assigned, setAssigned] = useState([]);
  const [assignedLoading, setAssignedLoading] = useState(true);
  const [assignedError, setAssignedError] = useState(null);

  const [fil, setFil] = useState('all');
  const [viewing, setViewing] = useState(null);
  const [viewingAssigned, setViewingAssigned] = useState(null);
  const [pkgs, setPkgs] = useState([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const filters = ['all', 'shooting', 'defense', 'conditioning'];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rows, owned] = await Promise.all([
          repos.marketplaceCatalog.listPublished(),
          repos.marketplacePurchases.listOwned().catch(() => []),
        ]);
        if (cancelled) return;
        const ownedIds = new Set((owned || []).map((p) => p.sanityDocumentId));
        setPkgs(
          (rows || []).map((row, index) => ({
            id: row.id,
            t: row.title,
            l: row.moduleCount || 0,
            p: row.priceLabel || 'See details',
            tag: row.tag || 'training',
            skills: Array.isArray(row.skills) ? row.skills : [],
            rating: typeof row.rating === 'number' ? row.rating : null,
            own: ownedIds.has(row.id),
            c: COLORS[['orange', 'blue', 'purple', 'yellow'][index % 4]] || COLORS.orange,
            description: row.description,
            pr: 0,
          })),
        );
      } catch {
        if (!cancelled) setPkgs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repos.marketplaceCatalog, repos.marketplacePurchases]);

  const filtered = fil === 'all' ? pkgs : pkgs.filter((p) => p.tag === fil);

  async function startPersonalCheckout(pkg) {
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const result = await repos.marketplacePurchases.createCheckoutSession({
        sanityDocumentId: pkg.id,
        scope: 'personal',
        successUrl: `${origin}/?checkout=success&kind=package`,
        cancelUrl: `${origin}/?checkout=cancel&kind=package`,
      });
      if (typeof window !== 'undefined' && result.url) {
        window.location.assign(result.url);
      }
    } catch (cause) {
      setCheckoutError(cause instanceof Error ? cause.message : 'checkout_failed');
    } finally {
      setCheckoutBusy(false);
    }
  }

  const loadAssigned = useCallback(
    async function () {
      if (!playerId) {
        setAssigned([]);
        setAssignedLoading(false);
        return;
      }
      setAssignedLoading(true);
      setAssignedError(null);
      try {
        const rows = await repos.contentAssignments.listAssignedForPlayer(playerId);
        setAssigned(rows ?? []);
      } catch (cause) {
        const raw = cause instanceof Error ? cause.message : 'content_assign_load_failed';
        setAssignedError(mapContentError(raw));
      } finally {
        setAssignedLoading(false);
      }
    },
    [playerId, repos.contentAssignments],
  );

  useEffect(
    function () {
      loadAssigned();
    },
    [loadAssigned],
  );

  if (viewingAssigned) {
    return (
      <AssignedContentDetail
        item={viewingAssigned}
        onBack={function () {
          setViewingAssigned(null);
        }}
      />
    );
  }

  if (viewing) {
    const pk = pkgs.find((x) => x.id === viewing);
    return (
      <ScreenContainer data-testid="marketplace-package-detail">
        <PageHeader title="PACKAGE" onBack={function () { setViewing(null); }} />
        <div className="mb-4">
          <PackageThumb tag={pk.tag} color={pk.c} size="full" />
        </div>
        <Badge color={pk.c}>{pk.tag}</Badge>
        <div className="mt-3 font-display text-2xl font-bold text-coach-t1">{pk.t}</div>
        {pk.rating != null ? (
          <div className="mt-1 font-body text-sm text-coach-t2" data-testid="package-rating">
            ★ {pk.rating.toFixed(1)}
          </div>
        ) : null}
        {pk.skills && pk.skills.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5" data-testid="package-skills">
            {pk.skills.map(function (skill) {
              return (
                <Badge key={skill} color={pk.c}>
                  {skill}
                </Badge>
              );
            })}
          </div>
        ) : null}
        {pk.description ? (
          <div className="mt-2 font-body text-[13px] text-coach-t2">{pk.description}</div>
        ) : null}
        <div className="mt-2 font-body text-[13px] text-coach-t3">
          {pk.l + ' lessons'}
        </div>
        {/* OQ-4.6: no outline or drip schedule preview before purchase */}
        {pk.own ? (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between">
              <span className="font-body text-xs text-coach-t2">Progress</span>
              <span
                className={`font-mono text-xs ${pk.pr === 100 ? 'text-coach-green' : 'text-coach-orange'}`}
              >
                {pk.pr + '%'}
              </span>
            </div>
            <div className="h-2 rounded bg-coach-border">
              <div
                className="h-full rounded"
                style={{
                  width: pk.pr + '%',
                  backgroundColor: pk.pr === 100 ? COLORS.green : COLORS.orange,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            {checkoutError ? (
              <div className="mb-3 font-body text-xs text-coach-red">{checkoutError}</div>
            ) : null}
            <Btn
              primary
              full
              disabled={checkoutBusy}
              onClick={function () {
                tryA('purchase', function () {
                  void startPersonalCheckout(pk);
                });
              }}
            >
              {checkoutBusy
                ? 'Starting checkout…'
                : pk.p === 'FREE'
                  ? 'Get Free'
                  : 'Purchase ' + pk.p}
            </Btn>
          </div>
        )}
      </ScreenContainer>
    );
  }

  const browseLevel = accessLevel(user, 'browseMarketplace');
  if (browseLevel === 'none') {
    return (
      <ScreenContainer data-testid="player-content-tab">
        <PageHeader title="CONTENT" user={user} />
        <AssignedSection
          assigned={assigned}
          loading={assignedLoading}
          error={assignedError}
          onOpen={setViewingAssigned}
        />
        <div className="py-[60px] text-center">
          <div className="mb-3 text-coach-t3">
            <IconLock />
          </div>
          <div className="mb-2 font-display text-lg font-bold text-coach-t1">Marketplace locked</div>
          <div className="mb-4 font-body text-[13px] text-coach-t3">
            Upgrade to browse training packages.
          </div>
          <Btn
            primary
            onClick={function () {
              tryA('browseMarketplace', function () {});
            }}
          >
            Upgrade
          </Btn>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer data-testid="player-content-tab">
      <PageHeader title="CONTENT" user={user} />

      <AssignedSection
        assigned={assigned}
        loading={assignedLoading}
        error={assignedError}
        onOpen={setViewingAssigned}
      />

      <div className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-coach-t3">
        Marketplace
      </div>

      {browseLevel === 'readonly' ? (
        <Card className="mb-3 border border-coach-orange/20 bg-coach-orange-glow/40">
          <div className="font-body text-[13px] font-semibold text-coach-t1">Browse only</div>
          <div className="font-body text-xs text-coach-t2">
            Trial preview — purchase unlocks on a paid plan.
          </div>
        </Card>
      ) : null}

      {canAccess(user, 'ai') ? (
        <Card className="flex items-center gap-3 border border-coach-orange/20 bg-gradient-to-br from-coach-orange-glow to-coach-purple/10">
          <div className="text-coach-orange">
            <IconSpark />
          </div>
          <div>
            <div className="font-body text-[13px] font-semibold text-coach-t1">AI Recommended</div>
            <div className="font-body text-xs text-coach-t2">Based on your objectives</div>
          </div>
        </Card>
      ) : null}

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {filters.map(function (f) {
          return (
            <button
              key={f}
              type="button"
              onClick={function () {
                setFil(f);
              }}
              className={`cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-2 font-body text-xs font-semibold capitalize ${
                fil === f
                  ? 'border-coach-orange bg-coach-orange-glow text-coach-orange'
                  : 'border-coach-border bg-transparent text-coach-t3'
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {filtered.map(function (p) {
        return (
          <Card
            key={p.id}
            onClick={function () {
              setViewing(p.id);
            }}
            className="relative overflow-hidden p-0"
            data-testid="marketplace-package-card"
          >
            <PackageThumb tag={p.tag} color={p.c} size="full" />
            <div
              className={`absolute right-3.5 top-3.5 ${p.own ? 'text-coach-green' : 'text-coach-t3'}`}
            >
              {p.own ? <IconCheck /> : <IconLock />}
            </div>
            <div className="px-4 pb-4 pt-3">
              <div className="flex flex-wrap gap-1.5">
                {p.skills && p.skills.length > 0
                  ? p.skills.slice(0, 3).map(function (skill) {
                      return (
                        <Badge key={skill} color={p.c}>
                          {skill}
                        </Badge>
                      );
                    })
                  : (
                    <Badge color={p.c}>{p.tag}</Badge>
                  )}
              </div>
              <div className="my-2 pr-7 font-display text-[17px] font-bold text-coach-t1">{p.t}</div>
              <div className="flex items-center justify-between">
                <span className="font-body text-xs text-coach-t3">
                  {p.rating != null ? `★ ${p.rating.toFixed(1)} · ` : ''}
                  {p.l + ' lessons'}
                </span>
                <span
                  className={`font-display text-lg font-bold ${
                    p.p === 'FREE' && !p.own ? 'text-coach-green' : 'text-coach-t1'
                  }`}
                  data-testid="package-price"
                >
                  {p.own ? 'Owned' : p.p}
                </span>
              </div>
              {p.own && p.pr > 0 && p.pr < 100 ? (
                <div className="mt-2.5 h-1 rounded-sm bg-coach-border">
                  <div
                    className="h-full rounded-sm bg-coach-orange"
                    style={{ width: p.pr + '%' }}
                  />
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}
      <div className="h-6" />
    </ScreenContainer>
  );
}

function AssignedSection({ assigned, loading, error, onOpen }) {
  return (
    <div className="mb-5" data-testid="player-content-assigned">
      <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-coach-t3">
        Assigned to you
      </p>
      {loading ? (
        <div className="font-body text-sm text-coach-t3">Loading assigned content…</div>
      ) : null}
      {error ? (
        <p className="mb-2 font-body text-sm text-coach-red" data-testid="player-content-assigned-error">
          {error}
        </p>
      ) : null}
      {!loading && assigned.length === 0 ? (
        <div className="font-body text-sm text-coach-t3" data-testid="player-content-assigned-empty">
          No content assigned yet.
        </div>
      ) : null}
      {assigned.map(function (item) {
        return (
          <Card
            key={item.id}
            data-testid={`player-content-assigned-item-${item.id}`}
            onClick={function () {
              onOpen?.(item);
            }}
          >
            <div className="font-display text-base font-semibold text-coach-green">{item.title}</div>
            <div className="mt-1 font-body text-xs text-coach-t3">
              From {item.coachDisplayName || 'Coach'} · {item.kind} · assigned · tap to open
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function AssignedContentDetail({ item, onBack }) {
  const muxReady = item.kind === 'video' && item.transcodeStatus === 'ready' && item.muxPlaybackId;
  const videoSrc =
    item.kind === 'video'
      ? muxReady
        ? buildMuxHlsUrl(item.muxPlaybackId)
        : item.mediaUrl || null
      : null;
  const imageMedia =
    item.kind !== 'video' && item.mediaUrl ? item.mediaUrl : null;

  return (
    <ScreenContainer data-testid="player-content-assigned-detail">
      <PageHeader title="ASSIGNED" onBack={onBack} />
      <div className="mb-1 font-body text-[11px] uppercase text-coach-t3">{item.kind}</div>
      <div className="mb-2 font-display text-2xl font-bold text-coach-t1">{item.title}</div>
      <div className="mb-4 font-body text-xs text-coach-t3">
        From {item.coachDisplayName || 'Coach'}
      </div>

      {item.instructions ? (
        <Card className="mb-3" data-testid="player-content-assigned-instructions">
          <div className="mb-1.5 font-display text-xs font-semibold uppercase tracking-wider text-coach-t3">
            Instructions
          </div>
          <p className="whitespace-pre-wrap font-body text-sm text-coach-t1">{item.instructions}</p>
        </Card>
      ) : null}

      {item.kind === 'video' ? (
        <div className="mb-3" data-testid="player-content-assigned-video">
          {videoSrc ? (
            <SessionVideoPlayer src={videoSrc} title={item.title} />
          ) : item.transcodeStatus === 'pending' ? (
            <Card>
              <p className="font-body text-sm text-coach-t2">Video is still processing. Check back soon.</p>
            </Card>
          ) : (
            <Card>
              <p className="font-body text-sm text-coach-t2">Video is not available to play yet.</p>
            </Card>
          )}
        </div>
      ) : null}

      {imageMedia ? (
        <div className="mb-3 overflow-hidden rounded-[14px]" data-testid="player-content-assigned-media">
          <img src={imageMedia} alt="" className="max-h-64 w-full object-contain" />
        </div>
      ) : null}

      {item.kind === 'package' ? (
        <div data-testid="player-content-assigned-package">
          <div className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-coach-t3">
            Package items
          </div>
          {(item.packageItems || []).length === 0 ? (
            <p className="font-body text-sm text-coach-t3">No items listed in this package.</p>
          ) : (
            (item.packageItems || []).map(function (child) {
              return (
                <Card key={child.id}>
                  <div className="font-display text-base font-semibold text-coach-t1">{child.title}</div>
                  <div className="mt-1 font-body text-[11px] uppercase text-coach-t3">{child.kind}</div>
                </Card>
              );
            })
          )}
        </div>
      ) : null}

      {!item.instructions && item.kind !== 'video' && item.kind !== 'package' && !imageMedia ? (
        <Card>
          <p className="font-body text-sm text-coach-t2">No additional details were saved for this item.</p>
        </Card>
      ) : null}
    </ScreenContainer>
  );
}
