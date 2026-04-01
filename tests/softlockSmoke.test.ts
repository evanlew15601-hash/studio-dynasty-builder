import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { useGameStore } from '@/game/store';
import { validateGameState } from '@/game/core/coreLoopChecks';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 75,
      budget: 500_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
    currentWeek: 1,
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
    universeSeed: 30303,
    rngState: 30303 as any,
  };

  return { ...base, ...(overrides || {}) } as any;
}

describe('softlock smoke test', () => {
  it('advances time and resolves events without getting stuck', () => {
    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 15_000_000,
            cash: 1_000_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 50, adFreePct: 50 },
            promotionBudgetPerWeek: 5_000_000,
            priceIndex: 1.0,
            adLoadIndex: 50,
            freshness: 65,
            catalogValue: 60,
            distressWeeks: 0,
            maxExclusiveWindows: 2,
            lastExclusiveWindowWeek: 0,
            lastExclusiveWindowYear: 0,
          },
          rivals: [],
        } as any,
      }),
      9999
    );

    for (let i = 0; i < 52; i++) {
      useGameStore.getState().advanceWeek({ suppressRecap: true });

      // Always resolve events; failing to do so should not trap the engine.
      let guard = 0;
      while ((useGameStore.getState().game!.eventQueue || []).length > 0) {
        guard++;
        expect(guard).toBeLessThan(200);

        const evt = useGameStore.getState().game!.eventQueue[0] as any;
        expect(evt?.choices?.length || 0).toBeGreaterThan(0);

        const choiceId = evt.choices[0].id;
        useGameStore.getState().resolveGameEvent(evt.id, choiceId);
      }

      const state = useGameStore.getState().game!;
      expect(validateGameState(state)).toEqual([]);
    }
  });
});
