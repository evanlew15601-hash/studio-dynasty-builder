import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '@/types/game';
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

describe('Streaming Wars: platform crisis pacing', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 9001, rngState: 9001 }), 123);
  });

  it('does not let non-crisis events block platform crisis enqueuing', () => {
    const existing: GameEvent = {
      id: 'existing-market-event',
      title: 'FYI: market note',
      description: 'A non-crisis event already in the queue.',
      type: 'market',
      triggerDate: new Date(2027, 0, 1),
      choices: [{ id: 'ok', text: 'Ok', consequences: [] }],
    };

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 9001,
        rngState: 9001,
        currentWeek: 12,
        eventQueue: [existing],
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 12_000_000,
            cash: -100_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.5,
            serviceQuality: 20,
            freshness: 0,
            catalogValue: 0,
            distressWeeks: 0,
          },
          rivals: [],
        },
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const state = useGameStore.getState().game!;

    // Existing non-crisis event still present.
    expect(state.eventQueue.some((e) => e.id === 'existing-market-event')).toBe(true);

    // Platform crisis event is also enqueued.
    expect(state.eventQueue.some((e: any) => e?.data?.kind === 'platform:churn-spike')).toBe(true);
  });
});
