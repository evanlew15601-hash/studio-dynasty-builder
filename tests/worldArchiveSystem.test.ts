import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { WorldYearbookSystem } from '@/game/systems/worldYearbookSystem';
import { WorldArchiveSystem } from '@/game/systems/worldArchiveSystem';

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
      trendingGenres: ['drama'],
      audiencePreferences: [],
      economicClimate: 'stable',
      technologicalAdvances: [],
      regulatoryChanges: [],
      seasonalTrends: [],
      competitorReleases: [],
    },
    eventQueue: [],
    boxOfficeHistory: [
      { week: 1, year: 2014, releases: [], totalRevenue: 0 },
      { week: 1, year: 2015, releases: [], totalRevenue: 0 },
      { week: 1, year: 2026, releases: [], totalRevenue: 0 },
    ],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [
      { week: 1, year: 2014, topFilms: [] },
      { week: 1, year: 2015, topFilms: [] },
      { week: 1, year: 2026, topFilms: [] },
    ],
    worldHistory: [],
    worldYearbooks: [],
    franchises: [],
    publicDomainIPs: [],
    universeSeed: 1,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('WorldArchiveSystem', () => {
  it('prunes boxOfficeHistory and topFilmsHistory to a bounded year window', () => {
    const state = makeBaseState();

    const result = advanceWeek(state, createRng(1), [WorldYearbookSystem, WorldArchiveSystem]);

    // On rollover to 2027, archive keeps years >= 2015.
    expect(result.nextState.currentYear).toBe(2027);
    expect(result.nextState.boxOfficeHistory.map((w) => w.year)).toEqual([2015, 2026]);
    expect(result.nextState.topFilmsHistory.map((w) => w.year)).toEqual([2015, 2026]);
  });
});
