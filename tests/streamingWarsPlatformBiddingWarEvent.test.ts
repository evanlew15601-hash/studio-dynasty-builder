import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { useGameStore } from '@/game/store';
import { stableInt } from '@/utils/stableRandom';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 80,
      budget: 1_000_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
    currentWeek: 29,
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

function makeReleasedOnPlayerPlatform(params: { projectId: string; platformId: string }): Project {
  return {
    id: params.projectId,
    title: 'Breakout Hit',
    type: 'feature',
    status: 'released',
    currentPhase: 'released',
    script: {
      id: 'script-1',
      title: 'Breakout Hit',
      genre: 'drama',
      logline: 'Test',
      writer: 'Test',
      pages: 110,
      quality: 82,
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
        platform: 'TestFlix',
        platformId: params.platformId,
        type: 'streaming',
        revenue: { type: 'subscription-share', studioShare: 1 },
      },
      international: [],
      windows: [],
      marketingBudget: 0,
    },
    releaseStrategy: {
      type: 'streaming',
      premiereDate: new Date(Date.UTC(2027, 0, 1)),
      rolloutPlan: [],
      specialEvents: [],
      pressStrategy: { expectedCriticalReception: 60 },
      streamingPlatformId: params.platformId,
      streamingExclusive: true,
      streamingExclusivityWeeks: 999,
    },
    cast: [],
    crew: [],
    locations: [],
    timeline: {
      preProduction: { start: new Date(), end: new Date() },
      principalPhotography: { start: new Date(), end: new Date() },
      postProduction: { start: new Date(), end: new Date() },
      release: new Date(),
      milestones: [],
    },
    metrics: {},
    phaseDuration: 0,
    contractedTalent: [],
    developmentProgress: { scriptCompletion: 0, budgetApproval: 0, talentAttached: 0, locationSecured: 0, completionThreshold: 60, issues: [] },
    postTheatricalReleases: [],
  } as any;
}

function makeReleasedStreamingContractOriginal(params: { projectId: string; platformId: string }): Project {
  return {
    ...makeReleasedOnPlayerPlatform(params),
    type: 'series',
    releaseStrategy: undefined,
    streamingContract: {
      id: 'contract-1',
      dealKind: 'streaming',
      platformId: params.platformId,
      name: 'TestFlix Original - Breakout Hit',
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
      expectedCompletionRate: 0.7,
      expectedSubscriberGrowth: 0,
      status: 'active',
      performanceScore: 0,
      exclusivityClause: true,
      marketingSupport: 0,
    },
  } as any;
}

describe('Streaming Wars: bidding war event', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 888, rngState: 888 }), 123);
  });

  it('enqueues a deterministic bidding war event during the seeded offer week when an exclusive title exists', () => {
    const playerPlatformId = 'player-platform:studio-1';
    const offerWeek = stableInt(`888|platform:bidding-war-week|2027|${playerPlatformId}`, 26, 34);

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 888,
        rngState: 888,
        currentWeek: offerWeek - 1,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: playerPlatformId,
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 5_000_000,
            cash: 100_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 55,
            catalogValue: 45,
            distressWeeks: 0,
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
              freshness: 60,
            },
          ],
        },
        projects: [makeReleasedOnPlayerPlatform({ projectId: 'p-1', platformId: playerPlatformId })],
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const state = useGameStore.getState().game!;
    expect(state.currentWeek).toBe(offerWeek);
    expect(state.eventQueue.length).toBe(1);
    expect((state.eventQueue[0] as any)?.data?.kind).toBe('platform:bidding-war');
  });

  it('also triggers for exclusive streaming-contract Originals (no releaseStrategy needed)', () => {
    const playerPlatformId = 'player-platform:studio-1';
    const offerWeek = stableInt(`888|platform:bidding-war-week|2027|${playerPlatformId}`, 26, 34);

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 888,
        rngState: 888,
        currentWeek: offerWeek - 1,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: playerPlatformId,
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 5_000_000,
            cash: 100_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 55,
            catalogValue: 45,
            distressWeeks: 0,
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
              freshness: 60,
            },
          ],
        },
        projects: [makeReleasedStreamingContractOriginal({ projectId: 'p-1', platformId: playerPlatformId })],
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const state = useGameStore.getState().game!;
    expect(state.currentWeek).toBe(offerWeek);
    expect(state.eventQueue.length).toBe(1);
    expect((state.eventQueue[0] as any)?.data?.kind).toBe('platform:bidding-war');
  });

  it('selling the window makes the title non-exclusive and creates a rival streaming window', () => {
    const playerPlatformId = 'player-platform:studio-1';
    const offerWeek = stableInt(`889|platform:bidding-war-week|2027|${playerPlatformId}`, 26, 34);

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 889,
        rngState: 889,
        currentWeek: offerWeek - 1,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: playerPlatformId,
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 5_000_000,
            cash: 100_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 55,
            catalogValue: 45,
            distressWeeks: 0,
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
              freshness: 60,
            },
          ],
        },
        projects: [makeReleasedOnPlayerPlatform({ projectId: 'p-1', platformId: playerPlatformId })],
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const withEvent = useGameStore.getState().game!;
    const event = withEvent.eventQueue[0];
    expect((event as any)?.data?.kind).toBe('platform:bidding-war');

    const beforeFreshness = withEvent.platformMarket!.player!.freshness ?? 0;
    const beforeCash = withEvent.platformMarket!.player!.cash ?? 0;
    const offer = (event as any)?.data?.offer ?? 0;

    useGameStore.getState().resolveGameEvent(event.id, 'sell');

    const after = useGameStore.getState().game!;
    expect(after.eventQueue.length).toBe(0);

    const project = after.projects.find((p) => p.id === 'p-1')!;
    expect(project.releaseStrategy?.streamingExclusive).toBe(false);

    const window = (project.postTheatricalReleases ?? []).find((r) => r.providerId === 'streamflix' && r.platform === 'streaming');
    expect(window).toBeTruthy();
    expect(window?.status).toBe('planned');
    expect(window?.durationWeeks).toBe(52);

    expect(after.platformMarket!.player!.freshness).toBeLessThan(beforeFreshness);
    expect(after.platformMarket!.player!.cash).toBe(beforeCash + offer);
  });
});
