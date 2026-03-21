import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '@/types/game';
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
    universeSeed: 222,
    rngState: 222 as any,
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('Streaming Wars: forced sale resolution', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState(), 123);
  });

  it('uses sale proceeds to pay down studio debt and registers the brand', () => {
    const salePrice = 100_000_000;

    const event: GameEvent = {
      id: 'evt:forced-sale',
      title: 'Forced sale',
      description: 'Forced sale.',
      type: 'crisis',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: {
        kind: 'platform:forced-sale',
        buyerId: 'streamflix',
        buyerName: 'StreamFlix',
        salePrice,
        transferredSubs: 0,
        transferredCatalog: 0,
        emergencyFundingCost: 0,
      },
      choices: [
        {
          id: 'sell',
          text: 'Sell',
          consequences: [{ type: 'budget', impact: salePrice, description: 'Sale proceeds' } as any],
        },
      ],
    } as any;

    useGameStore.getState().initGame(
      makeBaseState({
        studio: { ...makeBaseState().studio, budget: 0, debt: 120_000_000 },
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 100_000,
            cash: -600_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.4,
            freshness: 0,
            catalogValue: 0,
            distressWeeks: 20,
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
        eventQueue: [event],
      }),
      123
    );

    useGameStore.getState().resolveGameEvent(event.id, 'sell');

    const after = useGameStore.getState().game!;
    expect(after.studio.debt).toBe(20_000_000);
    expect(after.studio.budget).toBe(0);

    const reg = after.platformMarket?.brandRegistry ?? [];
    expect(reg.some((r) => r.name === 'TestFlix')).toBe(true);
  });
});
