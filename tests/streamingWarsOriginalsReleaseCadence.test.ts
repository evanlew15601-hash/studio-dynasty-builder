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

function makeReleasedOriginal(params: { id: string; platformId: string; releaseWeek: number; releaseYear: number; releaseFormat: 'weekly' | 'batch' | 'binge' }): Project {
  return {
    id: params.id,
    title: 'Cadence Test',
    type: 'series',
    status: 'released',
    currentPhase: 'distribution',
    releaseWeek: params.releaseWeek,
    releaseYear: params.releaseYear,
    releaseFormat: params.releaseFormat,
    episodeCount: 10,
    script: {
      id: 's',
      title: 'Cadence Test',
      genre: 'drama',
      logline: '',
      writer: '',
      pages: 60,
      quality: 80,
      budget: 1,
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
        criticalPotential: 6,
        cgiIntensity: 'minimal',
      },
    },
    budget: {
      total: 10,
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
        platform: 'TestFlix',
        platformId: params.platformId,
        type: 'streaming',
        revenue: { type: 'subscription-share', studioShare: 1 },
      },
      international: [],
      windows: [],
      marketingBudget: 0,
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
    streamingContract: {
      id: 'c',
      dealKind: 'streaming',
      platformId: params.platformId,
      name: 'TestFlix Original - Cadence Test',
      type: 'series',
      duration: 52,
      startWeek: params.releaseWeek,
      startYear: params.releaseYear,
      endWeek: params.releaseWeek,
      endYear: params.releaseYear + 1,
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
  } as any;
}

describe('Streaming Wars: Originals release cadence', () => {
  it('increments episodesAired weekly after premiere for weekly releases', () => {
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
        },
        rivals: [],
      },
      projects: [makeReleasedOriginal({ id: 'project:original:2027:W1:111111', platformId, releaseWeek: 1, releaseYear: 2027, releaseFormat: 'weekly' })],
    });

    const week1 = PlatformOriginalsReleaseCadenceSystem.onTick(base as any, makeCtx(1, 1, 2027));
    expect(week1.projects?.[0]?.seasons?.[0]?.episodesAired).toBe(1);

    const week4 = PlatformOriginalsReleaseCadenceSystem.onTick(week1 as any, makeCtx(1, 4, 2027));
    expect(week4.projects?.[0]?.seasons?.[0]?.episodesAired).toBe(4);
  });

  it('drops all episodes immediately for binge releases', () => {
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
        },
        rivals: [],
      },
      projects: [makeReleasedOriginal({ id: 'project:original:2027:W1:222222', platformId, releaseWeek: 1, releaseYear: 2027, releaseFormat: 'binge' })],
    });

    const next = PlatformOriginalsReleaseCadenceSystem.onTick(base as any, makeCtx(1, 1, 2027));
    expect(next.projects?.[0]?.seasons?.[0]?.episodesAired).toBe(10);
  });
});
