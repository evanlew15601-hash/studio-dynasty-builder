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
    currentWeek: 38,
    currentQuarter: 3,
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

describe('Streaming Wars: M&A offer event', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 777, rngState: 777 }), 123);
  });

  it('enqueues a deterministic M&A offer during the seeded offer week when a rival is in sustained distress', () => {
    const offerWeek = stableInt(`777|platform:mna-offer-week|2027|player-platform:studio-1`, 34, 46);

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 777,
        rngState: 777,
        currentWeek: offerWeek - 1,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
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
            {
              id: 'orchardstream',
              name: 'Orchard Stream',
              subscribers: 8_000_000,
              cash: -400_000_000,
              status: 'distress',
              distressWeeks: 6,
              tierMix: { adSupportedPct: 20, adFreePct: 80 },
              priceIndex: 1.2,
              catalogValue: 55,
              freshness: 40,
            },
          ],
        },
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const state = useGameStore.getState().game!;
    expect(state.currentWeek).toBe(offerWeek);

    expect(state.eventQueue.length).toBe(1);
    expect((state.eventQueue[0] as any)?.data?.kind).toBe('platform:mna-offer');
  });

  it('buying the distressed platform transfers subscribers to the player platform (and spends budget via consequences)', () => {
    const playerPlatformId = 'player-platform:studio-1';
    const offerWeek = stableInt(`778|platform:mna-offer-week|2027|${playerPlatformId}`, 34, 46);

    const licensedTitle: Project = {
      id: 'title-1',
      title: 'Title 1',
      type: 'feature',
      status: 'released',
      currentPhase: 'distribution',
      releaseWeek: 1,
      releaseYear: 2027,
      script: { id: 's1', title: 'Title 1', genre: 'drama', quality: 80 } as any,
      budget: { total: 1 } as any,
      postTheatricalReleases: [
        {
          id: `release:title-1:orchardstream:2027:W${offerWeek}`,
          projectId: 'title-1',
          platform: 'streaming',
          providerId: 'orchardstream',
          releaseDate: new Date('2027-01-01'),
          releaseWeek: offerWeek,
          releaseYear: 2027,
          delayWeeks: 0,
          revenue: 0,
          weeklyRevenue: 0,
          weeksActive: 0,
          status: 'active',
          cost: 0,
          durationWeeks: 26,
        } as any,
      ],
      metrics: { inTheaters: false, theatricalRunLocked: true } as any,
      cast: [],
      crew: [],
      contractedTalent: [],
      timeline: {} as any,
      locations: [],
      phaseDuration: 0,
      developmentProgress: {} as any,
    } as any;

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 778,
        rngState: 778,
        currentWeek: offerWeek - 1,
        allReleases: [licensedTitle],
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
            {
              id: 'orchardstream',
              name: 'Orchard Stream',
              subscribers: 8_000_000,
              cash: -400_000_000,
              status: 'distress',
              distressWeeks: 6,
              tierMix: { adSupportedPct: 20, adFreePct: 80 },
              priceIndex: 1.2,
              catalogValue: 55,
              freshness: 40,
            },
          ],
        },
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const withEvent = useGameStore.getState().game!;
    const event = withEvent.eventQueue[0];
    expect((event as any)?.data?.kind).toBe('platform:mna-offer');

    const beforeSubs = withEvent.platformMarket!.player!.subscribers;
    const budgetAtEvent = withEvent.studio.budget;

    useGameStore.getState().resolveGameEvent(event.id, 'buy');

    const after = useGameStore.getState().game!;
    const salePrice = (event as any)?.data?.salePrice ?? 0;

    expect(after.studio.budget).toBe(budgetAtEvent - salePrice);
    expect(after.platformMarket!.player!.subscribers).toBeGreaterThan(beforeSubs);

    const target = after.platformMarket!.rivals!.find((r) => r.id === 'orchardstream')!;
    expect(target.status).toBe('collapsed');
    expect(target.subscribers).toBe(0);

    const updated = (after.allReleases || []).find((p: any) => p && p.id === 'title-1') as Project;

    const movedWindow = (updated.postTheatricalReleases ?? []).find(
      (r: any) => r.platform === 'streaming' && r.platformId === playerPlatformId
    );

    expect(movedWindow).toBeTruthy();
    expect((movedWindow as any).providerId).toBeUndefined();
    expect((movedWindow as any).id).toBe(`release:title-1:${playerPlatformId}:2027:W${offerWeek}`);
  });
});
