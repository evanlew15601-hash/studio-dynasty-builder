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

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('AwardsSeasonSystem: dedupe across reload/turn reprocessing', () => {
  it('does not duplicate studio or talent awards if a ceremony is reprocessed', () => {
    const playerProject = {
      id: 'p1',
      title: 'Prestige Drama',
      status: 'released',
      type: 'feature',
      script: { id: 's1', title: 'Prestige Drama', genre: 'drama', characteristics: { criticalPotential: 8 }, characters: [] },
      budget: { total: 10_000_000 },
      metrics: { criticsScore: 92, audienceScore: 85, boxOfficeTotal: 40_000_000 },
      cast: [],
      crew: [],
      releaseWeek: 30,
      releaseYear: 2024,
    } as any;

    const actor = {
      id: 't1',
      name: 'Test Actor',
      type: 'actor',
      age: 30,
      experience: 10,
      reputation: 60,
      marketValue: 10_000_000,
      genres: ['drama'],
      contractStatus: 'available',
      availability: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
      awards: [],
    } as any;

    const systems = [AwardsSeasonSystem];
    const rng = createRng(123);

    let state = makeBaseState({
      projects: [playerProject],
      allReleases: [playerProject],
      talent: [actor],
    });

    // Week 2: nominations
    state = advanceWeek(state, rng, systems).nextState;
    expect(state.currentWeek).toBe(2);

    // Advance to week 6: Crystal Ring ceremony
    for (let i = 0; i < 4; i++) {
      state = advanceWeek(state, rng, systems).nextState;
    }

    expect(state.currentWeek).toBe(6);

    const awardsSeason = state.awardsSeason!;
    const studioAwardsCount = (state.studio.awards || []).length;
    const talentAwardsCount = (state.talent[0].awards || []).length;

    expect(studioAwardsCount).toBeGreaterThan(0);
    expect(talentAwardsCount).toBeGreaterThan(0);

    // Simulate a reload/rollback that loses processedCeremonies but keeps awards.
    const corrupted: GameState = {
      ...state,
      awardsSeason: {
        ...awardsSeason,
        processedCeremonies: [],
      },
      eventQueue: [],
    };

    // Re-run the same week. Without dedupe, this would append duplicates.
    const rerun = AwardsSeasonSystem.onTick(corrupted, {
      rng,
      week: corrupted.currentWeek,
      year: corrupted.currentYear,
      quarter: corrupted.currentQuarter,
      recap: [],
      debug: false,
      prevState: corrupted,
    });

    expect((rerun.studio.awards || []).length).toBe(studioAwardsCount);
    expect(((rerun.talent[0].awards || []) as any[]).length).toBe(talentAwardsCount);
  });
});
