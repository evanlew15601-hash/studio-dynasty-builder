import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { useGameStore } from '@/game/store';

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
    currentWeek: 13,
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
      quality: 80,
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
      premiereDate: new Date(2027, 0, 1),
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

describe('Streaming Wars: license offer resolution creates a real rival window + erodes exclusivity', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 900, rngState: 900 }), 123);
  });

  it('accepting a license offer marks the title non-exclusive and adds a rival streaming window', () => {
    const playerPlatformId = 'player-platform:studio-1';

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 900,
        rngState: 900,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: playerPlatformId,
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 5_000_000,
            cash: 0,
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

    // Manually enqueue a license offer event that targets the released title.
    useGameStore.getState().setGameState((s) => {
      return {
        ...s,
        eventQueue: [
          {
            id: 'evt-1',
            title: 'License offer',
            description: 'Test',
            type: 'opportunity',
            triggerDate: new Date(2027, 0, 1),
            data: {
              kind: 'platform:license-offer',
              titleProjectId: 'p-1',
              titleName: 'Breakout Hit',
              offer: 100_000_000,
              rivalId: 'streamflix',
              rivalName: 'StreamFlix',
              playerPlatformId,
            },
            choices: [
              {
                id: 'accept',
                text: 'Accept',
                consequences: [{ type: 'budget', impact: 100_000_000, description: 'fee' }],
              },
              { id: 'decline', text: 'Decline', consequences: [] },
            ],
          } as any,
        ],
      } as any;
    });

    useGameStore.getState().resolveGameEvent('evt-1', 'accept');

    const after = useGameStore.getState().game!;

    expect(after.platformMarket?.player?.cash).toBe(100_000_000);

    const project = after.projects.find((p) => p.id === 'p-1')!;
    expect(project.releaseStrategy?.streamingExclusive).toBe(false);

    const window = (project.postTheatricalReleases ?? []).find((r) => r.providerId === 'streamflix' && r.platform === 'streaming');
    expect(window).toBeTruthy();
    expect(window?.status).toBe('planned');
    expect(window?.durationWeeks).toBe(26);
  });
});
