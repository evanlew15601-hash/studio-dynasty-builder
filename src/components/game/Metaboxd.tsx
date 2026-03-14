import React, { useMemo, useState } from 'react';
import type { GameState, Project } from '@/types/game';
import { useGameStore } from '@/game/store';
import { stableInt } from '@/utils/stableRandom';
import { stablePick } from '@/utils/stablePick';
import './metaboxd.css';

type MetaboxdTitleKind = 'film' | 'tv';

type MetaboxdTitle = {
  id: string;
  title: string;
  kind: MetaboxdTitleKind;
  studioName: string;
  releaseYear?: number;
  genre?: string;
  criticsScore: number;
  audienceScore: number;
  metascore: number;
  consensus: string;
  stars: number;
  reviews: Array<{ source: string; score: number; quote: string }>;
  userReviews: Array<{ handle: string; stars: number; body: string }>;
};

const CRITIC_SOURCES = [
  'Showbiz Ledger',
  'The Studio Reporter',
  'Deadline Daily',
  'Screen Weekly',
  'PopLife Magazine',
  'Los Angeles Gazette',
  'New York Ledger',
  'The Industry Rundown',
  'Screen Rave',
  'Fangorama',
  'FilmChirper Collective',
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function scoreToStars(score0to100: number): number {
  const raw = clamp(score0to100, 0, 100) / 20;
  return Math.round(raw * 2) / 2;
}

function badgeClass(score: number): 'good' | 'warn' | 'bad' {
  if (score >= 70) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

function titleInitials(title: string): string {
  const parts = title
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return 'MB';
  return parts.map((p) => p[0].toUpperCase()).join('');
}

function deriveConsensus(title: string, criticsScore: number, audienceScore: number, seed: string): string {
  const avg = (criticsScore * 0.65) + (audienceScore * 0.35);

  const positive = [
    `A sharply-crafted crowd-pleaser with enough bite to satisfy die-hards.`,
    `Confident filmmaking and an undeniable hook elevate ${title} above the pack.`,
    `Smart, stylish, and surprisingly heartfelt — ${title} lands with real momentum.`,
    `Big swings, clear vision: ${title} delivers the kind of entertainment people talk about.`,
  ];

  const mixed = [
    `${title} has standout moments, even if the execution doesn’t always match the ambition.`,
    `A compelling premise meets uneven pacing, resulting in a watchable but inconsistent ride.`,
    `The craft is there, but ${title} can’t quite decide what it wants to be.`,
    `Solid performances keep ${title} afloat despite familiar beats.`,
  ];

  const negative = [
    `${title} struggles to find focus, leaving its best ideas undercooked.`,
    `A noisy jumble of half-finished threads — there’s potential, but it never clicks.`,
    `Despite flashes of style, ${title} can’t overcome thin writing and flat momentum.`,
    `More effort than payoff: ${title} feels engineered rather than felt.`,
  ];

  const pool = avg >= 75 ? positive : avg >= 58 ? mixed : negative;
  return stablePick(pool, `${seed}|consensus`) || pool[0];
}

function deriveMetascore(criticsScore: number, audienceScore: number, seed: string): number {
  const base = (criticsScore * 0.85) + (audienceScore * 0.15);
  const drift = stableInt(`${seed}|meta-drift`, -6, 6);
  return clamp(Math.round(base + drift), 20, 95);
}

function deriveCriticQuotes(title: string, criticsScore: number, seed: string): Array<{ source: string; score: number; quote: string }> {
  const vibe = criticsScore >= 80 ? 'rave' : criticsScore >= 65 ? 'positive' : criticsScore >= 55 ? 'mixed' : 'panned';

  const quoteBank: Record<string, string[]> = {
    rave: [
      `A rare studio swing that actually connects — confident, immersive, and hard to shake.`,
      `Crafted with precision. ${title} feels like the work of people who know exactly what they’re doing.`,
      `A top-tier crowd experience with real technique behind the spectacle.`,
      `The kind of movie that reminds you why opening night still matters.`,
    ],
    positive: [
      `Punchy and effective — it moves with purpose and lands most of its big moments.`,
      `A sturdy, satisfying watch with enough personality to feel distinct.`,
      `Stronger than expected and easy to recommend, especially with an audience.`,
      `Not perfect, but it’s got energy and it knows how to entertain.`,
    ],
    mixed: [
      `Ambitious but uneven, with flashes of something better in between the rough edges.`,
      `A good premise stretched a little thin — still, there’s enough here to enjoy.`,
      `Watchable and occasionally sharp, but the payoff doesn’t quite justify the build.`,
      `The ingredients are right; the recipe needed another pass.`,
    ],
    panned: [
      `A sleek surface can’t hide the lack of substance underneath.`,
      `There are hints of a good idea, but the execution never finds its footing.`,
      `A tiring watch that mistakes volume for impact.`,
      `More noise than story — it’s hard to care, and harder to remember.`,
    ],
  };

  const sources = [...CRITIC_SOURCES]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 7);

  const desired = stableInt(`${seed}|critic-count`, 4, 6);
  const out: Array<{ source: string; score: number; quote: string }> = [];

  for (let i = 0; i < desired; i++) {
    const source = sources[i] || `Critic Desk ${i + 1}`;
    const score = clamp(criticsScore + stableInt(`${seed}|critic-score|${i}`, -12, 10), 20, 100);
    const quote = stablePick(quoteBank[vibe], `${seed}|critic-quote|${i}`) || quoteBank[vibe][0];
    out.push({ source, score, quote });
  }

  return out;
}

function deriveUserReviews(title: string, stars: number, seed: string): Array<{ handle: string; stars: number; body: string }> {
  const reactions = {
    high: [
      `This ruled. Tight pacing, great atmosphere, and the kind of ending you immediately want to argue about.`,
      `Exactly what I wanted — confident and clean, with a couple genuinely great set pieces.`,
      `I wasn’t expecting the character work to hit like that. Easy rewatch.`,
      `Feels engineered for the big screen and it absolutely works.`,
    ],
    mid: [
      `Good time! A few lulls, but the highs are high enough.`,
      `Solid, with a couple choices that kept pulling me out. Still glad I watched.`,
      `There’s a better version of this somewhere, but the vibe carries it.`,
      `I can’t tell if I liked it or just liked parts of it.`,
    ],
    low: [
      `Wanted to love it, but it never found a rhythm.`,
      `It’s not the worst thing ever, but it’s weirdly empty.`,
      `A lot of setup for very little payoff.`,
      `The trailer sold a different movie.`,
    ],
  } as const;

  const band = stars >= 4 ? 'high' : stars >= 3 ? 'mid' : 'low';

  const count = stableInt(`${seed}|user-count`, 4, 7);
  const reviews: Array<{ handle: string; stars: number; body: string }> = [];

  for (let i = 0; i < count; i++) {
    const userStars = clamp(stars + (stableInt(`${seed}|user-stars|${i}`, -2, 2) * 0.5), 0.5, 5);
    const handleAdj = stablePick(['celluloid', 'rewatch', 'projectionist', 'matinee', 'latecut', 'framebyframe', 'cinevault'], `${seed}|handle-adj|${i}`) || 'cine';
    const handleNoun = stablePick(['notes', 'club', 'corner', 'queue', 'diary', 'room', 'stack'], `${seed}|handle-noun|${i}`) || 'diary';
    const handle = `@${handleAdj}${handleNoun}${stableInt(`${seed}|handle-num|${i}`, 2, 99)}`;
    const body = stablePick(reactions[band], `${seed}|user-body|${i}`) || reactions[band][0];

    reviews.push({
      handle,
      stars: userStars,
      body: body.replace(/\$\{title\}/g, title),
    });
  }

  return reviews;
}

function projectToMetaboxdTitle(gameState: GameState, project: Project): MetaboxdTitle {
  const criticsScore = clamp(
    Math.round(project.metrics?.critical?.metaCriticScore ?? project.metrics?.criticsScore ?? 65),
    1,
    100
  );

  const audienceScore = clamp(
    Math.round(project.metrics?.critical?.audienceScore ?? project.metrics?.audienceScore ?? 65),
    1,
    100
  );

  const seed = `${gameState.universeSeed || 'seed'}|metaboxd|${project.id}`;

  const metascore = deriveMetascore(criticsScore, audienceScore, seed);
  const consensus = project.metrics?.critical?.criticsConsensus?.trim()
    ? project.metrics.critical.criticsConsensus
    : deriveConsensus(project.title, criticsScore, audienceScore, seed);

  const stars = scoreToStars((criticsScore * 0.55) + (audienceScore * 0.45));

  const reviews = deriveCriticQuotes(project.title, criticsScore, seed);
  const userReviews = deriveUserReviews(project.title, stars, seed);

  const isTv = project.type === 'series' || project.type === 'limited-series';
  const studioName = project.studioName && project.studioName.trim()
    ? project.studioName
    : (gameState.projects.some(p => p.id === project.id) ? gameState.studio.name : 'Unknown Studio');

  return {
    id: project.id,
    title: project.title,
    kind: isTv ? 'tv' : 'film',
    studioName,
    releaseYear: project.releaseYear,
    genre: project.script?.genre,
    criticsScore,
    audienceScore,
    metascore,
    consensus,
    stars,
    reviews,
    userReviews,
  };
}

function formatStars(stars: number): string {
  const full = Math.floor(stars);
  const half = stars - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

export const Metaboxd: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  const [activeTab, setActiveTab] = useState<MetaboxdTitleKind | 'all'>('all');
  const [scope, setScope] = useState<'market' | 'yours'>('market');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const titles = useMemo(() => {
    if (!gameState) return [] as MetaboxdTitle[];

    const releases = (gameState.allReleases || [])
      .filter((r): r is Project => !!r && typeof r === 'object' && 'script' in r)
      .filter((p) => p.status === 'released');

    const mapped = releases.map((p) => projectToMetaboxdTitle(gameState, p));

    return mapped
      .sort((a, b) => (b.metascore - a.metascore) || a.title.localeCompare(b.title));
  }, [gameState]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const yourStudio = gameState?.studio?.name;

    return titles
      .filter((t) => (activeTab === 'all' ? true : t.kind === activeTab))
      .filter((t) => (scope === 'yours' && yourStudio ? t.studioName === yourStudio : true))
      .filter((t) => (!q ? true : `${t.title} ${t.studioName}`.toLowerCase().includes(q)));
  }, [titles, query, activeTab, scope, gameState?.studio?.name]);

  const selected = useMemo(
    () => (selectedId ? titles.find((t) => t.id === selectedId) || null : null),
    [titles, selectedId]
  );

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading Metaboxd…</div>;
  }

  return (
    <div className="metaboxd-root">
      <header className="metaboxd-header">
        <div className="metaboxd-brand">
          <div className="metaboxd-logo">Metaboxd</div>
          <div className="metaboxd-tagline">Read-only reviews • critics + audiences • your universe</div>
        </div>

        <nav className="metaboxd-nav" aria-label="Metaboxd navigation">
          <button type="button" onClick={() => { setActiveTab('all'); setSelectedId(null); }}>Home</button>
          <button type="button" onClick={() => { setActiveTab('film'); setSelectedId(null); }}>Films</button>
          <button type="button" onClick={() => { setActiveTab('tv'); setSelectedId(null); }}>Shows</button>
          <span style={{ opacity: 0.4 }}>•</span>
          <button
            type="button"
            onClick={() => { setScope('market'); setSelectedId(null); }}
            style={{ color: scope === 'market' ? 'var(--mb-text)' : undefined }}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => { setScope('yours'); setSelectedId(null); }}
            style={{ color: scope === 'yours' ? 'var(--mb-text)' : undefined }}
          >
            Your titles
          </button>
        </nav>

        <div className="metaboxd-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles or studios…"
            aria-label="Search Metaboxd"
          />
        </div>
      </header>

      {!selected ? (
        <div className="metaboxd-body">
          <section className="metaboxd-panel">
            <div className="metaboxd-panel-header">
              <div>
                <div className="metaboxd-panel-title">
                  {activeTab === 'all' ? 'Trending in your market' : activeTab === 'film' ? 'Films' : 'Shows'}
                </div>
                <div className="metaboxd-panel-subtitle">
                  {filtered.length} title{filtered.length === 1 ? '' : 's'} • ranked by Metascore
                </div>
              </div>
              <div className={`metaboxd-badge ${badgeClass(Math.round(gameState.studio.reputation || 0))}`}>
                Studio Rep {Math.round(gameState.studio.reputation || 0)}
              </div>
            </div>

            <div className="metaboxd-grid">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="metaboxd-poster"
                  onClick={() => setSelectedId(t.id)}
                  aria-label={`Open ${t.title}`}
                >
                  <div className="metaboxd-poster-box">
                    <div className="metaboxd-poster-initials">{titleInitials(t.title)}</div>
                    <div className="metaboxd-poster-rating">{t.metascore}</div>
                  </div>
                  <div className="metaboxd-poster-meta">
                    <div className="metaboxd-title">{t.title}</div>
                    <div className="metaboxd-subline">
                      {t.releaseYear ?? '—'} • {t.studioName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <aside className="metaboxd-sidebar" aria-label="Metaboxd sidebar">
            <div className="metaboxd-panel">
              <div className="metaboxd-panel-header">
                <div>
                  <div className="metaboxd-panel-title">This week at a glance</div>
                  <div className="metaboxd-panel-subtitle">Your studio and the market response</div>
                </div>
              </div>
              <div className="metaboxd-list">
                <div className="metaboxd-list-item">
                  <div className="metaboxd-list-item-title">Your studio</div>
                  <div className="metaboxd-list-item-meta">
                    {gameState.studio.name} • Budget ${(gameState.studio.budget / 1_000_000).toFixed(0)}M
                  </div>
                </div>

                <div className="metaboxd-list-item">
                  <div className="metaboxd-list-item-title">Top Metascore</div>
                  <div className="metaboxd-list-item-meta">
                    {titles[0] ? (
                      <>
                        <a
                          className="metaboxd-link"
                          href="#"
                          onClick={(e) => { e.preventDefault(); setSelectedId(titles[0].id); }}
                        >
                          {titles[0].title}
                        </a>
                        {' '}— {titles[0].metascore}
                      </>
                    ) : (
                      'No releases yet.'
                    )}
                  </div>
                </div>

                <div className="metaboxd-list-item">
                  <div className="metaboxd-list-item-title">Market size</div>
                  <div className="metaboxd-list-item-meta">
                    {gameState.allReleases.filter((r: any) => r && r.status === 'released').length} released titles tracked
                  </div>
                </div>

                <div className="metaboxd-list-item">
                  <div className="metaboxd-list-item-title">How to read this</div>
                  <div className="metaboxd-list-item-meta">
                    Critics score = press response. Audience score = word of mouth. Metascore is a weighted index.
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="metaboxd-body">
          <section className="metaboxd-panel">
            <div className="metaboxd-detail">
              <button
                type="button"
                className="metaboxd-back"
                onClick={() => setSelectedId(null)}
              >
                ← Back to listings
              </button>

              <div className="metaboxd-detail-top" style={{ marginTop: 12 }}>
                <div className="metaboxd-poster-box" style={{ maxWidth: 200 }}>
                  <div className="metaboxd-poster-initials">{titleInitials(selected.title)}</div>
                  <div className="metaboxd-poster-rating">{selected.metascore}</div>
                </div>

                <div>
                  <div className="metaboxd-detail-title">{selected.title}</div>
                  <div className="metaboxd-detail-meta">
                    {selected.releaseYear ?? '—'} • {selected.kind === 'film' ? 'Film' : 'TV'} • {selected.studioName}{selected.genre ? ` • ${selected.genre}` : ''}
                  </div>

                  <div className="metaboxd-rating-row">
                    <div className="metaboxd-rating-card">
                      <div className="metaboxd-rating-label">Metascore</div>
                      <div className={`metaboxd-rating-value ${badgeClass(selected.metascore)}`}>{selected.metascore}</div>
                      <div className="metaboxd-rating-sub">Weighted critics index</div>
                    </div>
                    <div className="metaboxd-rating-card">
                      <div className="metaboxd-rating-label">Critics</div>
                      <div className={`metaboxd-rating-value ${badgeClass(selected.criticsScore)}`}>{selected.criticsScore}</div>
                      <div className="metaboxd-rating-sub">Press score (0–100)</div>
                    </div>
                    <div className="metaboxd-rating-card">
                      <div className="metaboxd-rating-label">Audience</div>
                      <div className={`metaboxd-rating-value ${badgeClass(selected.audienceScore)}`}>{selected.audienceScore}</div>
                      <div className="metaboxd-rating-sub">Viewer score (0–100)</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.58)' }}>
                      Critics consensus
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14 }}>
                      {selected.consensus}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.82)' }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.58)' }}>
                      Metaboxd rating
                    </div>
                    <div style={{ marginTop: 6, fontWeight: 800, fontSize: 16 }}>
                      {formatStars(selected.stars)}
                      <span style={{ marginLeft: 10, color: 'rgba(255,255,255,0.62)', fontWeight: 600, fontSize: 12 }}>
                        ({selected.stars.toFixed(1)} / 5)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="metaboxd-panel-header">
              <div>
                <div className="metaboxd-panel-title">Top critic blurbs</div>
                <div className="metaboxd-panel-subtitle">A handful of pull-quotes from across the trades</div>
              </div>
            </div>
            <div className="metaboxd-review-list">
              {selected.reviews.map((r, i) => (
                <div key={`${r.source}-${i}`} className="metaboxd-review">
                  <div className="metaboxd-review-head">
                    <div className="metaboxd-review-source">{r.source}</div>
                    <div className="metaboxd-review-score">{r.score}/100</div>
                  </div>
                  <div className="metaboxd-review-body">“{r.quote}”</div>
                </div>
              ))}
            </div>

            <div className="metaboxd-panel-header">
              <div>
                <div className="metaboxd-panel-title">Member reviews</div>
                <div className="metaboxd-panel-subtitle">A slice of audience chatter</div>
              </div>
            </div>
            <div className="metaboxd-review-list">
              {selected.userReviews.map((r, i) => (
                <div key={`${r.handle}-${i}`} className="metaboxd-review">
                  <div className="metaboxd-review-head">
                    <div className="metaboxd-review-source">{r.handle}</div>
                    <div className="metaboxd-review-score">{formatStars(r.stars)}</div>
                  </div>
                  <div className="metaboxd-review-body">{r.body}</div>
                </div>
              ))}
            </div>
          </section>

          <aside className="metaboxd-sidebar">
            <div className="metaboxd-panel">
              <div className="metaboxd-panel-header">
                <div>
                  <div className="metaboxd-panel-title">Related</div>
                  <div className="metaboxd-panel-subtitle">Other releases from this studio</div>
                </div>
              </div>
              <div className="metaboxd-list">
                {titles
                  .filter((t) => t.studioName === selected.studioName && t.id !== selected.id)
                  .slice(0, 5)
                  .map((t) => (
                    <div key={t.id} className="metaboxd-list-item">
                      <div className="metaboxd-list-item-title">
                        <a
                          className="metaboxd-link"
                          href="#"
                          onClick={(e) => { e.preventDefault(); setSelectedId(t.id); }}
                        >
                          {t.title}
                        </a>
                      </div>
                      <div className="metaboxd-list-item-meta">
                        {t.releaseYear ?? '—'} • Metascore {t.metascore}
                      </div>
                    </div>
                  ))}
                {titles.filter((t) => t.studioName === selected.studioName && t.id !== selected.id).length === 0 && (
                  <div className="metaboxd-list-item">
                    <div className="metaboxd-list-item-meta">No other tracked titles from this studio yet.</div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
