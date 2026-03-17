import type { GameState, Genre, Project, ProjectBudget, ProjectMetrics, Script } from '@/types/game';
import { CORE_TALENT_BIBLE } from '@/data/WorldBible';
import { WORLD_ICONIC_RELEASES, type IconicReleaseDefinition } from '@/data/WorldIconicReleases';
import { stableInt } from '@/utils/stableRandom';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function dateForWeek(year: number, week: number): Date {
  return new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

const nameBySlug = (() => {
  const m = new Map<string, string>();
  for (const b of CORE_TALENT_BIBLE) m.set(b.slug, b.name);
  return m;
})();

function creditNames(def: IconicReleaseDefinition): { directorName?: string; topCastNames: string[] } {
  const directorSlug = def.credits.find((c) => c.role.toLowerCase().includes('director'))?.slug;
  const directorName = directorSlug ? nameBySlug.get(directorSlug) : def.directorNameOverride;

  const castSlugs = def.credits
    .filter((c) => !c.role.toLowerCase().includes('director'))
    .map((c) => c.slug);

  const out: string[] = [];

  for (const slug of castSlugs) {
    const nm = nameBySlug.get(slug);
    if (nm) out.push(nm);
  }

  for (const nm of def.extraTopCastNames || []) out.push(nm);

  return {
    directorName,
    topCastNames: out.filter(Boolean).slice(0, 4),
  };
}

function defaultCharacteristics(genre: Genre, criticsScore: number, audienceScore: number): Script['characteristics'] {
  const commercial = clamp(Math.round(audienceScore / 10), 1, 10);
  const critical = clamp(Math.round(criticsScore / 10), 1, 10);

  if (genre === 'action' || genre === 'superhero' || genre === 'adventure') {
    return {
      tone: 'balanced',
      pacing: 'fast-paced',
      dialogue: 'witty',
      visualStyle: 'epic',
      commercialAppeal: clamp(commercial + 2, 1, 10),
      criticalPotential: clamp(critical - 1, 1, 10),
      cgiIntensity: 'heavy',
    };
  }

  if (genre === 'comedy' || genre === 'romance') {
    return {
      tone: 'light',
      pacing: 'steady',
      dialogue: 'witty',
      visualStyle: 'realistic',
      commercialAppeal: clamp(commercial + 1, 1, 10),
      criticalPotential: clamp(critical, 1, 10),
      cgiIntensity: 'minimal',
    };
  }

  if (genre === 'sci-fi' || genre === 'fantasy') {
    return {
      tone: 'dramatic',
      pacing: 'steady',
      dialogue: 'stylized',
      visualStyle: 'epic',
      commercialAppeal: clamp(commercial + 1, 1, 10),
      criticalPotential: clamp(critical, 1, 10),
      cgiIntensity: 'moderate',
    };
  }

  return {
    tone: 'dramatic',
    pacing: 'slow-burn',
    dialogue: 'naturalistic',
    visualStyle: 'realistic',
    commercialAppeal: clamp(commercial, 1, 10),
    criticalPotential: clamp(critical + 1, 1, 10),
    cgiIntensity: 'minimal',
  };
}

function buildBudget(total: number): ProjectBudget {
  const alloc = {
    aboveTheLine: Math.round(total * 0.28),
    belowTheLine: Math.round(total * 0.42),
    postProduction: Math.round(total * 0.14),
    marketing: Math.round(total * 0.12),
    distribution: Math.round(total * 0.03),
    contingency: Math.max(0, total - (Math.round(total * 0.28) + Math.round(total * 0.42) + Math.round(total * 0.14) + Math.round(total * 0.12) + Math.round(total * 0.03))),
  };

  return {
    total,
    allocated: alloc,
    spent: { ...alloc },
    overages: {
      aboveTheLine: 0,
      belowTheLine: 0,
      postProduction: 0,
      marketing: 0,
      distribution: 0,
      contingency: 0,
    },
  };
}

function buildScript(def: IconicReleaseDefinition): Script {
  const quality = clamp(Math.round(def.criticsScore * 0.65 + def.audienceScore * 0.35), 35, 97);

  return {
    id: `script:${def.id}`,
    title: def.title,
    genre: def.genre,
    subgenre: def.subgenre,
    logline: def.logline,
    writer: 'Staff Writers',
    pages: Math.max(45, Math.round(def.runtimeMins * 0.9)),
    quality,
    budget: def.budget,
    developmentStage: 'final',
    themes: [],
    targetAudience: def.genre === 'family' ? 'family' : 'general',
    estimatedRuntime: def.runtimeMins,
    characteristics: defaultCharacteristics(def.genre, def.criticsScore, def.audienceScore),
    characters: [],
    sourceType: 'original',
  };
}

function buildMetrics(state: GameState, def: IconicReleaseDefinition, releaseWeek: number): ProjectMetrics {
  const nowAbs = absWeek(state.currentWeek, state.currentYear);
  const relAbs = absWeek(releaseWeek, def.releaseYear);

  const base: ProjectMetrics = {
    criticsScore: def.criticsScore,
    audienceScore: def.audienceScore,
    weeksSinceRelease: Math.max(0, nowAbs - relAbs),
    theatricalRunLocked: true,
  };

  if (typeof def.boxOfficeTotal === 'number') {
    const total = def.boxOfficeTotal;
    const opening = Math.round(total * 0.28);
    const domestic = Math.round(total * 0.45);
    const international = total - domestic;

    return {
      ...base,
      boxOfficeTotal: total,
      boxOfficeStatus: total >= 500_000_000 ? 'Blockbuster' : total >= 100_000_000 ? 'Hit' : total >= 30_000_000 ? 'Modest' : 'Flop',
      boxOffice: {
        openingWeekend: opening,
        domesticTotal: domestic,
        internationalTotal: international,
        production: Math.round(def.budget * 0.75),
        marketing: Math.round(def.budget * 0.2),
        profit: total - Math.round(def.budget * 0.95),
        theaters: total >= 250_000_000 ? 4200 : 2800,
        weeks: total >= 300_000_000 ? 14 : 10,
      },
    };
  }

  if (typeof def.streamingTotalViews === 'number') {
    const totalViews = def.streamingTotalViews;
    const viewsFirstWeek = Math.round(totalViews * 0.28);

    return {
      ...base,
      streamingViews: totalViews,
      streaming: {
        viewsFirstWeek,
        totalViews,
        completionRate: clamp(55 + Math.round((def.audienceScore - 50) * 0.6), 20, 95),
        audienceShare: clamp(6 + Math.round((def.audienceScore - 60) * 0.15), 1, 25),
        watchTimeHours: Math.round((totalViews * def.runtimeMins) / 60),
        subscriberGrowth: clamp(Math.round((def.audienceScore - 60) * 0.08), 0, 8),
      },
    };
  }

  return base;
}

function buildIconicProject(state: GameState, def: IconicReleaseDefinition): Project {
  const universeSeed = state.universeSeed ?? state.rngState ?? 0;
  const releaseWeek = stableInt(`${universeSeed}|iconicRelease|week|${def.id}`, 1, 52);
  const releaseDate = dateForWeek(def.releaseYear, releaseWeek);

  const { directorName, topCastNames } = creditNames(def);

  const type: Project['type'] = def.kind === 'tv' ? (def.tv?.type ?? 'limited-series') : 'feature';
  const episodeCount = def.kind === 'tv' ? def.tv?.episodeCount : undefined;
  const releaseFormat = def.kind === 'tv' ? def.tv?.releaseFormat : undefined;

  const script = buildScript(def);
  const budget = buildBudget(def.budget);

  const metrics: ProjectMetrics = {
    ...buildMetrics(state, def, releaseWeek),
    sharedDirectorName: directorName,
    sharedTopCastNames: topCastNames,
  };

  // Give Metaboxd + DB stable enough timestamps for sorting.
  const pre = addDays(releaseDate, -140);
  const shoot = addDays(releaseDate, -70);
  const post = addDays(releaseDate, -30);

  return {
    id: def.id,
    title: def.title,
    script,
    type,
    status: 'released',
    currentPhase: 'distribution',
    phaseDuration: -1,
    studioName: def.studioName,
    episodeCount,
    releaseFormat,
    budget,
    cast: [],
    crew: [],
    locations: [],
    timeline: {
      preProduction: { start: pre, end: shoot },
      principalPhotography: { start: shoot, end: post },
      postProduction: { start: post, end: releaseDate },
      release: releaseDate,
      milestones: [],
    },
    distributionStrategy: {
      primary:
        def.kind === 'tv'
          ? { platform: 'Streamflix', type: 'streaming', revenue: { type: 'subscription-share', studioShare: 60 } }
          : { platform: 'Theaters', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } },
      international: [],
      windows: [],
      marketingBudget: budget.allocated.marketing,
    },
    contractedTalent: [],
    developmentProgress: {
      scriptCompletion: 100,
      budgetApproval: 100,
      talentAttached: 100,
      locationSecured: 100,
      completionThreshold: 100,
      issues: [],
    },
    metrics,
    releaseYear: def.releaseYear,
  } as Project;
}

export function seedIconicReleasesState(state: GameState): GameState {
  if (state.mode === 'online') return state;

  const currentYear = state.currentYear ?? 0;
  const cutoffYear = currentYear - 2;

  const candidates = WORLD_ICONIC_RELEASES.filter((d) => d.releaseYear <= cutoffYear);
  if (candidates.length === 0) return state;

  const baseAllReleases = state.allReleases || [];
  const existingIds = new Set(
    baseAllReleases
      .map((r: any) => (r && typeof r === 'object' ? (r as any).id : undefined))
      .filter((id: any): id is string => typeof id === 'string')
  );

  const additions: Project[] = [];

  for (const def of candidates) {
    if (existingIds.has(def.id)) continue;
    additions.push(buildIconicProject(state, def));
  }

  if (additions.length === 0) return state;

  return {
    ...state,
    allReleases: [...baseAllReleases, ...additions],
  };
}
