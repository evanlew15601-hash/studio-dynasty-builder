import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import type { TickContext } from '@/game/core/types';
import { createRng } from '@/game/core/rng';
import { PlatformOriginalsReleaseCadenceSystem } from '@/game/systems/platformOriginalsReleaseCadenceSystem';

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

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('Streaming Wars: cadence premiere inference', () => {
  it('infers missing season premiereDate when episodes are already marked aired', () => {
    const platformId = 'player-platform:studio-1';

    const project: Project = {
      id: 'project:original:2027:W1:444444',
      title: 'Legacy Season',
      type: 'series',
      status: 'released',
      currentPhase: 'distribution',
      releaseWeek: 1,
      releaseYear: 2027,
      releaseFormat: 'weekly',
      episodeCount: 10,
      seasons: [
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
        } as any,
        {
          seasonNumber: 2,
          totalEpisodes: 8,
          episodesAired: 2,
          releaseFormat: 'weekly',
          averageViewers: 0,
          seasonCompletionRate: 0,
          seasonDropoffRate: 0,
          totalBudget: 0,
          spentBudget: 0,
          productionStatus: 'planning',
          episodes: [],
        } as any,
      ],
      script: {
        id: 'script',
        title: 'Legacy Season',
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
        name: 'TestFlix Original - Legacy Season',
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
        },
        rivals: [],
      },
      projects: [project],
    });

    const week22 = PlatformOriginalsReleaseCadenceSystem.onTick(base as any, makeCtx(1, 22, 2027));

    const out = week22.projects?.[0] as any;
    expect(out.currentSeason).toBe(2);

    const season2 = out.seasons?.[1];
    expect(season2?.premiereDate).toEqual({ week: 21, year: 2027 });
    expect(season2?.episodes?.[0]?.airDate).toEqual({ week: 21, year: 2027 });
    expect(season2?.productionStatus).toBe('complete');
    expect(season2?.airingStatus).toBe('airing');
  });
});
