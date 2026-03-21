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
    currentWeek: 22,
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
    universeSeed: 333,
    rngState: 333 as any,
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('Streaming Wars: strategic sale resolution', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState(), 123);
  });

  it('sells the platform, transfers subscribers, pays down debt, and registers the brand', () => {
    const salePrice = 100_000_000;

    const event: GameEvent = {
      id: 'evt:strategic-sale',
      title: 'Strategic sale',
      description: 'Strategic sale.',
      type: 'market',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: {
        kind: 'platform:strategic-sale',
        playerPlatformId: 'player-platform:studio-1',
        offers: [
          {
            buyerId: 'streamflix',
            buyerName: 'StreamFlix',
            salePrice,
            transferredSubs: 2_000_000,
            transferredCatalog: 60,
          },
        ],
      },
      choices: [
        {
          id: 'sell:streamflix',
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
            subscribers: 3_000_000,
            cash: 250_000_000,
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
          brandRegistry: [],
        } as any,
        eventQueue: [event],
      }),
      123
    );

    useGameStore.getState().resolveGameEvent(event.id, 'sell:streamflix');

    const after = useGameStore.getState().game!;

    expect(after.studio.debt).toBe(20_000_000);
    expect(after.studio.budget).toBe(0);

    expect(after.platformMarket?.player?.status).toBe('sold');
    expect(after.platformMarket?.player?.subscribers).toBe(0);

    const buyer = after.platformMarket?.rivals?.find((r: any) => r.id === 'streamflix');
    expect(buyer?.subscribers).toBe(47_000_000);

    const reg = after.platformMarket?.brandRegistry ?? [];
    expect(reg.some((r: any) => r.name === 'TestFlix' && r.ownerId === 'streamflix')).toBe(true);
  });
});
