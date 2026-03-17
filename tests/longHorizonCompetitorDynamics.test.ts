import { describe, expect, it } from 'vitest';
import type { GameState, Studio } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { StudioFortunesSystem } from '@/game/systems/studioFortunesSystem';
import { CompetitorStudioLifecycleSystem } from '@/game/systems/competitorStudioLifecycleSystem';
import { AiTelevisionSystem } from '@/game/systems/aiTelevisionSystem';
import { WorldArchiveSystem } from '@/game/systems/worldArchiveSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const competitorStudios: Studio[] = [
    { id: 'c1', name: 'Cobalt Pictures', reputation: 62, budget: 40_000_000, founded: 1980, specialties: ['drama'] as any, awards: [] },
    { id: 'c2', name: 'Marble Films', reputation: 55, budget: 25_000_000, founded: 1995, specialties: ['comedy'] as any, awards: [] },
    { id: 'c3', name: 'Iron Harbor', reputation: 70, budget: 80_000_000, founded: 1972, specialties: ['action'] as any, awards: [] },
    { id: 'c4', name: 'Velvet Lantern', reputation: 58, budget: 30_000_000, founded: 2005, specialties: ['thriller'] as any, awards: [] },
    { id: 'c5', name: 'Lunar Atlas', reputation: 65, budget: 55_000_000, founded: 1988, specialties: ['sci-fi'] as any, awards: [] },
    { id: 'c6', name: 'Evergreen Studios', reputation: 60, budget: 35_000_000, founded: 1990, specialties: ['family'] as any, awards: [] },
  ];

  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 5_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2026,
    currentWeek: 1,
    currentQuarter: 1,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios,
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
    // Seed with at least one entry so AiTelevisionSystem is active.
    allReleases: [
      {
        projectId: 'seed',
        title: 'Seed Release',
        studio: 'Player Studio',
        weeklyRevenue: 0,
        totalRevenue: 0,
        theaters: 0,
        weekInRelease: 0,
      },
    ],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
    universeSeed: 999,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('long-horizon competitor dynamics', () => {
  it('remains deterministic and keeps competitor roster stable while fortunes evolve', () => {
    const systems = [StudioFortunesSystem, CompetitorStudioLifecycleSystem, AiTelevisionSystem, WorldArchiveSystem];

    const simulate = () => {
      let state = makeBaseState();
      const rng = createRng(123);

      const years = 60;
      const totalTicks = years * 52;

      const avgRepByYear: number[] = [];
      const totalBudgetByYear: number[] = [];

      for (let i = 0; i < totalTicks; i++) {
        const beforeYear = state.currentYear;
        const beforeWeek = state.currentWeek;

        const result = advanceWeek(state, rng, systems);
        state = result.nextState;

        const rollover = beforeWeek === 52 && state.currentWeek === 1 && state.currentYear === beforeYear + 1;
        if (rollover) {
          const studios = state.competitorStudios || [];
          avgRepByYear.push(studios.reduce((s, x) => s + (x.reputation || 0), 0) / Math.max(1, studios.length));
          totalBudgetByYear.push(studios.reduce((s, x) => s + (x.budget || 0), 0));
        }
      }

      return { state, avgRepByYear, totalBudgetByYear };
    };

    const run1 = simulate();
    const run2 = simulate();

    expect(run1.avgRepByYear).toEqual(run2.avgRepByYear);
    expect(run1.totalBudgetByYear).toEqual(run2.totalBudgetByYear);

    // Roster stable (replacements may occur, but count should remain constant).
    expect(run1.state.competitorStudios.length).toBe(6);

    // History should remain bounded (via pruning).
    expect((run1.state.worldHistory || []).length).toBeLessThanOrEqual(280);

    // Fortunes should not be frozen.
    const reps = run1.state.competitorStudios.map((s) => s.reputation);
    expect(new Set(reps).size).toBeGreaterThan(1);
  });
});
