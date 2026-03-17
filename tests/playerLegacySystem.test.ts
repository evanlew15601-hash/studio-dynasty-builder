import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { WorldMilestonesSystem } from '@/game/systems/worldMilestonesSystem';
import { WorldYearbookSystem } from '@/game/systems/worldYearbookSystem';
import { PlayerLegacySystem } from '@/game/systems/playerLegacySystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [
        { id: 'a1', projectId: 'p1', category: 'Best Picture', ceremony: 'Crown', year: 2025, prestige: 10, reputationBoost: 5 },
        { id: 'a2', projectId: 'p1', category: 'Best Director', ceremony: 'Crown', year: 2026, prestige: 10, reputationBoost: 5 },
      ],
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
      {
        week: 10,
        year: 2026,
        releases: [
          { projectId: 'p1', title: 'Player Hit', studio: 'Player Studio', weeklyRevenue: 10, totalRevenue: 500, theaters: 1, weekInRelease: 1 },
          { projectId: 'p2', title: 'Other Hit', studio: 'Other Studio', weeklyRevenue: 10, totalRevenue: 900, theaters: 1, weekInRelease: 1 },
        ],
        totalRevenue: 0,
      },
      {
        week: 11,
        year: 2026,
        releases: [
          { projectId: 'p1', title: 'Player Hit', studio: 'Player Studio', weeklyRevenue: 10, totalRevenue: 800, theaters: 1, weekInRelease: 2 },
        ],
        totalRevenue: 0,
      },
    ],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
    universeSeed: 123,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('PlayerLegacySystem', () => {
  it('computes totals and biggest hit on year rollover', () => {
    const state = makeBaseState();
    const result = advanceWeek(state, createRng(1), [WorldMilestonesSystem, WorldYearbookSystem, PlayerLegacySystem]);

    const legacy = result.nextState.playerLegacy;
    expect(legacy?.studioId).toBe('studio-1');
    expect(legacy?.totalAwards).toBe(2);
    expect(legacy?.totalReleases).toBe(1);
    expect(legacy?.totalBoxOffice).toBe(800);

    expect(legacy?.biggestHit?.projectId).toBe('p1');
    expect(legacy?.biggestHit?.boxOffice).toBe(800);

    expect(legacy?.bestYearByAwards).toEqual({ year: 2025, awards: 1 });
  });

  it('logs milestone history entries when thresholds are crossed', () => {
    const state = makeBaseState({
      boxOfficeHistory: [
        {
          week: 10,
          year: 2026,
          releases: [
            { projectId: 'p1', title: 'Player Hit', studio: 'Player Studio', weeklyRevenue: 10, totalRevenue: 100_000_001, theaters: 1, weekInRelease: 1 },
          ],
          totalRevenue: 0,
        },
      ],
    });

    const result = advanceWeek(state, createRng(1), [WorldMilestonesSystem, WorldYearbookSystem, PlayerLegacySystem]);

    const history = result.nextState.worldHistory || [];
    expect(history.some((e) => e.id === 'hist:studio_milestone:studio-1:boxoffice:100000000')).toBe(true);
  });
});
