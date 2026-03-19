import React, { useMemo, useState } from 'react';
import type { Project } from '@/types/game';
import type { PlayerPlatformBranding } from '@/types/platformEconomy';
import { stableInt } from '@/utils/stableRandom';
import { Search, UserCircle } from 'lucide-react';
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

type LayoutMode = 'default' | 'mass';

type ContinueCard = {
  project: Project;
  progressPct: number;
};

function deriveContinueWatching(projects: Project[], seed: string): ContinueCard[] {
  return projects.slice(0, 8).map((project, idx) => {
    const pct = stableInt(`${seed}|p:${project.id}|${idx}`, 8, 94);
    return { project, progressPct: pct };
  });
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
  return (
    <section className={layout === 'mass' ? 'sp-row sp-row--mass' : 'sp-row'}>
      <div className="sp-row-head">
        <div className="sp-row-title">{title}</div>
        <div className="sp-row-sub">{subtitle ?? 'Tap a tile for details'}</div>
      </div>

      <div className={layout === 'mass' ? 'sp-row-list sp-row-list--mass' : 'sp-row-list'}>
        {items.map((p, idx) => {
          const initials = titleInitials(p.title);
          const isOriginal = !!platformId && p.streamingContract?.platformId === platformId;

          return (
            <button key={p.id} type="button" className={layout === 'mass' ? 'sp-tile sp-tile--mass' : 'sp-tile'} onClick={() => onSelectTitle(p)}>
              <div
                className={layout === 'mass' ? 'sp-poster sp-poster--mass' : 'sp-poster'}
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
}> = ({ platformId, platformName, vibe, branding, heroTitle, topTen, newArrivals, originals, onSelectTitle }) => {
  const [activeNav, setActiveNav] = useState<'home' | 'originals' | 'new'>('home');

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
    if (requested === 'default') return 'default';
    return vibe === 'mass' ? 'mass' : 'default';
  }, [branding?.layout, vibe]);

  const continuePool = useMemo(() => {
    const pool = topTen.length > 0 ? topTen : newArrivals.length > 0 ? newArrivals : originals;
    return pool;
  }, [newArrivals, originals, topTen]);

  const continueWatching = useMemo(() => {
    return deriveContinueWatching(continuePool, `continue|${platformName}|${layout}`);
  }, [continuePool, layout, platformName]);

  const showMassHome = layout === 'mass' && activeNav === 'home';
  const showMassOriginals = layout === 'mass' && activeNav === 'originals';
  const showMassNew = layout === 'mass' && activeNav === 'new';

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
      <div className={layout === 'mass' ? 'sp-shell sp-shell--mass' : 'sp-shell'}>
        <header className={layout === 'mass' ? 'sp-topbar sp-topbar--mass' : 'sp-topbar'}>
          <div className="sp-brand">
            <div className={layout === 'mass' ? 'sp-logo sp-logo--mass' : 'sp-logo'} aria-label="Platform logo">
              <StudioIconRenderer config={resolved.logo} size={layout === 'mass' ? 22 : 26} />
            </div>
            <div className={layout === 'mass' ? 'sp-wordmark sp-wordmark--mass' : 'sp-wordmark'} title={platformName}>
              {platformName}
            </div>
          </div>

          <div className={layout === 'mass' ? 'sp-actions sp-actions--mass' : 'sp-actions'}>
            {layout === 'mass' ? (
              <>
                <div className="sp-action-icon" aria-label="Search">
                  <Search size={16} />
                </div>
                <div className="sp-action-icon" aria-label="Profile">
                  <UserCircle size={16} />
                </div>
              </>
            ) : (
              <>
                <div className="sp-pill">Library</div>
                <div className="sp-pill">Profile</div>
              </>
            )}
          </div>
        </header>

        <nav className={layout === 'mass' ? 'sp-nav sp-nav--mass' : 'sp-nav'} aria-label="Platform navigation">
          <button type="button" onClick={() => setActiveNav('home')} data-active={activeNav === 'home'}>
            Home
          </button>
          <button type="button" onClick={() => setActiveNav('originals')} data-active={activeNav === 'originals'}>
            Originals
          </button>
          <button type="button" onClick={() => setActiveNav('new')} data-active={activeNav === 'new'}>
            New
          </button>
        </nav>

        {heroTitle ? (
          <button
            type="button"
            className={layout === 'mass' ? 'sp-hero sp-hero--mass' : 'sp-hero'}
            onClick={() => onSelectTitle(heroTitle)}
            style={layout === 'mass' ? { backgroundImage: tileGradient(heroTitle.id, resolved.primaryHsl, resolved.accentHsl) } : undefined}
          >
            <div className={layout === 'mass' ? 'sp-hero-scrim sp-hero-scrim--mass' : 'sp-hero-scrim'} />
            <div className="sp-hero-content">
              <div className="sp-hero-kicker">Spotlight</div>
              <div className="sp-hero-title">{heroTitle.title}</div>
              <div className="sp-hero-meta">
                {heroTitle.type.replace('-', ' ')} • {heroTitle.script?.genre}
              </div>

              {layout === 'mass' ? (
                <div className="sp-hero-actions">
                  <div className="sp-btn sp-btn--primary">Play</div>
                  <div className="sp-btn">More info</div>
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
        ) : (
          <div className={layout === 'mass' ? 'sp-hero sp-hero--mass' : 'sp-hero'} style={{ cursor: 'default' }}>
            <div className={layout === 'mass' ? 'sp-hero-scrim sp-hero-scrim--mass' : 'sp-hero-scrim'} />
            <div className="sp-hero-content">
              <div className="sp-hero-kicker">Spotlight</div>
              <div className="sp-hero-title">No titles yet</div>
              <div className="sp-hero-meta">Add streaming windows and Originals to populate your catalog.</div>
            </div>
          </div>
        )}

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

        {layout !== 'mass' && (
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
      </div>
    </div>
  );
};
