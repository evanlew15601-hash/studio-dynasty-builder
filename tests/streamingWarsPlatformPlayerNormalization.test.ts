import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { useGameStore } from '@/game/store';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 60,
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

describe('Streaming Wars: player platform state normalization', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 222, rngState: 222 }), 123);
  });

  it('clamps player platform fields when bootstrapping platformMarket', () => {
    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 222,
        rngState: 222,
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
            adLoadIndex: -10,
            originalsQualityBonus: 99,
            freshness: 55,
            catalogValue: 45,
            distressWeeks: 0,
            lastTalentOfferYear: 2020,
            lastBiddingWarYear: 2021,
          },
          rivals: [],
        },
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const state = useGameStore.getState().game!;
    expect(state.platformMarket?.player?.adLoadIndex).toBe(0);
    expect(state.platformMarket?.player?.originalsQualityBonus).toBe(20);
    expect(state.platformMarket?.player?.lastTalentOfferYear).toBe(2020);
    expect(state.platformMarket?.player?.lastBiddingWarYear).toBe(2021);
  });
});
