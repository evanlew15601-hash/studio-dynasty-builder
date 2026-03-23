import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { advanceWeek } from '@/game/core/tick';
import { createRng } from '@/game/core/rng';
import { StreamingContractLifecycleSystem } from '@/game/systems/streamingContractLifecycleSystem';
import { getContractPlatformId } from '@/utils/platformIds';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 80,
      budget: 0,
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
    universeSeed: 555,
    rngState: 555 as any,
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

function makeReleasedFilmWithContract(): Project {
  return {
    id: 'p-1',
    title: 'Contract Film',
    type: 'feature',
    status: 'released',
    currentPhase: 'distribution',
    script: {
      id: 's-1',
      title: 'Contract Film',
      genre: 'drama',
      logline: 'Test',
      writer: 'Test',
      pages: 110,
      quality: 78,
      budget: 30_000_000,
      developmentStage: 'final',
      themes: [],
      targetAudience: 'general',
      estimatedRuntime: 120,
      characteristics: {
        tone: 'balanced',
        pacing: 'steady',
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 7,
        criticalPotential: 7,
        cgiIntensity: 'minimal',
      },
    },
    releaseWeek: 1,
    releaseYear: 2027,
    budget: { total: 30_000_000, allocated: {}, spent: {}, overages: {} } as any,
    distributionStrategy: {
      primary: {
        platform: 'Wide',
        type: 'theatrical',
        revenue: { type: 'box-office', studioShare: 0.5 },
      },
      international: [],
      windows: [],
      marketingBudget: 0,
    },
    cast: [],
    crew: [],
    locations: [],
    timeline: {
      preProduction: { start: new Date(Date.UTC(2027, 0, 1)), end: new Date(Date.UTC(2027, 0, 1)) },
      principalPhotography: { start: new Date(Date.UTC(2027, 0, 1)), end: new Date(Date.UTC(2027, 0, 1)) },
      postProduction: { start: new Date(Date.UTC(2027, 0, 1)), end: new Date(Date.UTC(2027, 0, 1)) },
      release: new Date(Date.UTC(2027, 0, 1)),
      milestones: [],
    },
    metrics: {
      criticsScore: 76,
      audienceScore: 79,
      inTheaters: false,
    },
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
    postTheatricalReleases: [],
    streamingContract: {
      id: 'c-1',
      dealKind: 'streaming',
      platformId: 'streamflix',
      persistentRights: false,
      name: 'StreamFlix - Contract Film',
      type: 'film',
      duration: 2,
      startWeek: 1,
      startYear: 2027,
      endWeek: 3,
      endYear: 2027,
      upfrontPayment: 0,
      performanceBonus: [{ viewershipThreshold: 1, bonusAmount: 123_456 }],
      expectedViewers: 1_000_000,
      expectedCompletionRate: 65,
      expectedSubscriberGrowth: 50_000,
      status: 'active',
      performanceScore: 0,
      penaltyClause: { minViewers: 0, penaltyAmount: 0 },
      exclusivityClause: true,
      marketingSupport: 0,
    },
  } as any;
}

describe('StreamingContractLifecycleSystem', () => {
  it('updates performance and settles a non-persistent contract at endWeek', () => {
    const project = makeReleasedFilmWithContract();

    const rng = createRng(123);
    const state = makeBaseState({
      studio: { ...makeBaseState().studio, budget: 0 },
      projects: [project],
    });

    // Tick to week 2: performance should update.
    let result = advanceWeek(state, rng, [StreamingContractLifecycleSystem]);
    const week2Contract = (result.nextState.projects[0] as any).streamingContract;

    expect(week2Contract.performanceScore).toBeGreaterThan(0);
    expect(week2Contract.observedTotalViews).toBeGreaterThan(0);
    expect(week2Contract.status).toBe('active');

    // Tick to week 3: contract should settle (endWeek: 3) and stop implying a platform.
    result = advanceWeek(result.nextState, rng, [StreamingContractLifecycleSystem]);
    const week3Contract = (result.nextState.projects[0] as any).streamingContract;

    expect(week3Contract.status).toBe('fulfilled');
    expect(week3Contract.settledWeek).toBe(3);
    expect(result.nextState.studio.budget).toBe(123_456);

    expect(getContractPlatformId(week3Contract)).toBeNull();
  });
});
