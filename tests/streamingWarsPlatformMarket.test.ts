import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { useGameStore } from '@/game/store';
import { getStreamingProviders } from '@/data/ProviderDealsDatabase';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
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

describe('Streaming Wars: platform market tick integration', () => {
  beforeEach(() => {
    // Reset store to a deterministic baseline.
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 111, rngState: 111 }), 123);
  });

  it('does not create platformMarket when DLC is disabled', () => {
    useGameStore.getState().mergeGameState({ dlc: { streamingWars: false }, platformMarket: undefined } as any);

    useGameStore.getState().advanceWeek();

    const next = useGameStore.getState().game!;
    expect(next.dlc?.streamingWars).toBe(false);
    expect(next.platformMarket).toBeUndefined();
  });

  it('bootstraps platformMarket and rivals when DLC is enabled (deterministic)', () => {
    const expectedRivals = getStreamingProviders().length;

    // Run 1
    useGameStore.getState().initGame(
      makeBaseState({ dlc: { streamingWars: true }, platformMarket: undefined, universeSeed: 111, rngState: 111 }),
      123
    );
    useGameStore.getState().advanceWeek();
    const a = useGameStore.getState().game!.platformMarket;

    expect(a).toBeTruthy();
    expect(typeof a!.totalAddressableSubs).toBe('number');
    expect(a!.totalAddressableSubs).toBeGreaterThan(0);
    expect(Array.isArray(a!.rivals)).toBe(true);
    expect(a!.rivals!.length).toBe(expectedRivals);

    // Run 2 (same seed/state)
    useGameStore.getState().initGame(
      makeBaseState({ dlc: { streamingWars: true }, platformMarket: undefined, universeSeed: 111, rngState: 111 }),
      123
    );
    useGameStore.getState().advanceWeek();
    const b = useGameStore.getState().game!.platformMarket;

    expect(b).toEqual(a);
  });
});
