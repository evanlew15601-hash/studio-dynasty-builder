import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
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

  it('enqueues a deterministic M&A offer at week 39 when a rival is in sustained distress', () => {
    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 777,
        rngState: 777,
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

    useGameStore.getState().advanceWeek(); // to week 39

    const state = useGameStore.getState().game!;
    expect(state.currentWeek).toBe(39);

    expect(state.eventQueue.length).toBe(1);
    expect((state.eventQueue[0] as any)?.data?.kind).toBe('platform:mna-offer');
  });

  it('buying the distressed platform transfers subscribers to the player platform (and spends budget via consequences)', () => {
    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 778,
        rngState: 778,
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

    useGameStore.getState().advanceWeek(); // to week 39

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
  });
});
