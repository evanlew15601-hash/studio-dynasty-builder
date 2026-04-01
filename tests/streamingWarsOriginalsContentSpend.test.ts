import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import type { TickContext } from '@/game/core/types';
import { createRng } from '@/game/core/rng';
import { PlatformEconomySystem } from '@/game/systems/platformEconomySystem';

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

function makePipelineOriginal(params: { id: string; platformId: string; phase: 'development' | 'production' | 'post-production'; totalBudget: number }): Project {
  return {
    id: params.id,
    title: params.id,
    type: 'series',
    status: params.phase,
    currentPhase: params.phase,
    phaseDuration: 8,
    streamingContract: {
      platformId: params.platformId,
      contractLengthWeeks: 52,
      exclusivityClause: true,
      revenueShare: 1,
      distributionRights: 'exclusive',
      commissionFee: 10_000_000,
    },
    budget: {
      total: params.totalBudget,
      allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
      spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
      overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
    },
    cast: [],
    crew: [],
    script: {
      id: `${params.id}-script`,
      title: params.id,
      genre: 'drama',
      logline: '',
      writer: '',
      pages: 60,
      quality: 80,
      budget: 0,
      developmentStage: 'concept',
      themes: [],
      targetAudience: '',
      estimatedRuntime: 45,
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
    timeline: {
      preProduction: { start: new Date(), end: new Date() },
      principalPhotography: { start: new Date(), end: new Date() },
      postProduction: { start: new Date(), end: new Date() },
      release: new Date(),
      milestones: [],
    },
    locations: [],
    metrics: {},
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

describe('Streaming Wars: Originals content spend scales with budget + phase', () => {
  it('estimates weekly burn per Original based on phase weights', () => {
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
          adLoadIndex: 55,
          freshness: 70,
          catalogValue: 70,
        },
        rivals: [],
      },
    });

    const devProject = makePipelineOriginal({
      id: 'project:original:test',
      platformId,
      phase: 'development',
      totalBudget: 260_000_000,
    });

    const nextDev = PlatformEconomySystem.onTick({ ...base, projects: [devProject] } as any, makeCtx(999, 10, 2027));

    // 260M * 0.15 / 8 = 4.875M per week.
    expect(nextDev.platformMarket?.player?.contentSpendPerWeek).toBe(4_875_000);

    const prodProject = { ...devProject, status: 'production', currentPhase: 'production' } as any;
    const nextProd = PlatformEconomySystem.onTick({ ...base, projects: [prodProject] } as any, makeCtx(999, 10, 2027));

    // 260M * 0.65 / 12 = 14.083...M per week.
    expect(nextProd.platformMarket?.player?.contentSpendPerWeek).toBe(14_083_333);
  });
});
