import React, { useMemo, useState } from 'react';
import type { Project } from '@/types/game';
import type { PlayerPlatformBranding } from '@/types/platformEconomy';
import { stableInt } from '@/utils/stableRandom';
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

export const StreamingPlatformPreview: React.FC<{
  platformId: string | null;
  platformName: string;
  branding?: PlayerPlatformBranding;
  heroTitle: Project | null;
  topTen: Project[];
  newArrivals: Project[];
  originals: Project[];
  onSelectTitle: (project: Project) => void;
}> = ({ platformId, platformName, branding, heroTitle, topTen, newArrivals, originals, onSelectTitle }) => {
  const [activeNav, setActiveNav] = useState<'home' | 'originals' | 'new'>('home');

  const resolved = useMemo(() => {
    const primaryHsl = resolveHsl(branding?.primaryColor, ICON_COLORS, '42 88% 68%');
    const accentHsl = resolveHsl(branding?.accentColor, ACCENT_COLORS, '0 0% 95%');

    const logo = (branding?.logo as StudioIconConfig | undefined) ?? DEFAULT_ICON;

    const overlay = branding?.overlay ?? 'spotlight';

    return { primaryHsl, accentHsl, logo, overlay };
  }, [branding]);

  const navRows = activeNav === 'originals' ? originals : activeNav === 'new' ? newArrivals : topTen;

  return (
    <div
      className="sp-preview"
      data-overlay={resolved.overlay}
      style={{
        '--sp-primary': resolved.primaryHsl,
        '--sp-accent': resolved.accentHsl,
      } as React.CSSProperties}
    >
      <div className="sp-shell">
        <header className="sp-topbar">
          <div className="sp-brand">
            <div className="sp-logo" aria-label="Platform logo">
              <StudioIconRenderer config={resolved.logo} size={26} />
            </div>
            <div className="sp-wordmark" title={platformName}>
              {platformName}
            </div>
          </div>

          <div className="sp-actions">
            <div className="sp-pill">Library</div>
            <div className="sp-pill">Profile</div>
          </div>
        </header>

        <nav className="sp-nav" aria-label="Platform navigation">
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
          <button type="button" className="sp-hero" onClick={() => onSelectTitle(heroTitle)}>
            <div className="sp-hero-kicker">Spotlight</div>
            <div className="sp-hero-title">{heroTitle.title}</div>
            <div className="sp-hero-meta">
              {heroTitle.type.replace('-', ' ')} • {heroTitle.script?.genre}
            </div>
            <div className="sp-badges">
              {platformId && heroTitle.streamingContract?.platformId === platformId && (
                <span className="sp-badge" data-variant="primary">
                  Original
                </span>
              )}
              <span className="sp-badge">Details</span>
            </div>
          </button>
        ) : (
          <div className="sp-hero" style={{ cursor: 'default' }}>
            <div className="sp-hero-kicker">Spotlight</div>
            <div className="sp-hero-title">No titles yet</div>
            <div className="sp-hero-meta">Add streaming windows and Originals to populate your catalog.</div>
          </div>
        )}

        <section className="sp-row">
          <div className="sp-row-head">
            <div className="sp-row-title">
              {activeNav === 'home' ? 'Top picks' : activeNav === 'originals' ? 'Originals' : 'New this week'}
            </div>
            <div className="sp-row-sub">Tap a tile for details</div>
          </div>

          <div className="sp-row-list">
            {navRows.map((p, idx) => {
              const initials = titleInitials(p.title);
              const isOriginal = !!platformId && p.streamingContract?.platformId === platformId;

              return (
                <button key={p.id} type="button" className="sp-tile" onClick={() => onSelectTitle(p)}>
                  <div className="sp-poster" style={{ backgroundImage: tileGradient(p.id, resolved.primaryHsl, resolved.accentHsl) }}>
                    {activeNav === 'home' && (
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

            {navRows.length === 0 && (
              <div className="sp-pill" style={{ marginLeft: 2 }}>
                No titles available
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
