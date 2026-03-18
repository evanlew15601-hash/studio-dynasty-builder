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

describe('Streaming Wars: player platform hard fail is extreme (not any loss)', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 222, rngState: 222 }), 123);
  });

  it('does not hard-fail quickly, but can hard-fail after sustained extreme underperformance', () => {
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
            subscribers: 100_000,
            cash: -600_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.4,
            freshness: 0,
            catalogValue: 0,
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

    const initialBudget = useGameStore.getState().game!.studio.budget;

    // One tick should apply platform losses to the studio budget.
    useGameStore.getState().advanceWeek();

    const afterOne = useGameStore.getState().game!;
    expect(afterOne.studio.budget).toBeLessThan(initialBudget);
    expect(afterOne.platformMarket?.player?.status).toBe('active');

    // 10 weeks is not enough to trigger hard fail.
    for (let i = 0; i < 9; i++) {
      useGameStore.getState().advanceWeek();
    }

    const afterTen = useGameStore.getState().game!;
    expect(afterTen.platformMarket?.player?.status).toBe('active');

    // Push to the extreme sustained window. The system uses >= 20 consecutive distress ticks.
    for (let i = 0; i < 11; i++) {
      useGameStore.getState().advanceWeek();
    }

    const afterTwentyOne = useGameStore.getState().game!;
    expect(['sold', 'shutdown']).toContain(afterTwentyOne.platformMarket?.player?.status);
    expect(afterTwentyOne.platformMarket?.player?.subscribers).toBe(0);
  });
});
