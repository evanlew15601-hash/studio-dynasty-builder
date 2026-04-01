import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import type { TickContext } from '@/game/core/types';
import { createRng } from '@/game/core/rng';
import { PlatformCatalogSystem } from '@/game/systems/platformCatalogSystem';

function makeCtx(seed: number, week: number, year: number): TickContext {
  return {
    rng: createRng(seed),
    week,
    year,
    quarter: Math.max(1, Math.min(4, Math.ceil(week / 13))),
    recap: [],
    debug: false,
    prevState: {} as any,
  };
}

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 70,
      budget: 500_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
    currentWeek: 4,
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

  return { ...base, ...(overrides || {}) } as GameState;
}

function makeSeries(params: { id: string; platformId: string; releaseFormat: 'weekly' | 'binge'; episodesAired: number }): Project {
  return {
    id: params.id,
    title: params.id,
    type: 'series',
    status: 'released',
    currentPhase: 'distribution',
    releaseWeek: 1,
    releaseYear: 2027,
    releaseFormat: params.releaseFormat,
    episodeCount: 10,
    seasons: [
      {
        seasonNumber: 1,
        totalEpisodes: 10,
        episodesAired: params.episodesAired,
        releaseFormat: params.releaseFormat,
        averageViewers: 0,
        seasonCompletionRate: 0,
        seasonDropoffRate: 0,
        totalBudget: 0,
        spentBudget: 0,
        productionStatus: 'complete',
        episodes: Array.from({ length: 10 }).map((_, idx) => {
          const n = idx + 1;
          return {
            episodeNumber: n,
            seasonNumber: 1,
            title: `Episode ${n}`,
            runtime: 50,
            viewers: 0,
            completionRate: 0,
            averageWatchTime: 0,
            replayViews: 0,
            productionCost: 0,
            weeklyViews: [],
            cumulativeViews: 0,
            viewerRetention: 0,
          };
        }),
      },
    ],
    script: {
      id: `${params.id}-script`,
      title: params.id,
      genre: 'drama',
      logline: '',
      writer: '',
      pages: 60,
      quality: 85,
      budget: 0,
      developmentStage: 'final',
      themes: [],
      targetAudience: 'general',
      estimatedRuntime: 50,
      characteristics: {
        tone: 'balanced',
        pacing: 'steady',
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 6,
        criticalPotential: 7,
        cgiIntensity: 'minimal',
      },
    },
    budget: {
      total: 1,
      allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
      spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
      overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
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
        type: 'streaming',
        platform: 'Player Platform',
        platformId: params.platformId,
        revenue: { type: 'subscription-share', studioShare: 1 },
      },
      international: [],
      windows: [],
      marketingBudget: 0,
    },
    releaseStrategy: {
      type: 'streaming',
      streamingPlatformId: params.platformId,
      streamingExclusive: true,
      premiereDate: new Date(),
      rolloutPlan: [],
      specialEvents: [],
      pressStrategy: {
        reviewScreenings: 0,
        pressJunkets: 0,
        interviews: 0,
        expectedCriticalReception: 0,
      },
    },
    metrics: {},
    phaseDuration: 0,
    contractedTalent: [],
    developmentProgress: {
      scriptCompletion: 0,
      budgetApproval: 0,
      talentAttached: 0,
      locationSecured: 0,
      completionThreshold: 60,
      issues: [],
    },
  } as any;
}

describe('Streaming Wars: release format affects freshness recency', () => {
  it('weekly series stays fresher than binge when episodes are still dropping', () => {
    const platformId = 'player-platform:studio-1';

    const base = makeBaseState({
      dlc: { streamingWars: true },
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: platformId,
          name: 'TestFlix',
          launchedWeek: 1,
          launchedYear: 2026,
          subscribers: 2_000_000,
          cash: 0,
          status: 'active',
          tierMix: { adSupportedPct: 50, adFreePct: 50 },
          promotionBudgetPerWeek: 0,
          priceIndex: 1,
          freshness: 35,
          catalogValue: 25,
        },
        rivals: [],
      },
    });

    const weekly = makeSeries({ id: 'weekly', platformId, releaseFormat: 'weekly', episodesAired: 4 });
    const binge = makeSeries({ id: 'binge', platformId, releaseFormat: 'binge', episodesAired: 10 });

    const nextWeekly = PlatformCatalogSystem.onTick({ ...base, projects: [weekly] } as any, makeCtx(777, 4, 2027));
    const nextBinge = PlatformCatalogSystem.onTick({ ...base, projects: [binge] } as any, makeCtx(777, 4, 2027));

    const a = nextWeekly.platformMarket?.player?.freshness ?? 0;
    const b = nextBinge.platformMarket?.player?.freshness ?? 0;

    expect(a).toBeGreaterThan(b);
  });
});
