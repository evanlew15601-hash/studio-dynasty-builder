import React, { useMemo, useState } from 'react';
import type { Project } from '@/types/game';
import type { PlayerPlatformBranding } from '@/types/platformEconomy';
import { stableInt } from '@/utils/stableRandom';
import { Flame, Home, Search, UserCircle } from 'lucide-react';
import { StudioIconRenderer, DEFAULT_ICON, ICON_COLORS, ACCENT_COLORS, type StudioIconConfig } from './StudioIconCustomizer';
import './streamingPlatformPreview.css';

function resolveHsl(colorId: string | undefined, palette: readonly { id: string; hsl: string }[], fallback: string): string {
  if (!colorId) return fallback;
  return palette.find((c) => c.id === colorId)?.hsl ?? fallback;
}

function titleInitials(title: string): string {
  const parts = title
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return 'TV';
  return parts.map((p) => p[0]?.toUpperCase()).join('').slice(0, 2);
}

function tileGradient(projectId: string, primaryHsl: string, accentHsl: string): string {
  const hueDrift = stableInt(`platform-tile:${projectId}:hue`, -22, 22);
  const satDrift = stableInt(`platform-tile:${projectId}:sat`, -6, 10);

  const primaryHue = Number.parseInt(primaryHsl.split(' ')[0] || '42', 10);
  const accentHue = Number.parseInt(accentHsl.split(' ')[0] || '0', 10);

  const aSat = Math.min(100, Math.max(30, 88 + satDrift));
  const bSat = Math.min(100, Math.max(18, 60 - satDrift));

  const a = `${(primaryHue + hueDrift + 360) % 360} ${aSat}% 48%`;
  const b = `${(accentHue - hueDrift + 360) % 360} ${bSat}% 32%`;

  return `linear-gradient(135deg, hsl(${a} / 0.90), hsl(${b} / 0.75), hsl(${primaryHsl} / 0.18))`;
}

type LayoutMode = 'default' | 'mass' | 'prestige';

type ContinueCard = {
  project: Project;
  progressPct: number;
};

type RankedProject = {
  project: Project;
  score: number;
};

function deriveContinueWatching(projects: Project[], seed: string): ContinueCard[] {
  return projects.slice(0, 8).map((project, idx) => {
    const pct = stableInt(`${seed}|p:${project.id}|${idx}`, 8, 94);
    return { project, progressPct: pct };
  });
}

function deriveCuratedRow(projects: Project[], seed: string, max: number): Project[] {
  const ranked: RankedProject[] = projects.map((project) => ({
    project,
    score: stableInt(`${seed}|${project.id}`, 0, 1_000_000),
  }));

  ranked.sort((a, b) => (b.score - a.score) || a.project.title.localeCompare(b.project.title));

  return ranked.slice(0, max).map((x) => x.project);
}

const Row: React.FC<{
  title: string;
  subtitle?: string;
  items: Project[];
  platformId: string | null;
  primaryHsl: string;
  accentHsl: string;
  layout: LayoutMode;
  showRank?: boolean;
  onSelectTitle: (project: Project) => void;
}> = ({ title, subtitle, items, platformId, primaryHsl, accentHsl, layout, showRank, onSelectTitle }) => {
  const rowClass = layout === 'mass' ? 'sp-row sp-row--mass' : layout === 'prestige' ? 'sp-row sp-row--prestige' : 'sp-row';
  const listClass =
    layout === 'mass' ? 'sp-row-list sp-row-list--mass' : layout === 'prestige' ? 'sp-row-list sp-row-list--prestige' : 'sp-row-list';

  return (
    <section className={rowClass}>
      <div className="sp-row-head">
        <div className="sp-row-title">{title}</div>
        <div className="sp-row-sub">{subtitle ?? 'Tap a tile for details'}</div>
      </div>

      <div className={listClass}>
        {items.map((p, idx) => {
          const initials = titleInitials(p.title);
          const isOriginal = !!platformId && p.streamingContract?.platformId === platformId;

          return (
            <button
              key={p.id}
              type="button"
              className={layout === 'mass' ? 'sp-tile sp-tile--mass' : layout === 'prestige' ? 'sp-tile sp-tile--prestige' : 'sp-tile'}
              onClick={() => onSelectTitle(p)}
            >
              <div
                className={layout === 'mass' ? 'sp-poster sp-poster--mass' : layout === 'prestige' ? 'sp-poster sp-poster--prestige' : 'sp-poster'}
                style={{ backgroundImage: tileGradient(p.id, primaryHsl, accentHsl) }}
              >
                {layout !== 'mass' && showRank && idx < 10 && (
                  <div className="sp-poster-rank">#{idx + 1}</div>
                )}
                {isOriginal && <div className="sp-poster-tag">Original</div>}
                <div className="sp-poster-initials">{initials}</div>
              </div>
              <div className="sp-tile-title">{p.title}</div>
              <div className="sp-tile-meta">{p.script?.genre ?? 'Unknown'}</div>
            </button>
          );
        })}

        {items.length === 0 && (
          <div className="sp-pill" style={{ marginLeft: 2 }}>
            No titles available
          </div>
        )}
      </div>
    </section>
  );
};

export const StreamingPlatformPreview: React.FC<{
  platformId: string | null;
  platformName: string;
  vibe?: string;
  branding?: PlayerPlatformBranding;
  heroTitle: Project | null;
  topTen: Project[];
  newArrivals: Project[];
  originals: Project[];
  onSelectTitle: (project: Project) => void;
> = ({ platformId, platformName, vibe, branding, heroTitle, topTen, newArrivals, originals, onSelectTitle }) => {
  const [activeNav, setActiveNav] = useState<'home' | 'originals' | 'new'>('home');
  const [massView, setMassView] = useState<'browse' | 'search' | 'newhot'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [newHotTab, setNewHotTab] = useState<'coming' | 'watching'>('watching');

  const resolved = useMemo(() => {
    const primaryHsl = resolveHsl(branding?.primaryColor, ICON_COLORS, '42 88% 68%');
    const accentHsl = resolveHsl(branding?.accentColor, ACCENT_COLORS, '0 0% 95%');

    const logo = (branding?.logo as StudioIconConfig | undefined) ?? DEFAULT_ICON;

    const overlay = branding?.overlay ?? 'spotlight';

    return { primaryHsl, accentHsl, logo, overlay };
  }, [branding]);

  const layout: LayoutMode = useMemo(() => {
    const requested = branding?.layout;
    if (requested === 'mass') return 'mass';
    if (requested === 'prestige') return 'prestige';
    if (requested === 'default') return 'default';

    if (vibe === 'mass') return 'mass';
    if (!vibe || vibe === 'prestige') return 'prestige';
    return 'default';
  }, [branding?.layout, vibe]);

  const catalogPool = useMemo(() => {
    const all = [...topTen, ...newArrivals, ...originals];
    const seen = new Set<string>();

    return all.filter((p) => {
      if (!p?.id) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [newArrivals, originals, topTen]);

  const continuePool = useMemo(() => {
    const pool = topTen.length > 0 ? topTen : newArrivals.length > 0 ? newArrivals : originals;
    return pool;
  }, [newArrivals, originals, topTen]);

  const continueWatching = useMemo(() => {
    return deriveContinueWatching(continuePool, `continue|${platformName}|${layout}`);
  }, [continuePool, layout, platformName]);

  const myList = useMemo(() => {
    return deriveCuratedRow(catalogPool, `mylist|${platformName}|${layout}`, 14);
  }, [catalogPool, layout, platformName]);

  const becauseYouWatched = useMemo(() => {
    const seed = `because|${platformName}|${layout}`;
    const anchor = catalogPool.length > 0 ? catalogPool[stableInt(`${seed}|anchor`, 0, Math.max(0, catalogPool.length - 1))] : null;
    if (!anchor) return [] as Project[];

    const genre = anchor.script?.genre;
    const eligible = catalogPool.filter((p) => p.id !== anchor.id && (genre ? p.script?.genre === genre : true));

    return deriveCuratedRow(eligible.length > 0 ? eligible : catalogPool.filter((p) => p.id !== anchor.id), `${seed}|${genre ?? 'all'}`, 12);
  }, [catalogPool, layout, platformName]);

  const prestigePicks = useMemo(() => {
    return deriveCuratedRow(catalogPool, `prestige:picks|${platformName}`, 12);
  }, [catalogPool, platformName]);

  const prestigeAwardContenders = useMemo(() => {
    return catalogPool
      .slice()
      .sort((a, b) => (b.script?.quality ?? 0) - (a.script?.quality ?? 0) || a.title.localeCompare(b.title))
      .slice(0, 12);
  }, [catalogPool]);

  const prestigeOriginals = useMemo(() => {
    return deriveCuratedRow(originals, `prestige:originals|${platformName}`, 14);
  }, [originals, platformName]);

  const prestigeSeries = useMemo(() => {
    const pool = catalogPool.filter((p) => p.type === 'series' || p.type === 'limited-series');
    return deriveCuratedRow(pool.length > 0 ? pool : catalogPool, `prestige:series|${platformName}`, 14);
  }, [catalogPool, platformName]);

  const prestigeLimitedSeries = useMemo(() => {
    const pool = catalogPool.filter((p) => p.type === 'limited-series');
    return deriveCuratedRow(pool.length > 0 ? pool : prestigeSeries, `prestige:limited|${platformName}`, 10);
  }, [catalogPool, platformName, prestigeSeries]);

  const prestigeMovies = useMemo(() => {
    const pool = catalogPool.filter((p) => p.type === 'feature');
    return deriveCuratedRow(pool.length > 0 ? pool : catalogPool, `prestige:movies|${platformName}`, 14);
  }, [catalogPool, platformName]);

  const prestigePremieres = useMemo(() => {
    const blended = [...newArrivals, ...topTen];
    return deriveCuratedRow(blended, `prestige:premieres|${platformName}`, 12);
  }, [newArrivals, platformName, topTen]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length === 0) return [] as Project[];

    const matches = catalogPool.filter((p) => {
      if (!p) return false;
      const title = (p.title ?? '').toLowerCase();
      const genre = (p.script?.genre ?? '').toLowerCase();
      return title.includes(q) || genre.includes(q);
    });

    return matches.slice(0, 18);
  }, [catalogPool, searchQuery]);

  const showMassBrowse = layout === 'mass' && massView === 'browse';

  const showMassHome = showMassBrowse && activeNav === 'home';
  const showMassOriginals = showMassBrowse && activeNav === 'originals';
  const showMassNew = showMassBrowse && activeNav === 'new';
  const showMassSearch = layout === 'mass' && massView === 'search';
  const showMassNewHot = layout === 'mass' && massView === 'newhot';

  const shouldShowHero = layout !== 'mass' || massView === 'browse';

  return (
    <div
      className="sp-preview"
      data-overlay={resolved.overlay}
      data-layout={layout}
      style={{
        '--sp-primary': resolved.primaryHsl,
        '--sp-accent': resolved.accentHsl,
      } as React.CSSProperties}
    >
      <div className={layout === 'mass' ? 'sp-shell sp-shell--mass' : layout === 'prestige' ? 'sp-shell sp-shell--prestige' : 'sp-shell'}>
        <header className={layout === 'mass' ? 'sp-topbar sp-topbar--mass' : layout === 'prestige' ? 'sp-topbar sp-topbar--prestige' : 'sp-topbar'}>
          <div className="sp-brand">
            <div
              className={layout === 'mass' ? 'sp-logo sp-logo--mass' : layout === 'prestige' ? 'sp-logo sp-logo--prestige' : 'sp-logo'}
              aria-label="Platform logo"
            >
              <StudioIconRenderer config={resolved.logo} size={layout === 'mass' ? 22 : layout === 'prestige' ? 24 : 26} />
            </div>
            <div
              className={layout === 'mass' ? 'sp-wordmark sp-wordmark--mass' : layout === 'prestige' ? 'sp-wordmark sp-wordmark--prestige' : 'sp-wordmark'}
              title={platformName}
            >
              {platformName}
            </div>
          </div>

          <div
            className={
              layout === 'mass' ? 'sp-actions sp-actions--mass' : layout === 'prestige' ? 'sp-actions sp-actions--prestige' : 'sp-actions'
            }
          >
            {layout === 'mass' ? (
              <>
                <button
                  type="button"
                  className="sp-action-icon"
                  aria-label="Search"
                  onClick={() => {
                    setMassView('search');
                    setSearchQuery('');
                  }}
                >
                  <Search size={16} />
                </button>
                <button
                  type="button"
                  className="sp-action-icon"
                  aria-label="Profile"
                  onClick={() => {
                    setMassView('browse');
                    setActiveNav('home');
                  }}
                >
                  <UserCircle size={16} />
                </button>
              </>
            ) : layout === 'prestige' ? (
              <>
                <button type="button" className="sp-pill sp-pill--prestige">
                  My list
                </button>
                <button type="button" className="sp-pill sp-pill--prestige">
                  Account
                </button>
              </>
            ) : (
              <>
                <div className="sp-pill">Library</div>
                <div className="sp-pill">Profile</div>
              </>
            )}
          </div>
        </header>

        <nav
          className={layout === 'mass' ? 'sp-nav sp-nav--mass' : layout === 'prestige' ? 'sp-nav sp-nav--prestige' : 'sp-nav'}
          aria-label="Platform navigation"
        >
          <button
            type="button"
            onClick={() => {
              setActiveNav('home');
              setMassView('browse');
            }}
            data-active={layout === 'mass' ? (massView === 'browse' && activeNav === 'home') : activeNav === 'home'}
          >
            {layout === 'prestige' ? 'Featured' : 'Home'}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveNav('originals');
              setMassView('browse');
            }}
            data-active={layout === 'mass' ? (massView === 'browse' && activeNav === 'originals') : activeNav === 'originals'}
          >
            {layout === 'prestige' ? 'Series' : 'Originals'}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveNav('new');
              setMassView(layout === 'mass' ? 'newhot' : 'browse');
              if (layout === 'mass') setNewHotTab('watching');
            }}
            data-active={layout === 'mass' ? (massView === 'browse' ? activeNav === 'new' : massView === 'newhot') : activeNav === 'new'}
          >
            {layout === 'mass' ? 'New & Hot' : layout === 'prestige' ? 'Movies' : 'New'}
          </button>
        </nav>

        {layout === 'mass' && (
          <div className="sp-chips" aria-label="Category shortcuts">
            <button
              type="button"
              className="sp-chip"
              onClick={() => {
                setActiveNav('home');
                setMassView('browse');
              }}
              data-active={activeNav === 'home' && massView === 'browse'}
            >
              For you
            </button>
            <button
              type="button"
              className="sp-chip"
              onClick={() => {
                setActiveNav('originals');
                setMassView('browse');
              }}
              data-active={activeNav === 'originals' && massView === 'browse'}
            >
              Originals
            </button>
            <button
              type="button"
              className="sp-chip"
              onClick={() => {
                setActiveNav('new');
                setMassView('newhot');
                setNewHotTab('watching');
              }}
              data-active={massView === 'newhot'}
            >
              New & Hot
            </button>
            <button
              type="button"
              className="sp-chip"
              onClick={() => {
                setMassView('search');
                setSearchQuery('');
              }}
              data-active={massView === 'search'}
            >
              Search
            </button>
            <div className="sp-chip" style={{ cursor: 'default' }}>
              Categories
            </div>
          </div>
        )}

        {showMassSearch ? (
          <section className="sp-search">
            <div className="sp-searchbar">
              <input
                className="sp-searchinput"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles or genres"
              />
              <button type="button" className="sp-searchcancel" onClick={() => setMassView('browse')}>
                Cancel
              </button>
            </div>

            {searchQuery.trim().length === 0 ? (
              <>
                <Row
                  layout={layout}
                  title="Trending searches"
                  subtitle="Most searched this week"
                  items={topTen.slice(0, 12)}
                  platformId={platformId}
                  primaryHsl={resolved.primaryHsl}
                  accentHsl={resolved.accentHsl}
                  onSelectTitle={onSelectTitle}
                />
                <Row
                  layout={layout}
                  title="Browse by genre"
                  subtitle="Type 'drama', 'comedy', etc."
                  items={newArrivals.slice(0, 12)}
                  platformId={platformId}
                  primaryHsl={resolved.primaryHsl}
                  accentHsl={resolved.accentHsl}
                  onSelectTitle={onSelectTitle}
                />
              </>
            ) : searchResults.length > 0 ? (
              <Row
                layout={layout}
                title="Results"
                subtitle={`${searchResults.length} matches`}
                items={searchResults}
                platformId={platformId}
                primaryHsl={resolved.primaryHsl}
                accentHsl={resolved.accentHsl}
                onSelectTitle={onSelectTitle}
              />
            ) : (
              <div className="sp-search-empty">No matches.</div>
            )}
          </section>
        ) : showMassNewHot ? (
          <section className="sp-newhot">
            <div className="sp-newhot-head">
              <div>
                <div className="sp-newhot-title">New & Hot</div>
                <div className="sp-newhot-sub">Fresh drops and what’s blowing up right now</div>
              </div>
            </div>

            <div className="sp-newhot-tabs" role="tablist" aria-label="New and hot tabs">
              <button type="button" onClick={() => setNewHotTab('coming')} data-active={newHotTab === 'coming'}>
                Coming soon
              </button>
              <button type="button" onClick={() => setNewHotTab('watching')} data-active={newHotTab === 'watching'}>
                Everyone’s watching
              </button>
            </div>

            {newHotTab === 'coming' ? (
              <div className="sp-newhot-list">
                {newArrivals.slice(0, 12).map((p) => {
                  const initials = titleInitials(p.title);
                  const label = stableInt(`newhot:coming:${p.id}`, 0, 2);
                  const meta = label === 0 ? 'Coming this week' : label === 1 ? 'New season soon' : 'Arrives Friday';

                  return (
                    <button key={`coming:${p.id}`} type="button" className="sp-newhot-item" onClick={() => onSelectTitle(p)}>
                      <div className="sp-newhot-poster" style={{ backgroundImage: tileGradient(p.id, resolved.primaryHsl, resolved.accentHsl) }}>
                        <div className="sp-newhot-initials">{initials}</div>
                      </div>
                      <div className="sp-newhot-meta">
                        <div className="sp-newhot-item-title">{p.title}</div>
                        <div className="sp-newhot-item-sub">{meta} • {p.script?.genre ?? 'Unknown'}</div>
                      </div>
                    </button>
                  );
                })}

                {newArrivals.length === 0 && <div className="sp-newhot-empty">Nothing queued up yet.</div>}
              </div>
            ) : (
              <div className="sp-newhot-list">
                {topTen.slice(0, 12).map((p, idx) => {
                  const initials = titleInitials(p.title);
                  const isOriginal = !!platformId && p.streamingContract?.platformId === platformId;

                  return (
                    <button key={`watching:${p.id}`} type="button" className="sp-newhot-item sp-newhot-item--ranked" onClick={() => onSelectTitle(p)}>
                      <div className="sp-newhot-rank" aria-hidden="true">
                        #{idx + 1}
                      </div>
                      <div className="sp-newhot-poster" style={{ backgroundImage: tileGradient(p.id, resolved.primaryHsl, resolved.accentHsl) }}>
                        {isOriginal && <div className="sp-poster-tag">Original</div>}
                        <div className="sp-newhot-initials">{initials}</div>
                      </div>
                      <div className="sp-newhot-meta">
                        <div className="sp-newhot-item-title">{p.title}</div>
                        <div className="sp-newhot-item-sub">Trending • {p.script?.genre ?? 'Unknown'}</div>
                      </div>
                    </button>
                  );
                })}

                {topTen.length === 0 && <div className="sp-newhot-empty">Nothing is trending yet.</div>}
              </div>
            )}

            <div className="sp-newhot-footer" />
          </section>
        ) : shouldShowHero && heroTitle ? (
          <button
            type="button"
            className={layout === 'mass' ? 'sp-hero sp-hero--mass' : layout === 'prestige' ? 'sp-hero sp-hero--prestige' : 'sp-hero'}
            onClick={() => onSelectTitle(heroTitle)}
            style={layout !== 'default' ? { backgroundImage: tileGradient(heroTitle.id, resolved.primaryHsl, resolved.accentHsl) } : undefined}
          >
            <div
              className={
                layout === 'mass'
                  ? 'sp-hero-scrim sp-hero-scrim--mass'
                  : layout === 'prestige'
                    ? 'sp-hero-scrim sp-hero-scrim--prestige'
                    : 'sp-hero-scrim'
              }
            />
            <div className="sp-hero-content">
              <div className="sp-hero-kicker">{layout === 'prestige' ? 'Tonight' : 'Spotlight'}</div>
              <div className="sp-hero-title">{heroTitle.title}</div>
              <div className="sp-hero-meta">
                {heroTitle.type.replace('-', ' ')} • {heroTitle.script?.genre}
              </div>

              {layout === 'mass' ? (
                <div className="sp-hero-actions">
                  <div className="sp-btn sp-btn--primary">Play</div>
                  <div className="sp-btn">More info</div>
                </div>
              ) : layout === 'prestige' ? (
                <div className="sp-hero-actions sp-hero-actions--prestige">
                  <div className="sp-btn sp-btn--primary">Start watching</div>
                  <div className="sp-btn">Add to list</div>
                </div>
              ) : (
                <div className="sp-badges">
                  {platformId && heroTitle.streamingContract?.platformId === platformId && (
                    <span className="sp-badge" data-variant="primary">
                      Original
                    </span>
                  )}
                  <span className="sp-badge">Details</span>
                </div>
              )}
            </div>
          </button>
        ) : shouldShowHero ? (
          <div className={layout === 'mass' ? 'sp-hero sp-hero--mass' : layout === 'prestige' ? 'sp-hero sp-hero--prestige' : 'sp-hero'} style={{ cursor: 'default' }}>
            <div
              className={
                layout === 'mass'
                  ? 'sp-hero-scrim sp-hero-scrim--mass'
                  : layout === 'prestige'
                    ? 'sp-hero-scrim sp-hero-scrim--prestige'
                    : 'sp-hero-scrim'
              }
            />
            <div className="sp-hero-content">
              <div className="sp-hero-kicker">{layout === 'prestige' ? 'Spotlight' : 'Spotlight'}</div>
              <div className="sp-hero-title">No titles yet</div>
              <div className="sp-hero-meta">Add streaming windows and Originals to populate your catalog.</div>
            </div>
          </div>
        ) : null}

        {showMassHome && (
          <>
            <section className="sp-row sp-row--mass">
              <div className="sp-row-head">
                <div className="sp-row-title">Continue watching</div>
                <div className="sp-row-sub">Progress is local to this preview</div>
              </div>

              <div className="sp-row-list sp-row-list--mass">
                {continueWatching.map((x) => {
                  const initials = titleInitials(x.project.title);

                  return (
                    <button key={`continue:${x.project.id}`} type="button" className="sp-continue" onClick={() => onSelectTitle(x.project)}>
                      <div className="sp-continue-poster" style={{ backgroundImage: tileGradient(x.project.id, resolved.primaryHsl, resolved.accentHsl) }}>
                        <div className="sp-continue-initials">{initials}</div>
                      </div>
                      <div className="sp-continue-meta">
                        <div className="sp-continue-title">{x.project.title}</div>
                        <div className="sp-continue-sub">Resume • {x.project.script?.genre ?? 'Unknown'}</div>
                        <div className="sp-progress" aria-label={`Progress ${x.progressPct}%`}>
                          <div className="sp-progress-bar" style={{ width: `${x.progressPct}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}

                {continueWatching.length === 0 && (
                  <div className="sp-pill" style={{ marginLeft: 2 }}>
                    Nothing in progress
                  </div>
                )}
              </div>
            </section>

            <section className="sp-row sp-row--mass">
              <div className="sp-row-head">
                <div className="sp-row-title">Top 10</div>
                <div className="sp-row-sub">What everyone is watching</div>
              </div>

              <div className="sp-row-list sp-row-list--mass">
                {topTen.slice(0, 10).map((p, idx) => {
                  const initials = titleInitials(p.title);
                  const isOriginal = !!platformId && p.streamingContract?.platformId === platformId;

                  return (
                    <button key={`top10:${p.id}`} type="button" className="sp-top10" onClick={() => onSelectTitle(p)}>
                      <div className="sp-top10-rank" aria-hidden="true">
                        {idx + 1}
                      </div>
                      <div className="sp-top10-poster" style={{ backgroundImage: tileGradient(p.id, resolved.primaryHsl, resolved.accentHsl) }}>
                        {isOriginal && <div className="sp-poster-tag">Original</div>}
                        <div className="sp-top10-initials">{initials}</div>
                      </div>
                    </button>
                  );
                })}

                {topTen.length === 0 && (
                  <div className="sp-pill" style={{ marginLeft: 2 }}>
                    Nothing trending yet
                  </div>
                )}
              </div>
            </section>

            <Row
              layout={layout}
              title="My list"
              subtitle="Saved for later"
              items={myList}
              platformId={platformId}
              primaryHsl={resolved.primaryHsl}
              accentHsl={resolved.accentHsl}
              onSelectTitle={onSelectTitle}
            />

            <Row
              layout={layout}
              title="Because you watched"
              subtitle="More like what you started"
              items={becauseYouWatched}
              platformId={platformId}
              primaryHsl={resolved.primaryHsl}
              accentHsl={resolved.accentHsl}
              onSelectTitle={onSelectTitle}
            />

            <Row
              layout={layout}
              title="New this week"
              subtitle="Fresh additions"
              items={newArrivals.slice(0, 12)}
              platformId={platformId}
              primaryHsl={resolved.primaryHsl}
              accentHsl={resolved.accentHsl}
              onSelectTitle={onSelectTitle}
            />
          </>
        )}

        {showMassOriginals && (
          <Row
            layout={layout}
            title="Originals"
            subtitle="Built for your platform"
            items={originals.slice(0, 18)}
            platformId={platformId}
            primaryHsl={resolved.primaryHsl}
            accentHsl={resolved.accentHsl}
            onSelectTitle={onSelectTitle}
          />
        )}

        {showMassNew && (
          <Row
            layout={layout}
            title="New"
            subtitle="This week's releases"
            items={newArrivals.slice(0, 18)}
            platformId={platformId}
            primaryHsl={resolved.primaryHsl}
            accentHsl={resolved.accentHsl}
            onSelectTitle={onSelectTitle}
          />
        )}

        {layout === 'default' && (
          <Row
            layout={layout}
            title={activeNav === 'home' ? 'Top picks' : activeNav === 'originals' ? 'Originals' : 'New this week'}
            items={activeNav === 'originals' ? originals : activeNav === 'new' ? newArrivals : topTen}
            platformId={platformId}
            primaryHsl={resolved.primaryHsl}
            accentHsl={resolved.accentHsl}
            showRank={activeNav === 'home'}
            onSelectTitle={onSelectTitle}
          />
        )}

        {layout === 'prestige' && (
          <>
            {activeNav === 'home' && (
              <>
                <Row
                  layout={layout}
                  title="Originals"
                  subtitle="The signature slate"
                  items={prestigeOriginals}
                  platformId={platformId}
                  primaryHsl={resolved.primaryHsl}
                  accentHsl={resolved.accentHsl}
                  onSelectTitle={onSelectTitle}
                />

                <Row
                  layout={layout}
                  title="New & notable"
                  subtitle="Fresh episodes and films"
                  items={prestigePremieres}
                  platformId={platformId}
                  primaryHsl={resolved.primaryHsl}
                  accentHsl={resolved.accentHsl}
                  onSelectTitle={onSelectTitle}
                />

                <Row
                  layout={layout}
                  title="Critics’ picks"
                  subtitle="Curated, premium storytelling"
                  items={prestigePicks}
                  platformId={platformId}
                  primaryHsl={resolved.primaryHsl}
                  accentHsl={resolved.accentHsl}
                  onSelectTitle={onSelectTitle}
                />
              </>
            )}

            {activeNav === 'originals' && (
              <>
                <Row
                  layout={layout}
                  title="Series"
                  subtitle="Premium drama and comedy"
                  items={prestigeSeries}
                  platformId={platformId}
                  primaryHsl={resolved.primaryHsl}
                  accentHsl={resolved.accentHsl}
                  onSelectTitle={onSelectTitle}
                />
                <Row
                  layout={layout}
                  title="Limited series"
                  subtitle="A single season, all impact"
                  items={prestigeLimitedSeries}
                  platformId={platformId}
                  primaryHsl={resolved.primaryHsl}
                  accentHsl={resolved.accentHsl}
                  onSelectTitle={onSelectTitle}
                />
              </>
            )}

            {activeNav === 'new' && (
              <>
                <Row
                  layout={layout}
                  title="Movies"
                  subtitle="Big-screen stories, home viewing"
                  items={prestigeMovies}
                  platformId={platformId}
                  primaryHsl={resolved.primaryHsl}
                  accentHsl={resolved.accentHsl}
                  onSelectTitle={onSelectTitle}
                />
                <Row
                  layout={layout}
                  title="Award contenders"
                  subtitle="Critically acclaimed releases"
                  items={prestigeAwardContenders}
                  platformId={platformId}
                  primaryHsl={resolved.primaryHsl}
                  accentHsl={resolved.accentHsl}
                  onSelectTitle={onSelectTitle}
                />
              </>
            )}
          </>
        )}

        {layout === 'mass' && (
          <footer className="sp-bottomnav" aria-label="Bottom navigation">
            <button
              type="button"
              onClick={() => {
                setActiveNav('home');
                setMassView('browse');
              }}
              data-active={massView === 'browse' && activeNav === 'home'}
            >
              <Home size={18} />
              <span>Home</span>
            </button>
            <button type="button" onClick={() => setMassView('search')} data-active={massView === 'search'}>
              <Search size={18} />
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNav('new');
                setMassView('newhot');
                setNewHotTab('watching');
              }}
              data-active={massView === 'newhot'}
            >
              <Flame size={18} />
              <span>New & Hot</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNav('home');
                setMassView('browse');
              }}
              data-active={false}
            >
              <UserCircle size={18} />
              <span>Profile</span>
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
