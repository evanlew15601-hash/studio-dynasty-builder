import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { GenreTrendsSystem } from '@/game/systems/genreTrendsSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
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
      trendingGenres: ['drama', 'comedy', 'action'],
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
    universeSeed: 99,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('GenreTrendsSystem', () => {
  it('updates trendingGenres and logs a genre_shift when the top box office genre changes', () => {
    const state = makeBaseState({
      projects: [
        {
          id: 'p1',
          title: 'Horror Hit',
          status: 'released',
          releaseWeek: 10,
          releaseYear: 2026,
          type: 'film',
          script: { id: 's1', title: 'Horror Hit', genre: 'horror', characters: [] } as any,
          budget: { total: 1 } as any,
          metrics: { boxOfficeTotal: 10 } as any,
          cast: [],
          crew: [],
        } as any,
      ],
      boxOfficeHistory: [
        {
          week: 10,
          year: 2026,
          releases: [{ projectId: 'p1', title: 'Horror Hit', studio: 'Player Studio', weeklyRevenue: 1, totalRevenue: 10, theaters: 1, weekInRelease: 1 }],
          totalRevenue: 10,
        },
      ],
    });

    const result = advanceWeek(state, createRng(1), [GenreTrendsSystem]);

    expect(result.nextState.currentYear).toBe(2027);
    expect(result.nextState.marketConditions.trendingGenres[0]).toBe('horror');

    const history = result.nextState.worldHistory || [];
    expect(history.some((e) => e.kind === 'genre_shift' && e.year === 2026)).toBe(true);
  });
});
