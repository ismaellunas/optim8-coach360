import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepositories } from '@coach360/api';
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

const TAG_COLORS = {
  shooting: COLORS.orange,
  defense: COLORS.blue,
  conditioning: COLORS.purple,
  training: COLORS.yellow,
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

function colorForTag(tag) {
  return TAG_COLORS[tag] || COLORS.yellow;
}

/**
 * Coach/manager marketplace store — published packages from Sanity CDN/API (STORY-9.5).
 */
export function StoreScreen({ user, tryA, canAccess, accessLevel }) {
  const repos = useRepositories();
  const [fil, setFil] = useState('all');
  const [viewing, setViewing] = useState(null);
  const [pkgs, setPkgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filters = useMemo(() => {
    const tags = new Set(['all']);
    for (const pkg of pkgs) {
      if (pkg.tag) tags.add(pkg.tag);
    }
    return Array.from(tags);
  }, [pkgs]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await repos.marketplaceCatalog.listPublished();
      setPkgs(
        (rows || []).map((row) => ({
          id: row.id,
          t: row.title,
          l: row.moduleCount || 0,
          p: row.priceLabel || 'See details',
          tag: row.tag || 'training',
          own: false,
          c: colorForTag(row.tag),
          dr: row.dripLabel || 'Scheduled drip',
          pr: 0,
          description: row.description,
        })),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'catalog_load_failed');
      setPkgs([]);
    } finally {
      setLoading(false);
    }
  }, [repos.marketplaceCatalog]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const filtered = fil === 'all' ? pkgs : pkgs.filter((p) => p.tag === fil);
  const browseLevel = accessLevel(user, 'browseMarketplace');

  if (viewing) {
    const pk = pkgs.find((x) => x.id === viewing);
    if (!pk) {
      return null;
    }
    return (
      <ScreenContainer>
        <PageHeader title="PACKAGE" onBack={() => setViewing(null)} />
        <div className="mb-4">
          <PackageThumb tag={pk.tag} color={pk.c} size="full" />
        </div>
        <Badge color={pk.c}>{pk.tag}</Badge>
        <div className="mt-3 font-display text-2xl font-bold text-coach-t1">{pk.t}</div>
        {pk.description ? (
          <div className="mt-2 font-body text-[13px] text-coach-t2">{pk.description}</div>
        ) : null}
        <div className="mt-2 font-body text-[13px] text-coach-t3">
          {pk.l + ' modules · Drip: ' + pk.dr}
        </div>
        {!pk.own ? (
          <div className="mt-5">
            <Btn
              primary
              full
              onClick={() => {
                tryA('purchase', () => setViewing(null));
              }}
            >
              {pk.p === 'FREE' ? 'Get Free' : 'Purchase ' + pk.p}
            </Btn>
          </div>
        ) : null}
      </ScreenContainer>
    );
  }

  if (browseLevel === 'none') {
    return (
      <ScreenContainer>
        <PageHeader title="STORE" user={user} />
        <div className="py-[60px] text-center">
          <div className="mb-3 text-coach-t3">
            <IconLock />
          </div>
          <div className="mb-2 font-display text-lg font-bold text-coach-t1">Marketplace locked</div>
          <div className="mb-4 font-body text-[13px] text-coach-t3">
            Upgrade to browse training packages.
          </div>
          <Btn primary onClick={() => tryA('browseMarketplace', () => {})}>
            Upgrade
          </Btn>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader title="STORE" user={user} />
      {browseLevel === 'readonly' ? (
        <Card className="mb-3 border border-coach-orange/20 bg-coach-orange-glow/40">
          <div className="font-body text-[13px] font-semibold text-coach-t1">Browse only</div>
          <div className="font-body text-xs text-coach-t2">
            Trial preview — purchase unlocks on a paid plan.
          </div>
        </Card>
      ) : null}
      {canAccess(user, 'ai') ? (
        <Card className="mb-3 flex items-center gap-3 border border-coach-orange/20 bg-gradient-to-br from-coach-orange-glow to-coach-purple/10">
          <div className="text-coach-orange">
            <IconSpark />
          </div>
          <div>
            <div className="font-body text-[13px] font-semibold text-coach-t1">AI Recommended</div>
            <div className="font-body text-xs text-coach-t2">Based on your objectives</div>
          </div>
        </Card>
      ) : null}
      {loading ? (
        <div className="py-8 text-center font-body text-sm text-coach-t3">Loading catalog…</div>
      ) : null}
      {error ? (
        <Card className="mb-3 border border-coach-orange/30">
          <div className="font-body text-[13px] text-coach-t1">Could not load Sanity catalog</div>
          <div className="mt-1 font-body text-xs text-coach-t3">{error}</div>
          <Btn className="mt-3" onClick={() => void loadCatalog()}>
            Retry
          </Btn>
        </Card>
      ) : null}
      {!loading && !error && pkgs.length === 0 ? (
        <div className="py-8 text-center font-body text-sm text-coach-t3">
          No published packages yet.
        </div>
      ) : null}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFil(f)}
            className={`cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-2 font-body text-xs font-semibold capitalize ${
              fil === f
                ? 'border-coach-orange bg-coach-orange-glow text-coach-orange'
                : 'border-coach-border bg-transparent text-coach-t3'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {filtered.map((p) => (
        <Card
          key={p.id}
          onClick={() => setViewing(p.id)}
          className="relative mb-3 overflow-hidden p-0"
        >
          <PackageThumb tag={p.tag} color={p.c} size="full" />
          <div className={`absolute right-3.5 top-3.5 ${p.own ? 'text-coach-green' : 'text-coach-t3'}`}>
            {p.own ? <IconCheck /> : <IconLock />}
          </div>
          <div className="px-4 pb-4 pt-3">
            <Badge color={p.c}>{p.tag}</Badge>
            <div className="my-2 pr-7 font-display text-[17px] font-bold text-coach-t1">{p.t}</div>
            <div className="flex items-center justify-between">
              <span className="font-body text-xs text-coach-t3">{p.l + ' modules'}</span>
              <span
                className={`font-display text-lg font-bold ${
                  p.p === 'FREE' && !p.own ? 'text-coach-green' : 'text-coach-t1'
                }`}
              >
                {p.own ? 'Owned' : p.p}
              </span>
            </div>
          </div>
        </Card>
      ))}
      <div className="h-6" />
    </ScreenContainer>
  );
}
