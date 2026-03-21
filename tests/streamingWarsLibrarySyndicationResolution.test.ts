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
    currentWeek: 19,
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
    universeSeed: 556,
    rngState: 556 as any,
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
    script: { id: 'script-1', title: 'Exclusive Hit', genre: 'drama', quality: 82, characters: [] } as any,
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
    timeline: {} as any,
    metrics: {},
    phaseDuration: 0,
    contractedTalent: [],
    developmentProgress: {} as any,
    postTheatricalReleases: [],
  } as any;
}

describe('Streaming Wars: library syndication resolution', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState(), 123);
  });

  it('syndicates to all rivals: adds cash, reduces freshness more, and creates multiple windows', () => {
    const playerPlatformId = 'player-platform:studio-1';

    const project = makeReleasedExclusiveOnPlayerPlatform({ projectId: 'p-1', platformId: playerPlatformId });

    const allPayout = 200_000_000;

    const event: GameEvent = {
      id: 'evt:library-syndication',
      title: 'Library syndication',
      description: 'Syndicate a package.',
      type: 'market',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: {
        kind: 'platform:library-syndication',
        playerPlatformId,
        top2Payout: 0,
        allPayout,
        offers: [
          {
            buyerId: 'streamflix',
            buyerName: 'StreamFlix',
            licenseFee: 150_000_000,
            windowWeeks: 26,
            titleProjectIds: ['p-1'],
          },
          {
            buyerId: 'paramounty',
            buyerName: 'Paramounty+',
            licenseFee: 120_000_000,
            windowWeeks: 26,
            titleProjectIds: ['p-1'],
          },
        ],
      },
      choices: [
        {
          id: 'syndicate:all',
          text: 'Syndicate all',
          consequences: [{ type: 'budget', impact: allPayout, description: 'Syndication proceeds' } as any],
        },
      ],
    } as any;

    useGameStore.getState().initGame(
      makeBaseState({
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
            { id: 'streamflix', name: 'StreamFlix', subscribers: 45_000_000, cash: 2_000_000_000, status: 'healthy', distressWeeks: 0 } as any,
            { id: 'paramounty', name: 'Paramounty+', subscribers: 20_000_000, cash: 1_000_000_000, status: 'healthy', distressWeeks: 0 } as any,
          ],
        } as any,
        projects: [project],
        eventQueue: [event],
      }),
      123
    );

    useGameStore.getState().resolveGameEvent(event.id, 'syndicate:all');

    const after = useGameStore.getState().game!;

    expect(after.studio.budget).toBe(allPayout);
    expect(after.platformMarket?.player?.cash).toBe(allPayout);

    expect(after.platformMarket?.player?.freshness).toBe(60);

    const updated = after.projects.find((p) => p.id === 'p-1')!;
    expect(updated.releaseStrategy?.streamingExclusive).toBe(false);

    const windows = (updated.postTheatricalReleases ?? []).filter((r: any) => r.platform === 'streaming');
    expect(windows.some((r: any) => (r.providerId || r.platformId) === 'streamflix')).toBe(true);
    expect(windows.some((r: any) => (r.providerId || r.platformId) === 'paramounty')).toBe(true);
  });
});
