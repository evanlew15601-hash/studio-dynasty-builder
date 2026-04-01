import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { AwardsSeasonSystem } from '@/game/systems/awardsSeasonSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
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
    currentYear: 2025,
    currentWeek: 1,
    currentQuarter: 1,
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
    universeSeed: 77,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('AwardsSeasonSystem (engine)', () => {
  it('announces nominations and processes a ceremony idempotently', () => {
    const playerProject = {
      id: 'p1',
      title: 'Prestige Drama',
      status: 'released',
      type: 'feature',
      script: { id: 's1', title: 'Prestige Drama', genre: 'drama', characteristics: { criticalPotential: 8 } },
      budget: { total: 10_000_000 },
      metrics: { criticsScore: 92, audienceScore: 85, boxOfficeTotal: 40_000_000 },
      cast: [],
      crew: [],
      releaseWeek: 30,
      releaseYear: 2024,
    } as any;

    const systems = [AwardsSeasonSystem];
    const rng = createRng(123);

    let state = makeBaseState({
      projects: [playerProject],
      allReleases: [playerProject],
    });

    // Week 2: Crystal Ring nominations
    state = advanceWeek(state, rng, systems).nextState;
    expect(state.currentWeek).toBe(2);
    expect(state.awardsSeason?.seasonNominations).toBeTruthy();

    // Advance to week 6: Crystal Ring ceremony
    for (let i = 0; i < 4; i++) {
      state = advanceWeek(state, rng, systems).nextState;
    }

    expect(state.currentWeek).toBe(6);

    expect(state.eventQueue.some((e) => e.id === 'awards:ceremony:crystal-ring:2025')).toBe(true);
    expect(state.awardsSeason?.ceremonyHistory?.['crystal-ring']).toBeTruthy();

    const awardsNow = (state.studio.awards || []).filter((a) => a.year === 2025 && a.ceremony === 'Crystal Ring');
    expect(awardsNow.length).toBeGreaterThan(0);

    const awardsCount = (state.studio.awards || []).length;

    // Next week: should not re-award the same ceremony.
    state = advanceWeek(state, rng, systems).nextState;
    expect((state.studio.awards || []).length).toBe(awardsCount);
  });
});
