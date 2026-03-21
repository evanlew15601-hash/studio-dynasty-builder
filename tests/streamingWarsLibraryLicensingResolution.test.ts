import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState, Project } from '@/types/game';
import { useGameStore } from '@/game/store';

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
    dlc: { streamingWars: true },
    currentYear: 2027,
    currentWeek: 18,
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
    universeSeed: 555,
    rngState: 555 as any,
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

function makeReleasedExclusiveOnPlayerPlatform(params: { projectId: string; platformId: string }): Project {
  return {
    id: params.projectId,
    title: 'Exclusive Hit',
    type: 'feature',
    status: 'released',
    currentPhase: 'released',
    script: {
      id: 'script-1',
      title: 'Exclusive Hit',
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

describe('Streaming Wars: library licensing package resolution', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState(), 123);
  });

  it('licenses a package: adds cash, reduces exclusivity, and creates rival windows', () => {
    const playerPlatformId = 'player-platform:studio-1';

    const project = makeReleasedExclusiveOnPlayerPlatform({ projectId: 'p-1', platformId: playerPlatformId });

    const licenseFee = 120_000_000;

    const event: GameEvent = {
      id: 'evt:library-licensing',
      title: 'Library licensing',
      description: 'License a package.',
      type: 'market',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: {
        kind: 'platform:library-licensing',
        playerPlatformId,
        offers: [
          {
            buyerId: 'streamflix',
            buyerName: 'StreamFlix',
            licenseFee,
            windowWeeks: 26,
            titleProjectIds: ['p-1'],
          },
        ],
      },
      choices: [
        {
          id: 'license:streamflix',
          text: 'License',
          consequences: [{ type: 'budget', impact: licenseFee, description: 'Licensing fee' } as any],
        },
      ],
    } as any;

    useGameStore.getState().initGame(
      makeBaseState({
        studio: { ...makeBaseState().studio, budget: 0 },
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: playerPlatformId,
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 3_000_000,
            cash: 0,
            status: 'active',
            tierMix: { adSupportedPct: 50, adFreePct: 50 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 70,
            catalogValue: 65,
            distressWeeks: 0,
          },
          rivals: [
            {
              id: 'streamflix',
              name: 'StreamFlix',
              subscribers: 45_000_000,
              cash: 2_000_000_000,
              status: 'healthy',
              distressWeeks: 0,
              tierMix: { adSupportedPct: 40, adFreePct: 60 },
              priceIndex: 1.0,
              catalogValue: 70,
              freshness: 60,
            },
          ],
        } as any,
        projects: [project],
        eventQueue: [event],
      }),
      123
    );

    useGameStore.getState().resolveGameEvent(event.id, 'license:streamflix');

    const after = useGameStore.getState().game!;

    expect(after.studio.budget).toBe(licenseFee);

    expect(after.platformMarket?.player?.cash).toBe(licenseFee);
    expect(after.platformMarket?.player?.freshness).toBe(64);

    const updated = after.projects.find((p) => p.id === 'p-1')!;
    expect(updated.releaseStrategy?.streamingExclusive).toBe(false);

    const hasWindow = (updated.postTheatricalReleases ?? []).some((r: any) => r.platform === 'streaming' && (r.providerId || r.platformId) === 'streamflix');
    expect(hasWindow).toBe(true);
  });
});
