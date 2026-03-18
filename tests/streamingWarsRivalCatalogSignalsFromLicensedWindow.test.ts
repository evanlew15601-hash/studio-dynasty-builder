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
    currentWeek: 10,
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

function makeExclusiveTitle(params: { id: string; platformId: string; week: number; year: number }): Project {
  return {
    id: params.id,
    title: params.id,
    type: 'feature',
    status: 'released',
    currentPhase: 'release',
    releaseWeek: params.week,
    releaseYear: params.year,
    script: {
      id: `${params.id}-script`,
      title: params.id,
      genre: 'drama',
      logline: '',
      writer: '',
      pages: 110,
      quality: 85,
      budget: 0,
      developmentStage: 'concept',
      themes: [],
      targetAudience: '',
      estimatedRuntime: 110,
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
    postTheatricalReleases: [],
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

describe('Streaming Wars: rivals react to licensed-in windows', () => {
  it('a licensed-in window increases rival freshness vs baseline drift', () => {
    const playerPlatformId = 'player-platform:studio-1';

    const base = makeBaseState({
      dlc: { streamingWars: true },
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: playerPlatformId,
          name: 'TestFlix',
          launchedWeek: 1,
          launchedYear: 2026,
          subscribers: 2_000_000,
          cash: 0,
          status: 'active',
          tierMix: { adSupportedPct: 50, adFreePct: 50 },
          promotionBudgetPerWeek: 0,
          priceIndex: 1,
          freshness: 40,
          catalogValue: 25,
        },
        rivals: [
          {
            id: 'streamflix',
            name: 'StreamFlix',
            subscribers: 40_000_000,
            cash: 2_000_000_000,
            status: 'healthy',
            distressWeeks: 0,
            tierMix: { adSupportedPct: 40, adFreePct: 60 },
            priceIndex: 1.0,
            catalogValue: 70,
            freshness: 55,
          },
        ],
      },
    });

    const project = makeExclusiveTitle({ id: 'exclusive', platformId: playerPlatformId, week: 10, year: 2027 });

    const ctx = makeCtx(777, 10, 2027);

    const baseline = PlatformCatalogSystem.onTick({ ...base, projects: [project] } as any, ctx);

    const licensed = PlatformCatalogSystem.onTick(
      {
        ...base,
        projects: [
          {
            ...project,
            postTheatricalReleases: [
              {
                id: 'release:exclusive:streamflix:2027:W10',
                projectId: 'exclusive',
                platform: 'streaming',
                providerId: 'streamflix',
                releaseDate: new Date(),
                releaseWeek: 10,
                releaseYear: 2027,
                revenue: 0,
                weeklyRevenue: 0,
                weeksActive: 1,
                status: 'active',
                cost: 0,
                durationWeeks: 26,
              },
            ],
            releaseStrategy: {
              ...(project.releaseStrategy as any),
              streamingExclusive: false,
            },
          } as any,
        ],
      } as any,
      makeCtx(777, 10, 2027)
    );

    const beforeFreshness = baseline.platformMarket!.rivals![0].freshness ?? 0;
    const afterFreshness = licensed.platformMarket!.rivals![0].freshness ?? 0;

    expect(afterFreshness).toBeGreaterThan(beforeFreshness);
  });
});
