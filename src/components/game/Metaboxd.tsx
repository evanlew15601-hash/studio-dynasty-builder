import React, { useEffect, useMemo, useState } from 'react';
import type { GameState, Project } from '@/types/game';
import { useGameStore } from '@/game/store';
import { stableInt } from '@/utils/stableRandom';
import { stablePick } from '@/utils/stablePick';
import { isPrimaryStreamingFilm } from '@/utils/projectMedium';
import './metaboxd.css';

type MetaboxdTitleKind = 'film' | 'tv';

type MetaboxdTitle = {
  id: string;
  title: string;
  kind: MetaboxdTitleKind;
  studioName: string;
  releaseYear?: number;
  genre?: string;
  runtimeMins?: number;
  budget?: number;
  boxOfficeTotal?: number;
  streamingViews?: number;
  releaseLabel?: string;
  logline?: string;
  director?: string;
  topCast?: string[];
  source?: string;

  criticsScore: number;
  audienceScore: number;
  indexScore: number;
  consensus: string;
  stars: number;

  playerReview?: { stars: number; body: string };

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
    'A sharply-crafted crowd-pleaser with enough bite to satisfy die-hards.',
    `Confident filmmaking and an undeniable hook elevate ${title} above the pack.`,
    `Smart, stylish, and surprisingly heartfelt — ${title} lands with real momentum.`,
    `Big swings, clear vision: ${title} delivers the kind of entertainment people talk about.`,
  ];

  const mixed = [
    `${title} has standout moments, even if the execution doesn’t always match the ambition.`,
    'A compelling premise meets uneven pacing, resulting in a watchable but inconsistent ride.',
    `The craft is there, but ${title} can’t quite decide what it wants to be.`,
    `Solid performances keep ${title} afloat despite familiar beats.`,
  ];

  const negative = [
    `${title} struggles to find focus, leaving its best ideas undercooked.`,
    'A noisy jumble of half-finished threads — there’s potential, but it never clicks.',
    `Despite flashes of style, ${title} can’t overcome thin writing and flat momentum.`,
    `More effort than payoff: ${title} feels engineered rather than felt.`,
  ];

  const pool = avg >= 75 ? positive : avg >= 58 ? mixed : negative;
  return stablePick(pool, `${seed}|consensus`) || pool[0];
}

function deriveIndexScore(criticsScore: number, audienceScore: number, seed: string): number {
  const base = (criticsScore * 0.85) + (audienceScore * 0.15);
  const drift = stableInt(`${seed}|index-drift`, -6, 6);
  return clamp(Math.round(base + drift), 20, 95);
}

function deriveCriticQuotes(title: string, criticsScore: number, seed: string): Array<{ source: string; score: number; quote: string }> {
  const vibe = criticsScore >= 80 ? 'rave' : criticsScore >= 65 ? 'positive' : criticsScore >= 55 ? 'mixed' : 'panned';

  const quoteBank: Record<string, string[]> = {
    rave: [
      'A rare studio swing that actually connects — confident, immersive, and hard to shake.',
      `Crafted with precision. ${title} feels like the work of people who know exactly what they’re doing.`,
      'A top-tier crowd experience with real technique behind the spectacle.',
      'Big, specific choices and a strong sense of momentum — it keeps landing hits.',
    ],
    positive: [
      'A satisfying watch with enough texture to feel like more than a formula run.',
      'Not perfect, but it’s driven by clear intent and strong fundamentals.',
      'The set pieces sing, and the quieter scenes do more work than you’d expect.',
      `A sturdy crowd title — ${title} knows its lane and stays in it.`,
    ],
    mixed: [
      'A two-step forward, one-step back project that never quite finds a consistent rhythm.',
      'Better in moments than as a whole, but there’s craft on display.',
      'It’s watchable, but the storytelling feels slightly at odds with itself.',
      'Ambition shows through, even if the final shape is a little uneven.',
    ],
    panned: [
      'A lot of motion without much meaning — it keeps resetting before it builds.',
      'A thin script and scattered tone leave the experience strangely weightless.',
      `For all its noise, ${title} doesn’t give you much to hold onto.`,
      'There are glimmers of a better version of this buried under the choices.',
    ],
  };

  const sources = CRITIC_SOURCES.slice();
  const quotes = quoteBank[vibe] || quoteBank.mixed;

  const reviews = Array.from({ length: 6 }, (_, i) => {
    const source = stablePick(sources, `${seed}|source|${i}`) || sources[i % sources.length];
    const quote = stablePick(quotes, `${seed}|quote|${i}`) || quotes[i % quotes.length];
    const scoreWobble = stableInt(`${seed}|scoreWobble|${i}`, -12, 10);
    const score = clamp(Math.round(criticsScore + scoreWobble), 15, 98);

    return { source, score, quote };
  });

  const unique = new Map<string, { source: string; score: number; quote: string }>();
  for (const r of reviews) {
    if (!unique.has(r.source)) unique.set(r.source, r);
  }

  return Array.from(unique.values()).slice(0, 5);
}

function deriveUserReviews(title: string, stars: number, seed: string): Array<{ handle: string; stars: number; body: string }> {
  const handles = [
    'marquee_maven',
    'backrowcritic',
    'nightowlwatcher',
    'cine_loft',
    'popcorn_ledger',
    'studio_rumor',
    'film_slate',
    'late_show',
    'hardcut',
    'boxofficebird',
  ];

  const bodies = [
    `The first act is doing real work. Then it just keeps escalating.`,
    `I didn’t expect to care and then… I did.`,
    `Some clunky bits, but the vibe is absolutely there.`,
    `This is either a 10/10 or a 6/10 depending on your mood. I’m in.`,
    `I’d watch a sequel tomorrow.`,
    `Neat premise — wish it trusted itself more.`,
    `It’s fine, but the pacing is allergic to breathing room.`,
    `This is the kind of movie you quote a week later.`,
  ];

  return Array.from({ length: 7 }, (_, i) => {
    const handle = stablePick(handles, `${seed}|handle|${i}`) || `user_${i + 1}`;
    const offset = stableInt(`${seed}|userStars|${i}`, -2, 2) * 0.5;
    const reviewStars = clamp(stars + offset, 0.5, 5);
    const body = stablePick(bodies, `${seed}|body|${i}`) || bodies[i % bodies.length];
    return { handle: `@${handle}`, stars: reviewStars, body: body.replace('{title}', title) };
  });
}

function derivePlayerReview(project: Project, stars: number, criticsScore: number, audienceScore: number, seed: string): { stars: number; body: string } {
  const profitHint = (() => {
    const budget = project.script?.budget ?? project.budget?.total ?? 0;
    const totalRevenue = project.metrics?.totalRevenue ?? project.metrics?.financials?.totalRevenue;
    if (typeof totalRevenue !== 'number' || budget <= 0) return null;

    const roi = (totalRevenue - budget) / budget;
    if (roi >= 0.75) return 'a clear win on the balance sheet';
    if (roi >= 0.15) return 'a respectable result financially';
    if (roi >= -0.1) return 'a near-break-even outcome';
    return 'a tough one to justify financially';
  })();

  const hook = stablePick(
    [
      'We kept the target in sight and delivered a clean release window.',
      'The execution held together under pressure, even when the calendar got tight.',
      'Not every swing landed, but the core idea came through on screen.',
      'The team pulled it back in the late weeks and shipped something coherent.',
    ],
    `${seed}|player-review-hook`
  ) || 'A release is a release.';

  const response = (() => {
    const avg = (criticsScore * 0.6) + (audienceScore * 0.4);
    if (avg >= 80) return 'The response was louder than we expected — in a good way.';
    if (avg >= 65) return 'The response was solid, with enough buzz to carry it.';
    if (avg >= 55) return 'The response was mixed, but it found an audience.';
    return 'The response was rough, and we felt it week to week.';
  })();

  const body = [hook, response, profitHint ? `From the business side, it was ${profitHint}.` : null]
    .filter(Boolean)
    .join(' ');

  return { stars, body };
}

function projectToMetaboxdTitle(gameState: GameState, project: Project): MetaboxdTitle {
  const criticsScore = clamp(Math.round(project.metrics?.criticsScore ?? 65), 1, 100);
  const audienceScore = clamp(Math.round(project.metrics?.audienceScore ?? 65), 1, 100);
  const seed = `${gameState.universeSeed || 'seed'}|metaboxd|${project.id}`;

  const indexScore = deriveIndexScore(criticsScore, audienceScore, seed);
  const consensus = project.metrics?.critical?.criticsConsensus?.trim()
    ? project.metrics.critical.criticsConsensus
    : deriveConsensus(project.title, criticsScore, audienceScore, seed);

  const stars = scoreToStars((criticsScore * 0.55) + (audienceScore * 0.45));

  const reviews = deriveCriticQuotes(project.title, criticsScore, seed);
  const userReviews = deriveUserReviews(project.title, stars, seed);

  const isTv = project.type === 'series' || project.type === 'limited-series';
  const isPlayerProject = gameState.projects.some((p) => p.id === project.id);
  const studioName = project.studioName && project.studioName.trim()
    ? project.studioName
    : (isPlayerProject ? gameState.studio.name : 'Unknown Studio');

  const directorName = (() => {
    if (!isPlayerProject) {
      const shared = project.metrics?.sharedDirectorName;
      if (typeof shared === 'string' && shared.trim()) return shared;
    }

    const roles = [...(project.crew || []), ...(project.cast || [])];
    const dir = roles.find((r) => r.role?.toLowerCase().includes('director'));
    const t = dir ? gameState.talent.find((x) => x.id === dir.talentId) : undefined;
    return t?.name;
  })();

  const topCast = (() => {
    if (!isPlayerProject) {
      const shared = project.metrics?.sharedTopCastNames;
      if (Array.isArray(shared) && shared.length) return shared.filter((x) => typeof x === 'string') as string[];
    }

    const roles = (project.cast || [])
      .filter((r) => !!r.talentId)
      .slice();

    const prioritized = roles
      .slice()
      .sort((a, b) => {
        const aLead = a.role?.toLowerCase().includes('lead') ? 1 : 0;
        const bLead = b.role?.toLowerCase().includes('lead') ? 1 : 0;
        if (aLead !== bLead) return bLead - aLead;
        return (b.salary || 0) - (a.salary || 0);
      })
      .slice(0, 4)
      .map((r) => gameState.talent.find((t) => t.id === r.talentId)?.name)
      .filter(Boolean) as string[];

    return prioritized.length > 0 ? prioritized : undefined;
  })();

  const runtimeMins = project.script?.estimatedRuntime;
  const budget = (() => {
    const raw = project.script?.budget ?? project.budget?.total;
    if (project.id.startsWith('league-')) return undefined;
    return raw;
  })();

  const boxOfficeTotal = project.metrics?.boxOfficeTotal;
  const streamingViews = project.metrics?.streamingViews ?? project.metrics?.streaming?.totalViews;

  const releaseLabel = project.metrics?.boxOfficeStatus || (isPrimaryStreamingFilm(project) ? 'Streaming Premiere' : undefined);
  const logline = project.script?.logline;

  const source = (() => {
    const sharedFranchiseTitle = project.metrics?.sharedFranchiseTitle;
    const sharedPublicDomainName = project.metrics?.sharedPublicDomainName;

    if (typeof sharedPublicDomainName === 'string' && sharedPublicDomainName.trim()) {
      return `Public domain: ${sharedPublicDomainName}`;
    }

    if (typeof sharedFranchiseTitle === 'string' && sharedFranchiseTitle.trim()) {
      return `Franchise: ${sharedFranchiseTitle}`;
    }

    const publicDomainId = project.script?.publicDomainId ?? project.publicDomainId;
    if (publicDomainId) {
      const local = (gameState.publicDomainIPs || []).find((ip) => ip.id === publicDomainId)?.name;
      if (local) return `Public domain: ${local}`;
    }

    const franchiseId = project.script?.franchiseId ?? project.franchiseId;
    if (franchiseId) {
      const local = (gameState.franchises || []).find((f) => f.id === franchiseId)?.title;
      if (local) return `Franchise: ${local}`;
    }

    return undefined;
  })();

  const playerReview = isPlayerProject
    ? derivePlayerReview(project, stars, criticsScore, audienceScore, seed)
    : undefined;

  return {
    id: project.id,
    title: project.title,
    kind: isTv ? 'tv' : 'film',
    studioName,
    releaseYear: project.releaseYear,
    genre: project.script?.genre,
    runtimeMins,
    budget,
    boxOfficeTotal,
    streamingViews,
    releaseLabel,
    logline,
    director: directorName,
    topCast,
    source,
    criticsScore,
    audienceScore,
    indexScore,
    consensus,
    stars,
    playerReview,
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

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stableSample<T>(items: T[], count: number, seed: string): T[] {
  if (!items.length || count <= 0) return [];

  const out: T[] = [];
  const used = new Set<number>();

  for (let i = 0; i < count && used.size < items.length; i += 1) {
    const idx = stableInt(`${seed}|pick|${i}`, 0, items.length - 1);
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(items[idx]);
  }

  return out;
}

function formatAge(days: number): string {
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.round(days / 7)}w ago`;
  if (days < 720) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

function criticBucket(score: number): 'raves' | 'mixed' | 'pans' {
  if (score >= 80) return 'raves';
  if (score >= 60) return 'mixed';
  return 'pans';
}

function memberBucket(stars: number): 'high' | 'mid' | 'low' {
  if (stars >= 4) return 'high';
  if (stars >= 2.5) return 'mid';
  return 'low';
}

export const Metaboxd: React.FC = () => {
  const gameState = useGameStore((s) => s.game);
  const [activeTab, setActiveTab] = useState<MetaboxdTitleKind | 'all'>('all');
  const [scope, setScope] = useState<'market' | 'yours'>('market');
  const [sortMode, setSortMode] = useState<'index' | 'recent' | 'critics' | 'audience'>('index');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const INITIAL_GRID_LIMIT = 18;
  const GRID_PAGE_SIZE = 18;
  const [gridLimit, setGridLimit] = useState(INITIAL_GRID_LIMIT);

  const [criticFilter, setCriticFilter] = useState<'all' | 'raves' | 'mixed' | 'pans'>('all');
  const [criticSort, setCriticSort] = useState<'helpful' | 'score'>('helpful');
  const [memberFilter, setMemberFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');
  const [memberSort, setMemberSort] = useState<'helpful' | 'recent' | 'rating'>('helpful');

  useEffect(() => {
    setCriticFilter('all');
    setCriticSort('helpful');
    setMemberFilter('all');
    setMemberSort('helpful');
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) setGridLimit(INITIAL_GRID_LIMIT);
  }, [selectedId, INITIAL_GRID_LIMIT]);

  useEffect(() => {
    setGridLimit(INITIAL_GRID_LIMIT);
  }, [activeTab, scope, sortMode, query, INITIAL_GRID_LIMIT]);

  const titles = useMemo(() => {
    if (!gameState) return [] as MetaboxdTitle[];

    const releases = [
      ...(gameState.allReleases || [])
        .filter((r: any): r is Project => !!r && typeof r === 'object' && 'script' in r),
      ...(gameState.projects || []).filter((p: Project) => !!p && typeof p === 'object'),
    ].filter((p: Project) => p.status === 'released');

    const byId = new Map<string, Project>();
    const order: string[] = [];

    for (const p of releases) {
      if (!p?.id) continue;
      if (!byId.has(p.id)) order.push(p.id);
      byId.set(p.id, p);
    }

    const mapped = order
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((p) => projectToMetaboxdTitle(gameState, p as Project));

    return mapped
      .sort((a, b) => (b.indexScore - a.indexScore) || a.title.localeCompare(b.title));
  }, [gameState]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const yourStudio = gameState?.studio?.name;

    return titles
      .filter((t) => (activeTab === 'all' ? true : t.kind === activeTab))
      .filter((t) => (scope === 'yours' && yourStudio ? t.studioName === yourStudio : true))
      .filter((t) => (!q ? true : `${t.title} ${t.studioName}`.toLowerCase().includes(q)));
  }, [titles, query, activeTab, scope, gameState?.studio?.name]);

  const visible = useMemo(() => {
    const list = filtered.slice();

    if (sortMode === 'recent') {
      return list.sort((a, b) => {
        const ay = a.releaseYear ?? -1;
        const by = b.releaseYear ?? -1;
        if (by !== ay) return by - ay;
        return (b.indexScore - a.indexScore) || a.title.localeCompare(b.title);
      });
    }

    if (sortMode === 'critics') {
      return list.sort((a, b) => (b.criticsScore - a.criticsScore) || (b.indexScore - a.indexScore));
    }

    if (sortMode === 'audience') {
      return list.sort((a, b) => (b.audienceScore - a.audienceScore) || (b.indexScore - a.indexScore));
    }

    return list.sort((a, b) => (b.indexScore - a.indexScore) || a.title.localeCompare(b.title));
  }, [filtered, sortMode]);

  const spotlight = visible[0] || null;
  const spotlightId = spotlight?.id ?? null;

  const gridTitles = useMemo(() => {
    if (!spotlightId) return visible;
    return visible.filter((t) => t.id !== spotlightId);
  }, [visible, spotlightId]);

  const gridVisible = useMemo(() => gridTitles.slice(0, gridLimit), [gridTitles, gridLimit]);

  const selected = useMemo(
    () => (selectedId ? titles.find((t) => t.id === selectedId) || null : null),
    [titles, selectedId]
  );

  const reviewSeed = `${gameState?.universeSeed || 'seed'}|metaboxd|${selected?.id || 'none'}`;

  const criticReviews = useMemo(() => {
    if (!selected) return [] as Array<{ source: string; score: number; quote: string; helpful: number; ageDays: number }>;

    return selected.reviews.map((r, i) => ({
      ...r,
      helpful: stableInt(`${reviewSeed}|critic-helpful|${i}`, 8, 260),
      ageDays: stableInt(`${reviewSeed}|critic-age|${i}`, 3, 720),
    }));
  }, [selected, reviewSeed]);

  const memberReviews = useMemo(() => {
    if (!selected) return [] as Array<{ handle: string; stars: number; body: string; helpful: number; ageDays: number }>;

    return selected.userReviews.map((r, i) => ({
      ...r,
      helpful: stableInt(`${reviewSeed}|member-helpful|${i}`, 0, 520),
      ageDays: stableInt(`${reviewSeed}|member-age|${i}`, 1, 480),
    }));
  }, [selected, reviewSeed]);

  const criticSummary = useMemo(() => {
    const total = criticReviews.length;
    const avg = total ? mean(criticReviews.map((r) => r.score)) : 0;

    const buckets = [
      { key: '90+', from: 90, to: 100 },
      { key: '80s', from: 80, to: 89 },
      { key: '70s', from: 70, to: 79 },
      { key: '60s', from: 60, to: 69 },
      { key: '<60', from: 0, to: 59 },
    ];

    const dist = buckets.map((b) => {
      const count = criticReviews.filter((r) => r.score >= b.from && r.score <= b.to).length;
      return { label: b.key, count, pct: total ? count / total : 0 };
    });

    return { total, avg, dist };
  }, [criticReviews]);

  const memberSummary = useMemo(() => {
    const total = memberReviews.length;
    const avg = total ? mean(memberReviews.map((r) => r.stars)) : 0;

    const buckets = [
      { key: '4–5', test: (s: number) => s >= 4 },
      { key: '3–3½', test: (s: number) => s >= 3 && s < 4 },
      { key: '2–2½', test: (s: number) => s >= 2 && s < 3 },
      { key: '0½–1½', test: (s: number) => s < 2 },
    ];

    const dist = buckets.map((b) => {
      const count = memberReviews.filter((r) => b.test(r.stars)).length;
      return { label: b.key, count, pct: total ? count / total : 0 };
    });

    return { total, avg, dist };
  }, [memberReviews]);

  const visibleCriticReviews = useMemo(() => {
    const scoped = criticFilter === 'all'
      ? criticReviews
      : criticReviews.filter((r) => criticBucket(r.score) === criticFilter);

    const list = scoped.slice();

    if (criticSort === 'score') {
      return list.sort((a, b) => (b.score - a.score) || (b.helpful - a.helpful));
    }

    return list.sort((a, b) => (b.helpful - a.helpful) || (b.score - a.score));
  }, [criticReviews, criticFilter, criticSort]);

  const visibleMemberReviews = useMemo(() => {
    const scoped = memberFilter === 'all'
      ? memberReviews
      : memberReviews.filter((r) => memberBucket(r.stars) === memberFilter);

    const list = scoped.slice();

    if (memberSort === 'rating') {
      return list.sort((a, b) => (b.stars - a.stars) || (b.helpful - a.helpful));
    }

    if (memberSort === 'recent') {
      return list.sort((a, b) => (a.ageDays - b.ageDays) || (b.helpful - a.helpful));
    }

    return list.sort((a, b) => (b.helpful - a.helpful) || (b.stars - a.stars));
  }, [memberReviews, memberFilter, memberSort]);

  const criticTags = useMemo(() => {
    if (!selected) return [] as string[];
    const bank = [
      'performances',
      'direction',
      'script',
      'tone',
      'pacing',
      'visual craft',
      'set pieces',
      'dialogue',
      'worldbuilding',
      'ending',
    ];

    const tagCount = selected.criticsScore >= 75 ? 4 : 3;
    return stableSample(bank, tagCount, `${reviewSeed}|critic-tags|${criticBucket(selected.criticsScore)}`);
  }, [selected, reviewSeed]);

  const audienceTags = useMemo(() => {
    if (!selected) return [] as string[];
    const bank = [
      'rewatchable',
      'big moments',
      'slow burn',
      'crowd energy',
      'quotable',
      'comfort watch',
      'surprisingly emotional',
      'killer finale',
      'buzzy',
      'divisive',
    ];

    const gap = Math.abs(selected.criticsScore - selected.audienceScore);
    const base = stableSample(bank, 4, `${reviewSeed}|audience-tags`);
    if (gap >= 18 && !base.includes('divisive')) base.push('divisive');
    return base.slice(0, 5);
  }, [selected, reviewSeed]);

  const yourStudioName = gameState?.studio?.name;

  const yourLatest = useMemo(() => {
    if (!yourStudioName) return [] as MetaboxdTitle[];
    return titles
      .filter((t) => t.studioName === yourStudioName)
      .slice()
      .sort((a, b) => {
        const ay = a.releaseYear ?? -1;
        const by = b.releaseYear ?? -1;
        if (by !== ay) return by - ay;
        return (b.indexScore - a.indexScore) || a.title.localeCompare(b.title);
      })
      .slice(0, 5);
  }, [titles, yourStudioName]);

  const topStudios = useMemo(() => {
    const bucket = new Map<string, { studioName: string; count: number; avgIndex: number }>();

    for (const t of titles) {
      const prev = bucket.get(t.studioName) || { studioName: t.studioName, count: 0, avgIndex: 0 };
      const nextCount = prev.count + 1;
      const nextAvg = (prev.avgIndex * prev.count + t.indexScore) / nextCount;
      bucket.set(t.studioName, { studioName: t.studioName, count: nextCount, avgIndex: nextAvg });
    }

    return Array.from(bucket.values())
      .sort((a, b) => (b.avgIndex - a.avgIndex) || (b.count - a.count) || a.studioName.localeCompare(b.studioName))
      .slice(0, 6);
  }, [titles]);

  const gridShownCount = gridVisible.length + (spotlightId ? 1 : 0);
  const canLoadMore = gridLimit < gridTitles.length;
  const canCollapse = gridLimit > INITIAL_GRID_LIMIT;

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

        <div className="metaboxd-account" aria-label="Current studio">
          <div className="metaboxd-account-name">{gameState.studio.name}</div>
          <div className="metaboxd-account-sub">Studio profile</div>
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
                  Showing {gridShownCount} of {visible.length} title{visible.length === 1 ? '' : 's'} • ranked by Index
                </div>
              </div>

              <div className="metaboxd-panel-tools">
                <label className="metaboxd-select-label" htmlFor="metaboxd-sort">Sort</label>
                <select
                  id="metaboxd-sort"
                  className="metaboxd-select"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as any)}
                >
                  <option value="index">Index</option>
                  <option value="recent">Newest</option>
                  <option value="critics">Critics</option>
                  <option value="audience">Audience</option>
                </select>

                <div className={`metaboxd-badge ${badgeClass(Math.round(gameState.studio.reputation || 0))}`}>
                  Studio Rep {Math.round(gameState.studio.reputation || 0)}
                </div>
              </div>
            </div>

            {spotlight && (
              <div className="metaboxd-spotlight">
                <button
                  type="button"
                  className="metaboxd-spotlight-poster"
                  onClick={() => setSelectedId(spotlight.id)}
                  aria-label={`Open spotlight: ${spotlight.title}`}
                >
                  <div className="metaboxd-poster-box">
                    <div className="metaboxd-poster-initials">{titleInitials(spotlight.title)}</div>
                    <div className="metaboxd-poster-rating">{spotlight.indexScore}</div>
                  </div>
                </button>

                <div className="metaboxd-spotlight-body">
                  <div className="metaboxd-spotlight-kicker">Spotlight</div>
                  <div className="metaboxd-spotlight-title">{spotlight.title}</div>
                  <div className="metaboxd-spotlight-meta">
                    {spotlight.releaseYear ?? '—'} • {spotlight.kind === 'film' ? 'Film' : 'TV'} • {spotlight.studioName}{spotlight.genre ? ` • ${spotlight.genre}` : ''}
                  </div>

                  <div className="metaboxd-spotlight-scores">
                    <div className={`metaboxd-pill ${badgeClass(spotlight.indexScore)}`}>Index {spotlight.indexScore}</div>
                    <div className={`metaboxd-pill ${badgeClass(spotlight.criticsScore)}`}>Critics {spotlight.criticsScore}</div>
                    <div className={`metaboxd-pill ${badgeClass(spotlight.audienceScore)}`}>Audience {spotlight.audienceScore}</div>
                    <div className="metaboxd-pill">{formatStars(spotlight.stars)}</div>
                  </div>

                  <div className="metaboxd-spotlight-blurb">
                    {spotlight.logline?.trim() ? spotlight.logline : spotlight.consensus}
                  </div>

                  <div className="metaboxd-spotlight-actions">
                    <button type="button" className="metaboxd-btn" onClick={() => setSelectedId(spotlight.id)}>
                      View page
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="metaboxd-grid">
              {gridVisible.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="metaboxd-poster"
                  onClick={() => setSelectedId(t.id)}
                  aria-label={`Open ${t.title}`}
                >
                  <div className="metaboxd-poster-box">
                    <div className="metaboxd-poster-initials">{titleInitials(t.title)}</div>
                    <div className="metaboxd-poster-rating">{t.indexScore}</div>
                    {scope === 'yours' && t.playerReview && (
                      <div className="metaboxd-poster-your">{formatStars(t.playerReview.stars)}</div>
                    )}
                  </div>
                  <div className="metaboxd-poster-meta">
                    <div className="metaboxd-title">{t.title}</div>
                    <div className="metaboxd-subline">
                      {t.releaseYear ?? '—'} • {t.studioName}
                    </div>
                    <div className="metaboxd-subline metaboxd-subline-2">
                      {formatStars(t.stars)} • Index {t.indexScore}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {(canLoadMore || canCollapse) && (
              <div className="metaboxd-grid-footer" aria-label="Metaboxd listings pagination">
                <div className="metaboxd-grid-footer-left">
                  Showing {gridShownCount} / {visible.length}
                </div>

                <div className="metaboxd-grid-footer-actions">
                  {canCollapse && (
                    <button
                      type="button"
                      className="metaboxd-btn metaboxd-btn-ghost"
                      onClick={() => setGridLimit(INITIAL_GRID_LIMIT)}
                    >
                      Show fewer
                    </button>
                  )}
                  {canLoadMore && (
                    <button
                      type="button"
                      className="metaboxd-btn metaboxd-btn-secondary"
                      onClick={() => setGridLimit((n) => Math.min(n + GRID_PAGE_SIZE, gridTitles.length))}
                    >
                      Load more
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          <aside className="metaboxd-sidebar" aria-label="Metaboxd sidebar">
            <div className="metaboxd-panel metaboxd-sidebar-sticky">
              <div className="metaboxd-panel-header">
                <div>
                  <div className="metaboxd-panel-title">At a glance</div>
                  <div className="metaboxd-panel-subtitle">Your studio, the market, and the numbers</div>
                </div>
              </div>
              <div className="metaboxd-list">
                <div className="metaboxd-list-item">
                  <div className="metaboxd-list-item-title">{gameState.studio.name}</div>
                  <div className="metaboxd-list-item-meta">
                    Budget {(gameState.studio.budget / 1_000_000).toFixed(0)}M • Rep {Math.round(gameState.studio.reputation)}/100
                  </div>
                </div>

                <div className="metaboxd-list-item">
                  <div className="metaboxd-list-item-title">Top Index</div>
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
                        {' '}— {titles[0].indexScore}
                      </>
                    ) : (
                      'No releases yet.'
                    )}
                  </div>
                </div>

                <div className="metaboxd-list-item">
                  <div className="metaboxd-list-item-title">Tracked releases</div>
                  <div className="metaboxd-list-item-meta">
                    {gameState.allReleases.filter((r: any) => r && r.status === 'released').length} titles in the current archive window
                  </div>
                </div>

                <div className="metaboxd-list-item">
                  <div className="metaboxd-list-item-title">Reading the Index</div>
                  <div className="metaboxd-list-item-meta">
                    Index ≈ 85% critics + 15% audience, with a small variance. It’s not "truth" — it’s a temperature.
                  </div>
                </div>
              </div>
            </div>

            <div className="metaboxd-panel">
              <div className="metaboxd-panel-header">
                <div>
                  <div className="metaboxd-panel-title">Top studios</div>
                  <div className="metaboxd-panel-subtitle">Average Index (tracked titles)</div>
                </div>
              </div>
              <div className="metaboxd-list">
                {topStudios.map((s, i) => (
                  <div key={s.studioName} className="metaboxd-list-item">
                    <div className="metaboxd-list-item-title">{i + 1}. {s.studioName}</div>
                    <div className="metaboxd-list-item-meta">
                      Avg Index {Math.round(s.avgIndex)} • {s.count} title{s.count === 1 ? '' : 's'}
                    </div>
                  </div>
                ))}
                {topStudios.length === 0 && (
                  <div className="metaboxd-list-item">
                    <div className="metaboxd-list-item-meta">No studios tracked yet.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="metaboxd-panel">
              <div className="metaboxd-panel-header">
                <div>
                  <div className="metaboxd-panel-title">Your latest</div>
                  <div className="metaboxd-panel-subtitle">Recent entries from your slate</div>
                </div>
              </div>
              <div className="metaboxd-list">
                {yourLatest.map((t) => (
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
                      {formatStars(t.stars)} • Index {t.indexScore}
                    </div>
                  </div>
                ))}
                {yourLatest.length === 0 && (
                  <div className="metaboxd-list-item">
                    <div className="metaboxd-list-item-meta">No released titles from your studio yet.</div>
                  </div>
                )}
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
                  <div className="metaboxd-poster-rating">{selected.indexScore}</div>
                </div>

                <div>
                  <div className="metaboxd-detail-title">{selected.title}</div>
                  <div className="metaboxd-detail-meta">
                    {selected.releaseYear ?? '—'} • {selected.kind === 'film' ? 'Film' : 'TV'} • {selected.studioName}{selected.genre ? ` • ${selected.genre}` : ''}
                  </div>

                  <div className="metaboxd-rating-row">
                    <div className="metaboxd-rating-card">
                      <div className="metaboxd-rating-label">Index</div>
                      <div className={`metaboxd-rating-value ${badgeClass(selected.indexScore)}`}>{selected.indexScore}</div>
                      <div className="metaboxd-rating-sub">Weighted roll-up</div>
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

                  <div className="metaboxd-snapshots">
                    <div className="metaboxd-snapshot">
                      <div className="metaboxd-snapshot-head">
                        <div>
                          <div className="metaboxd-snapshot-title">Critic reviews</div>
                          <div className="metaboxd-snapshot-meta">
                            {criticSummary.total} blurbs • avg {Math.round(criticSummary.avg)}/100
                          </div>
                        </div>
                      </div>
                      <div className="metaboxd-dist">
                        {criticSummary.dist.map((d) => (
                          <div key={d.label} className="metaboxd-dist-row">
                            <div className="metaboxd-dist-label">{d.label}</div>
                            <div className="metaboxd-dist-bar" aria-hidden="true">
                              <div className="metaboxd-dist-fill" style={{ width: `${Math.round(d.pct * 100)}%` }} />
                            </div>
                            <div className="metaboxd-dist-count">{d.count}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="metaboxd-snapshot">
                      <div className="metaboxd-snapshot-head">
                        <div>
                          <div className="metaboxd-snapshot-title">Member ratings</div>
                          <div className="metaboxd-snapshot-meta">
                            {memberSummary.total} reviews • avg {memberSummary.avg.toFixed(1)} / 5
                          </div>
                        </div>
                      </div>
                      <div className="metaboxd-dist">
                        {memberSummary.dist.map((d) => (
                          <div key={d.label} className="metaboxd-dist-row">
                            <div className="metaboxd-dist-label">{d.label}</div>
                            <div className="metaboxd-dist-bar" aria-hidden="true">
                              <div className="metaboxd-dist-fill" style={{ width: `${Math.round(d.pct * 100)}%` }} />
                            </div>
                            <div className="metaboxd-dist-count">{d.count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="metaboxd-tag-section">
                    <div className="metaboxd-tag-block">
                      <div className="metaboxd-tag-kicker">Critics highlight</div>
                      <div className="metaboxd-tag-row">
                        {criticTags.map((t) => (
                          <span key={t} className="metaboxd-chip">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="metaboxd-tag-block">
                      <div className="metaboxd-tag-kicker">Audience buzz</div>
                      <div className="metaboxd-tag-row">
                        {audienceTags.map((t) => (
                          <span key={t} className="metaboxd-chip">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="metaboxd-section">
                    <div className="metaboxd-section-kicker">Critics consensus</div>
                    <div className="metaboxd-section-body">{selected.consensus}</div>
                  </div>

                  <div className="metaboxd-section">
                    <div className="metaboxd-section-kicker">Metaboxd rating</div>
                    <div className="metaboxd-section-body">
                      <span className="metaboxd-stars">{formatStars(selected.stars)}</span>
                      <span className="metaboxd-stars-sub">({selected.stars.toFixed(1)} / 5)</span>
                    </div>
                  </div>

                  {selected.logline?.trim() && (
                    <div className="metaboxd-section">
                      <div className="metaboxd-section-kicker">Synopsis</div>
                      <div className="metaboxd-section-body">{selected.logline}</div>
                    </div>
                  )}

                  <div className="metaboxd-facts">
                    <div className="metaboxd-fact">
                      <div className="metaboxd-fact-label">Release</div>
                      <div className="metaboxd-fact-value">{selected.releaseLabel || '—'}</div>
                    </div>
                    <div className="metaboxd-fact">
                      <div className="metaboxd-fact-label">Runtime</div>
                      <div className="metaboxd-fact-value">{typeof selected.runtimeMins === 'number' ? `${selected.runtimeMins} min` : '—'}</div>
                    </div>
                    <div className="metaboxd-fact">
                      <div className="metaboxd-fact-label">Director</div>
                      <div className="metaboxd-fact-value">{selected.director || '—'}</div>
                    </div>
                    <div className="metaboxd-fact">
                      <div className="metaboxd-fact-label">Top cast</div>
                      <div className="metaboxd-fact-value">{selected.topCast?.length ? selected.topCast.join(', ') : '—'}</div>
                    </div>
                    <div className="metaboxd-fact">
                      <div className="metaboxd-fact-label">Source</div>
                      <div className="metaboxd-fact-value">{selected.source || '—'}</div>
                    </div>
                    <div className="metaboxd-fact">
                      <div className="metaboxd-fact-label">Budget</div>
                      <div className="metaboxd-fact-value">
                        {typeof selected.budget === 'number' ? '\u0024' + (selected.budget / 1_000_000).toFixed(0) + 'M' : '—'}
                      </div>
                    </div>
                  </div>

                  {(typeof selected.boxOfficeTotal === 'number' || typeof selected.streamingViews === 'number') && (
                    <div className="metaboxd-performance">
                      <div className="metaboxd-section-kicker">Performance</div>
                      <div className="metaboxd-performance-grid">
                        <div className="metaboxd-perf">
                          <div className="metaboxd-perf-label">Box office</div>
                          <div className="metaboxd-perf-value">
                            {typeof selected.boxOfficeTotal === 'number' ? '\u0024' + (selected.boxOfficeTotal / 1_000_000).toFixed(1) + 'M' : '—'}
                          </div>
                        </div>
                        <div className="metaboxd-perf">
                          <div className="metaboxd-perf-label">Streaming views</div>
                          <div className="metaboxd-perf-value">
                            {typeof selected.streamingViews === 'number' ? (selected.streamingViews / 1_000_000).toFixed(1) + 'M' : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selected.playerReview && (
                    <div className="metaboxd-player-review">
                      <div className="metaboxd-section-kicker">Your memo</div>
                      <div className="metaboxd-player-review-head">
                        <div className="metaboxd-player-review-stars">{formatStars(selected.playerReview.stars)}</div>
                        <div className="metaboxd-player-review-sub">Internal notes • read-only</div>
                      </div>
                      <div className="metaboxd-player-review-body">{selected.playerReview.body}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="metaboxd-reviews-grid">
              <div className="metaboxd-review-panel">
                <div className="metaboxd-panel-header metaboxd-review-panel-header">
                  <div>
                    <div className="metaboxd-panel-title">Critic blurbs</div>
                    <div className="metaboxd-panel-subtitle">
                      {visibleCriticReviews.length} of {criticReviews.length} • filter {criticFilter} • sort {criticSort}
                    </div>
                  </div>

                  <div className="metaboxd-review-tools">
                    <div className="metaboxd-chip-row" aria-label="Critic filters">
                      {([
                        { k: 'all', label: 'All' },
                        { k: 'raves', label: 'Raves' },
                        { k: 'mixed', label: 'Mixed' },
                        { k: 'pans', label: 'Pans' },
                      ] as const).map((f) => (
                        <button
                          key={f.k}
                          type="button"
                          className={f.k === criticFilter ? 'metaboxd-chip active' : 'metaboxd-chip'}
                          onClick={() => setCriticFilter(f.k)}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <select
                      className="metaboxd-select"
                      value={criticSort}
                      onChange={(e) => setCriticSort(e.target.value as any)}
                      aria-label="Critic sort"
                    >
                      <option value="helpful">Helpful</option>
                      <option value="score">Score</option>
                    </select>
                  </div>
                </div>

                <div className="metaboxd-review-list">
                  {visibleCriticReviews.map((r, i) => (
                    <div key={`${r.source}-${i}`} className="metaboxd-review">
                      <div className="metaboxd-review-head">
                        <div className="metaboxd-review-source">{r.source}</div>
                        <div className="metaboxd-review-score">{r.score}/100</div>
                      </div>
                      <div className="metaboxd-review-body">“{r.quote}”</div>
                      <div className="metaboxd-review-foot">
                        <div className="metaboxd-review-foot-left">{formatAge(r.ageDays)}</div>
                        <div className="metaboxd-review-foot-right">Helpful {r.helpful}</div>
                      </div>
                    </div>
                  ))}

                  {visibleCriticReviews.length === 0 && (
                    <div className="metaboxd-review metaboxd-review-empty">No critic blurbs match this filter.</div>
                  )}
                </div>
              </div>

              <div className="metaboxd-review-panel">
                <div className="metaboxd-panel-header metaboxd-review-panel-header">
                  <div>
                    <div className="metaboxd-panel-title">Member reviews</div>
                    <div className="metaboxd-panel-subtitle">
                      {visibleMemberReviews.length} of {memberReviews.length} • filter {memberFilter} • sort {memberSort}
                    </div>
                  </div>

                  <div className="metaboxd-review-tools">
                    <div className="metaboxd-chip-row" aria-label="Member filters">
                      {([
                        { k: 'all', label: 'All' },
                        { k: 'high', label: '4–5★' },
                        { k: 'mid', label: '2½–3½★' },
                        { k: 'low', label: '0½–2★' },
                      ] as const).map((f) => (
                        <button
                          key={f.k}
                          type="button"
                          className={f.k === memberFilter ? 'metaboxd-chip active' : 'metaboxd-chip'}
                          onClick={() => setMemberFilter(f.k)}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <select
                      className="metaboxd-select"
                      value={memberSort}
                      onChange={(e) => setMemberSort(e.target.value as any)}
                      aria-label="Member sort"
                    >
                      <option value="helpful">Helpful</option>
                      <option value="recent">Recent</option>
                      <option value="rating">Rating</option>
                    </select>
                  </div>
                </div>

                <div className="metaboxd-review-list">
                  {visibleMemberReviews.map((r, i) => (
                    <div key={`${r.handle}-${i}`} className="metaboxd-review">
                      <div className="metaboxd-review-head">
                        <div className="metaboxd-review-source">{r.handle}</div>
                        <div className="metaboxd-review-score">{formatStars(r.stars)}</div>
                      </div>
                      <div className="metaboxd-review-body">{r.body}</div>
                      <div className="metaboxd-review-foot">
                        <div className="metaboxd-review-foot-left">{formatAge(r.ageDays)}</div>
                        <div className="metaboxd-review-foot-right">Helpful {r.helpful}</div>
                      </div>
                    </div>
                  ))}

                  {visibleMemberReviews.length === 0 && (
                    <div className="metaboxd-review metaboxd-review-empty">No member reviews match this filter.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="metaboxd-sidebar">
            <div className="metaboxd-panel metaboxd-sidebar-sticky">
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
                        {t.releaseYear ?? '—'} • Index {t.indexScore}
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
