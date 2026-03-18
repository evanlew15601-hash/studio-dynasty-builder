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

function makeStreamingTitle(params: {
  id: string;
  platformId: string;
  week: number;
  year: number;
  streamingExclusive: boolean;
}): Project {
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
      streamingExclusive: params.streamingExclusive,
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

describe('Streaming Wars: content decisions affect platform freshness/catalog', () => {
  it('exclusive premieres contribute more freshness than non-exclusive premieres', () => {
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

    const exclusiveState = {
      ...base,
      projects: [makeStreamingTitle({ id: 'exclusive', platformId, week: 10, year: 2027, streamingExclusive: true })],
    };

    const nonExclusiveState = {
      ...base,
      projects: [
        makeStreamingTitle({ id: 'nonexclusive', platformId, week: 10, year: 2027, streamingExclusive: false }),
      ],
    };

    const nextExclusive = PlatformCatalogSystem.onTick(exclusiveState as any, makeCtx(1234, 10, 2027));
    const nextNonExclusive = PlatformCatalogSystem.onTick(nonExclusiveState as any, makeCtx(1234, 10, 2027));

    const a = nextExclusive.platformMarket!.player!.freshness ?? 0;
    const b = nextNonExclusive.platformMarket!.player!.freshness ?? 0;

    expect(a).toBeGreaterThan(b);
  });

  it('theatrical-first titles only affect platform freshness after the post-theatrical window begins', () => {
    const platformId = 'player-platform:studio-1';

    const project: Project = {
      id: 'theatrical-first',
      title: 'Theatrical First',
      type: 'feature',
      status: 'released',
      currentPhase: 'release',
      releaseWeek: 10,
      releaseYear: 2027,
      script: {
        id: 'theatrical-first-script',
        title: 'Theatrical First',
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
          type: 'theatrical',
          platform: 'Theaters',
          revenue: { type: 'box-office', studioShare: 0.5 },
        },
        international: [],
        windows: [],
        marketingBudget: 0,
      },
      postTheatricalReleases: [
        {
          id: `release:theatrical-first:${platformId}:2027:W14`,
          projectId: 'theatrical-first',
          platform: 'streaming',
          platformId,
          releaseDate: new Date(),
          releaseWeek: 14,
          releaseYear: 2027,
          delayWeeks: 4,
          revenue: 0,
          weeklyRevenue: 0,
          weeksActive: 0,
          status: 'planned',
          cost: 0,
          durationWeeks: 26,
        },
      ],
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
      projects: [project],
    });

    const before = PlatformCatalogSystem.onTick(base as any, makeCtx(555, 13, 2027));
    const after = PlatformCatalogSystem.onTick(base as any, makeCtx(555, 14, 2027));

    const beforeFreshness = before.platformMarket!.player!.freshness ?? 0;
    const afterFreshness = after.platformMarket!.player!.freshness ?? 0;

    expect(afterFreshness).toBeGreaterThan(beforeFreshness);
  });
});
