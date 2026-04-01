import { describe, expect, it } from 'vitest';
import type { GameState, TalentPerson } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { TalentLifecycleSystem } from '@/game/systems/talentLifecycleSystem';

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

describe('TalentLifecycleSystem', () => {
  it('runs on year rollover: ages everyone, increments experience only for non-retired', () => {
    const actor: TalentPerson = {
      id: 't:actor',
      name: 'Active Actor',
      type: 'actor',
      age: 30,
      experience: 5,
      reputation: 60,
      marketValue: 1_000_000,
      contractStatus: 'available',
      genres: ['drama'],
      specialties: ['drama'],
      availability: { startWeek: 1, endWeek: 52, year: 2026 },
    } as any;

    const retiredDirector: TalentPerson = {
      id: 't:director',
      name: 'Retired Director',
      type: 'director',
      age: 70,
      experience: 25,
      reputation: 80,
      marketValue: 10_000_000,
      contractStatus: 'retired',
      genres: ['drama'],
      specialties: ['drama'],
      availability: { startWeek: 1, endWeek: 52, year: 2026 },
    } as any;

    const state = makeBaseState({ talent: [actor, retiredDirector] });
    const result = advanceWeek(state, createRng(1), [TalentLifecycleSystem]);

    const a = result.nextState.talent.find((t) => t.id === 't:actor')!;
    const d = result.nextState.talent.find((t) => t.id === 't:director')!;

    expect(result.nextState.currentYear).toBe(2027);
    expect(result.nextState.currentWeek).toBe(1);

    expect(a.age).toBe(31);
    expect(a.experience).toBe(6);

    expect(d.age).toBe(71);
    expect(d.experience).toBe(25);
  });

  it('does not run mid-year', () => {
    const actor: TalentPerson = {
      id: 't:actor',
      name: 'Active Actor',
      type: 'actor',
      age: 30,
      experience: 5,
      reputation: 60,
      marketValue: 1_000_000,
      contractStatus: 'available',
      genres: ['drama'],
      specialties: ['drama'],
      availability: { startWeek: 1, endWeek: 52, year: 2026 },
    } as any;

    const state = makeBaseState({ currentWeek: 10, currentQuarter: 1, talent: [actor] });
    const result = advanceWeek(state, createRng(1), [TalentLifecycleSystem]);

    expect(result.nextState.currentWeek).toBe(11);
    expect(result.nextState.talent[0].age).toBe(30);
    expect(result.nextState.talent[0].experience).toBe(5);
  });
});
