import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '@/types/game';
import { useGameStore } from '@/game/store';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 80,
      budget: 500_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    dlc: { streamingWars: true },
    currentYear: 2027,
    currentWeek: 20,
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
    universeSeed: 888,
    rngState: 888 as any,
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('Streaming Wars: output deal buyout', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState(), 123);
  });

  it('removes the output deal and applies the termination fee on buyout', () => {
    const buyoutCost = 120_000_000;

    const event: GameEvent = {
      id: 'evt:output-buyout',
      title: 'Buy out output deal',
      description: 'Buyout.',
      type: 'market',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: {
        kind: 'platform:output-deal-buyout',
        playerPlatformId: 'player-platform:studio-1',
        buyoutCost,
        partnerName: 'StreamFlix',
      },
      choices: [
        {
          id: 'buyout',
          text: 'Buy out',
          consequences: [{ type: 'budget', impact: -buyoutCost, description: 'Termination fee' } as any],
        },
      ],
    } as any;

    useGameStore.getState().initGame(
      makeBaseState({
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 3_000_000,
            cash: 0,
            status: 'active',
            freshness: 70,
            catalogValue: 65,
            outputDeal: {
              partnerId: 'streamflix',
              partnerName: 'StreamFlix',
              startWeek: 9,
              startYear: 2027,
              endWeek: 9,
              endYear: 2028,
              upfrontPayment: 250_000_000,
              windowDelayWeeks: 14,
              windowDurationWeeks: 26,
            },
          },
          rivals: [
            {
              id: 'streamflix',
              name: 'StreamFlix',
              subscribers: 45_000_000,
              cash: 2_000_000_000,
              status: 'healthy',
            },
          ],
          brandRegistry: [],
        } as any,
        eventQueue: [event],
      }),
      123
    );

    const beforeBudget = useGameStore.getState().game!.studio.budget;

    useGameStore.getState().resolveGameEvent(event.id, 'buyout');

    const after = useGameStore.getState().game!;

    expect(after.platformMarket?.player?.outputDeal).toBeUndefined();
    expect(after.studio.budget).toBe(beforeBudget - buyoutCost);
  });
});
