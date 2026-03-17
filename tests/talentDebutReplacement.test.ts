import { describe, expect, it } from 'vitest';
import type { GameState, TalentPerson } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { TalentDebutSystem } from '@/game/systems/talentDebutSystem';

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
    universeSeed: 111,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('TalentDebutSystem (replacement-aware)', () => {
  it('adds additional rookies in response to previous-year retirements', () => {
    const retired: TalentPerson[] = [
      {
        id: 't:r1',
        name: 'Retired Actor 1',
        type: 'actor',
        age: 70,
        experience: 25,
        reputation: 50,
        marketValue: 1,
        contractStatus: 'retired',
        retired: { year: 2026, week: 52, reason: 'age' },
        genres: ['drama'],
        specialties: ['drama'],
        availability: { startWeek: 1, endWeek: 52, year: 2026 },
      },
      {
        id: 't:r2',
        name: 'Retired Actor 2',
        type: 'actor',
        age: 70,
        experience: 25,
        reputation: 50,
        marketValue: 1,
        contractStatus: 'retired',
        retired: { year: 2026, week: 52, reason: 'age' },
        genres: ['drama'],
        specialties: ['drama'],
        availability: { startWeek: 1, endWeek: 52, year: 2026 },
      },
      {
        id: 't:r3',
        name: 'Retired Actor 3',
        type: 'actor',
        age: 70,
        experience: 25,
        reputation: 50,
        marketValue: 1,
        contractStatus: 'retired',
        retired: { year: 2026, week: 52, reason: 'age' },
        genres: ['drama'],
        specialties: ['drama'],
        availability: { startWeek: 1, endWeek: 52, year: 2026 },
      },
      {
        id: 't:rd1',
        name: 'Retired Director 1',
        type: 'director',
        age: 75,
        experience: 30,
        reputation: 50,
        marketValue: 1,
        contractStatus: 'retired',
        retired: { year: 2026, week: 52, reason: 'age' },
        genres: ['drama'],
        specialties: ['drama'],
        availability: { startWeek: 1, endWeek: 52, year: 2026 },
      },
    ] as any;

    const state = makeBaseState({ talent: retired });
    const result = advanceWeek(state, createRng(1), [TalentDebutSystem]);

    const rookies = (result.nextState.talent || []).filter((t) => t.id.startsWith('rookie:2027:'));

    // Baseline 8 actors + 2 directors, plus replacements for 3 retired actors and 1 retired director.
    expect(rookies.length).toBe(14);
    expect(rookies.filter((t) => t.type === 'actor').length).toBe(11);
    expect(rookies.filter((t) => t.type === 'director').length).toBe(3);
  });
});
