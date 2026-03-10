import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { useGameStore } from '@/game/store';

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
    currentYear: 2026,
    currentWeek: 52,
    currentQuarter: 4,
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

  return { ...base, ...(overrides || {}) };
}

beforeEach(() => {
  // Ensure a clean baseline between tests.
  useGameStore.getState().initGame(makeBaseState({ universeSeed: 111 }), 123);
});

describe('Game store tick integration', () => {
  it('advanceWeek runs registered systems (TalentDebutSystem) on year rollover', () => {
    const report = useGameStore.getState().advanceWeek();
    expect(report).toBeTruthy();

    const state = useGameStore.getState().game!;
    expect(state.currentYear).toBe(2027);
    expect(state.currentWeek).toBe(1);

    // Stable per-save seed should not be overwritten by the tick.
    expect(state.universeSeed).toBe(111);

    // Includes a known handcrafted 2027 debut.
    expect(state.talent.some((t) => t.name === 'Rani Sundar')).toBe(true);

    // Tick report includes the recap card.
    expect(report!.recap.some((c) => c.type === 'talent')).toBe(true);
  });
});
