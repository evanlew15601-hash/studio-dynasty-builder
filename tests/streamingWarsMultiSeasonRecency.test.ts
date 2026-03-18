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
    currentWeek: 22,
    currentQuarter: 2,
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

function makeSeries(params: { platformId: string; withSeason2: boolean }): Project {
  const { platformId, withSeason2 } = params;

  const seasons: any[] = [
    {
      seasonNumber: 1,
      totalEpisodes: 10,
      episodesAired: 10,
      releaseFormat: 'weekly',
      averageViewers: 0,
      seasonCompletionRate: 0,
      seasonDropoffRate: 0,
      totalBudget: 0,
      spentBudget: 0,
      productionStatus: 'complete',
      premiereDate: { week: 1, year: 2027 },
      finaleDate: { week: 10, year: 2027 },
      episodes: [],
    },
  ];

  if (withSeason2) {
    seasons.push({
      seasonNumber: 2,
      totalEpisodes: 8,
      episodesAired: 3,
      releaseFormat: 'weekly',
      averageViewers: 0,
      seasonCompletionRate: 0,
      seasonDropoffRate: 0,
      totalBudget: 0,
      spentBudget: 0,
      productionStatus: 'planning',
      episodes: [],
    });
  }

  return {
    id: `project:original:2027:W1:${withSeason2 ? '888888' : '777777'}`,
    title: withSeason2 ? 'Multi Season' : 'Single Season',
    type: 'series',
    status: 'released',
    currentPhase: 'distribution',
    releaseWeek: 1,
    releaseYear: 2027,
    releaseFormat: 'weekly',
    episodeCount: 10,
    seasons,
    script: {
      id: 'script',
      title: 'Test',
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
        platform: 'TestFlix',
        platformId,
        revenue: { type: 'subscription-share', studioShare: 1 },
      },
      international: [],
      windows: [],
      marketingBudget: 0,
    },
    streamingContract: {
      id: 'contract',
      dealKind: 'streaming',
      platformId,
      name: 'TestFlix Original - Test',
      type: 'series',
      duration: 52,
      startWeek: 1,
      startYear: 2027,
      endWeek: 1,
      endYear: 2028,
      upfrontPayment: 0,
      episodeRate: 0,
      performanceBonus: [],
      expectedViewers: 0,
      expectedCompletionRate: 0.72,
      expectedSubscriberGrowth: 0,
      status: 'active',
      performanceScore: 0,
      exclusivityClause: true,
      marketingSupport: 0,
    },
    releaseStrategy: {
      type: 'streaming',
      streamingPlatformId: platformId,
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

describe('Streaming Wars: multi-season recency', () => {
  it('treats in-progress later seasons as fresh arrivals for platform freshness', () => {
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

    const singleSeason = makeSeries({ platformId, withSeason2: false });
    const multiSeason = makeSeries({ platformId, withSeason2: true });

    const nextSingle = PlatformCatalogSystem.onTick({ ...base, projects: [singleSeason] } as any, makeCtx(999, 22, 2027));
    const nextMulti = PlatformCatalogSystem.onTick({ ...base, projects: [multiSeason] } as any, makeCtx(999, 22, 2027));

    const a = nextMulti.platformMarket?.player?.freshness ?? 0;
    const b = nextSingle.platformMarket?.player?.freshness ?? 0;

    expect(a).toBeGreaterThan(b);
  });
});
