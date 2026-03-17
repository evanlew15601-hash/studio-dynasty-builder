import { describe, expect, it } from 'vitest';
import type { GameState, TalentPerson } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { TalentLifecycleSystem } from '@/game/systems/talentLifecycleSystem';
import { TalentRetirementSystem } from '@/game/systems/talentRetirementSystem';

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
    universeSeed: 123,
  };

  return { ...base, ...(overrides || {}) };
}

describe('TalentRetirementSystem', () => {
  it('retires only available actors/directors on year rollover and stamps previousYear/week52', () => {
    const oldActors: TalentPerson[] = Array.from({ length: 50 }).map((_, i) => ({
      id: `t:old:actor:${i}`,
      name: `Old Actor ${i}`,
      type: 'actor',
      age: 85,
      experience: 40,
      reputation: 60,
      burnoutLevel: 100,
      marketValue: 2_000_000,
      contractStatus: 'available',
      genres: ['drama'],
      specialties: ['drama'],
      availability: { startWeek: 1, endWeek: 52, year: 2026 },
    })) as any;

    const signedActor: TalentPerson = {
      id: 't:signed',
      name: 'Signed Actor',
      type: 'actor',
      age: 90,
      experience: 50,
      reputation: 40,
      burnoutLevel: 100,
      marketValue: 2_000_000,
      contractStatus: 'signed',
      genres: ['drama'],
      specialties: ['drama'],
      availability: { startWeek: 1, endWeek: 52, year: 2026 },
    } as any;

    const state = makeBaseState({ talent: [...oldActors, signedActor] });

    const result = advanceWeek(state, createRng(1), [TalentLifecycleSystem, TalentRetirementSystem]);

    const retired = result.nextState.talent.filter((t) => t.contractStatus === 'retired');
    expect(retired.length).toBeGreaterThan(0);

    for (const t of retired) {
      expect(t.retired?.year).toBe(2026);
      expect(t.retired?.week).toBe(52);
      expect((t.careerEvolution || []).some((e) => e.type === 'retirement' && e.year === 2026 && e.week === 52)).toBe(true);
    }

    // Conservative eligibility: signed talent should not be retired.
    expect(result.nextState.talent.find((t) => t.id === 't:signed')!.contractStatus).toBe('signed');

    // Determinism: same input -> same retirement set.
    const result2 = advanceWeek(state, createRng(1), [TalentLifecycleSystem, TalentRetirementSystem]);
    const ids1 = retired.map((t) => t.id).sort();
    const ids2 = result2.nextState.talent.filter((t) => t.contractStatus === 'retired').map((t) => t.id).sort();
    expect(ids1).toEqual(ids2);
  });
});
