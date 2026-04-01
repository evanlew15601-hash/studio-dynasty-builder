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

describe('Streaming Wars: rival acquisition event resolution', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 555, rngState: 555 }), 123);
  });

  it('buying a collapsed rival transfers subscribers to the player platform (and spends budget via consequences)', () => {
    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 555,
        rngState: 555,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 3_000_000,
            cash: -50_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 45,
            catalogValue: 30,
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
              cash: -300_000_000,
              status: 'distress',
              distressWeeks: 11,
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

    const beforePlayerSubs = useGameStore.getState().game!.platformMarket!.player!.subscribers;

    useGameStore.getState().advanceWeek();

    const withEvent = useGameStore.getState().game!;
    expect(withEvent.eventQueue.length).toBe(1);
    const event = withEvent.eventQueue[0];
    expect((event as any)?.data?.kind).toBe('platform:rival-collapse');

    const budgetAtEvent = withEvent.studio.budget;

    useGameStore.getState().resolveGameEvent(event.id, 'buy');

    const after = useGameStore.getState().game!;
    expect(after.eventQueue.length).toBe(0);

    const salePrice = (event as any)?.data?.salePrice ?? 0;
    expect(after.studio.budget).toBe(budgetAtEvent - salePrice);

    const afterPlayerSubs = after.platformMarket!.player!.subscribers;
    expect(afterPlayerSubs).toBeGreaterThan(beforePlayerSubs);

    const collapsed = after.platformMarket!.rivals!.find((r) => r.id === 'orchardstream')!;
    expect(collapsed.status).toBe('collapsed');
    expect(collapsed.subscribers).toBe(0);
  });

  it('passing on a collapsed rival transfers subscribers to the nominated rival buyer', () => {
    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 556,
        rngState: 556,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 3_000_000,
            cash: -50_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 45,
            catalogValue: 30,
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
              cash: -300_000_000,
              status: 'distress',
              distressWeeks: 11,
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

    const buyerId = (event as any)?.data?.rivalBuyerId as string;
    expect(typeof buyerId).toBe('string');

    const beforeBuyerSubs = withEvent.platformMarket!.rivals!.find((r) => r.id === buyerId)!.subscribers;

    useGameStore.getState().resolveGameEvent(event.id, 'pass');

    const after = useGameStore.getState().game!;
    const afterBuyerSubs = after.platformMarket!.rivals!.find((r) => r.id === buyerId)!.subscribers;
    expect(afterBuyerSubs).toBeGreaterThan(beforeBuyerSubs);
  });
});
