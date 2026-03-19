import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
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
    currentWeek: 25,
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

describe('Streaming Wars: platform outage crisis event', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 888, rngState: 888 }), 123);
  });

  it('enqueues an outage event during the seeded outage week when service quality is very low at meaningful scale', () => {
    const playerPlatformId = 'player-platform:studio-1';
    const outageWeek = stableInt(`888|platform:outage-week|2027|${playerPlatformId}`, 22, 38);

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 888,
        rngState: 888,
        currentWeek: outageWeek - 1,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: playerPlatformId,
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 12_000_000,
            cash: 100_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            serviceQuality: 10,
            freshness: 10,
            catalogValue: 30,
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
        },
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const state = useGameStore.getState().game!;
    expect(state.currentWeek).toBe(outageWeek);

    expect(state.eventQueue.length).toBe(1);
    expect((state.eventQueue[0] as any)?.data?.kind).toBe('platform:outage');
  });
});
