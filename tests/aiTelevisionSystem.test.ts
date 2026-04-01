import { describe, expect, it } from 'vitest';
import type { GameState, Project, Studio } from '@/types/game';
import type { SeededRng } from '@/game/core/rng';
import { AiTelevisionSystem } from '@/game/systems/aiTelevisionSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2026,
    currentWeek: 1,
    currentQuarter: 1,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios: [],
    marketConditions: {
      trendingGenres: ['drama'],
      audiencePreferences: [],
      economicClimate: 'stable',
      technologicalAdvances: [],
      regulatoryChanges: [],
      seasonalTrends: [],
      competitorReleases: [],
    },
    eventQueue: [],
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
  };

  return { ...base, ...(overrides || {}) };
}

function makeRngStub(opts: { chance: boolean }): SeededRng {
  return {
    next: () => 0,
    nextInt: (min) => min,
    pick: (arr) => (arr.length > 0 ? arr[0] : undefined),
    shuffle: (arr) => arr.slice(),
    nextFloat: (min) => min,
    chance: () => opts.chance,
    get state() {
      return 0;
    },
  };
}

function makeFilmRelease(year: number, week: number): Project {
  return {
    id: `ai-film-${year}-W${week}`,
    title: 'AI Film',
    type: 'feature',
    status: 'released' as any,
    currentPhase: 'release' as any,
    phaseDuration: 0,
    studioName: 'Some Studio',
    script: {
      id: 'script-ai-film',
      title: 'AI Film',
      genre: 'drama' as any,
      logline: 'A film release used for tests.',
      writer: 'Writer',
      pages: 100,
      quality: 60,
      budget: 10_000_000,
      developmentStage: 'final' as any,
      themes: [],
      targetAudience: 'general' as any,
      estimatedRuntime: 110,
      characteristics: {
        tone: 'balanced' as any,
        pacing: 'steady' as any,
        dialogue: 'naturalistic' as any,
        visualStyle: 'realistic' as any,
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal' as any,
      },
      characters: [],
    } as any,
    budget: {
      total: 10_000_000,
      allocated: {
        aboveTheLine: 2_000_000,
        belowTheLine: 3_000_000,
        postProduction: 1_500_000,
        marketing: 2_500_000,
        distribution: 1_000_000,
        contingency: 0,
      },
      spent: {
        aboveTheLine: 2_000_000,
        belowTheLine: 3_000_000,
        postProduction: 1_500_000,
        marketing: 2_500_000,
        distribution: 1_000_000,
        contingency: 0,
      },
      overages: {
        aboveTheLine: 0,
        belowTheLine: 0,
        postProduction: 0,
        marketing: 0,
        distribution: 0,
        contingency: 0,
      },
    },
    cast: [],
    crew: [],
    timeline: {
      preProduction: { start: new Date(), end: new Date() },
      principalPhotography: { start: new Date(), end: new Date() },
      postProduction: { start: new Date(), end: new Date() },
      release: new Date(),
      milestones: [],
    },
    locations: [],
    distributionStrategy: {
      primary: {
        platform: 'Theatrical',
        type: 'theatrical',
        revenue: { type: 'box-office', studioShare: 50 },
      },
      international: [],
      windows: [],
      marketingBudget: 2_500_000,
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
    metrics: {
      weeksSinceRelease: 0,
    } as any,
    releaseWeek: week,
    releaseYear: year,
  } as any;
}

describe('AiTelevisionSystem', () => {
  it('can generate a competitor TV premiere and initialize episode/streaming metrics', () => {
    const competitor: Studio = {
      id: 'studio-competitor',
      name: 'Crimson Peak Entertainment',
      reputation: 70,
      budget: 50_000_000,
      founded: 1990,
      specialties: ['horror'] as any,
      awards: [],
      debt: 0,
      lastProjectWeek: 0,
      weeksSinceLastProject: 0,
    } as any;

    const state = makeBaseState({
      universeSeed: 111,
      currentYear: 2026,
      currentWeek: 1,
      currentQuarter: 1,
      competitorStudios: [competitor],
      allReleases: [makeFilmRelease(2026, 1)],
    });

    const ctx = {
      rng: makeRngStub({ chance: true }),
      week: 1,
      year: 2026,
      quarter: 1,
      recap: [],
      debug: false,
    };

    const next = AiTelevisionSystem.onTick(state, ctx);

    const tvId = `ai-tv-${competitor.id}-2026-W1`;
    const tv = (next.allReleases as any[]).find((p: any) => p.id === tvId);

    expect(tv).toBeTruthy();
    expect(tv.type === 'series' || tv.type === 'limited-series').toBe(true);

    const season = tv.seasons?.[0];
    expect(season).toBeTruthy();
    expect(season.episodesAired).toBe(1);

    expect(tv.metrics?.streaming?.viewsFirstWeek).toBeTruthy();
    expect(tv.metrics?.streaming?.totalViews).toBeGreaterThan(0);
  });

  it('ticks an airing competitor show forward week-to-week', () => {
    const competitor: Studio = {
      id: 'studio-competitor',
      name: 'Crimson Peak Entertainment',
      reputation: 70,
      budget: 50_000_000,
      founded: 1990,
      specialties: ['horror'] as any,
      awards: [],
      debt: 0,
      lastProjectWeek: 0,
      weeksSinceLastProject: 0,
    } as any;

    const state0 = makeBaseState({
      universeSeed: 111,
      currentYear: 2026,
      currentWeek: 1,
      currentQuarter: 1,
      competitorStudios: [competitor],
      allReleases: [makeFilmRelease(2026, 1)],
    });

    const ctx1 = {
      rng: makeRngStub({ chance: true }),
      week: 1,
      year: 2026,
      quarter: 1,
      recap: [],
      debug: false,
    };

    const state1 = AiTelevisionSystem.onTick(state0, ctx1);

    const ctx2 = {
      rng: makeRngStub({ chance: false }),
      week: 2,
      year: 2026,
      quarter: 1,
      recap: [],
      debug: false,
    };

    const state2 = AiTelevisionSystem.onTick(state1, ctx2);

    const tvId = `ai-tv-${competitor.id}-2026-W1`;
    const tv = (state2.allReleases as any[]).find((p: any) => p.id === tvId);

    expect(tv).toBeTruthy();
    expect(tv.seasons?.[0]?.episodesAired).toBe(2);
    expect(tv.metrics?.weeksSinceRelease).toBe(1);
  });
});
