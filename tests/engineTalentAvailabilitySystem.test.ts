import { describe, expect, it } from 'vitest';
import type { GameState, TalentPerson } from '@/types/game';
import { TalentAvailabilitySystem } from '@/game/systems/talentAvailabilitySystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  return {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2024,
    currentWeek: 10,
    currentQuarter: 2,
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
    ...(overrides || {}),
  } as GameState;
}

function makeTalent(overrides: Partial<TalentPerson> & Pick<TalentPerson, 'id' | 'name'>): TalentPerson {
  return {
    id: overrides.id,
    name: overrides.name,
    type: 'actor',
    age: 35,
    experience: 10,
    reputation: 80,
    marketValue: 5_000_000,
    genres: ['drama'],
    contractStatus: 'available',
    availability: { start: new Date(0), end: new Date(0) },
    ...overrides,
  } as TalentPerson;
}

describe('TalentAvailabilitySystem', () => {
  it('clears busy status when busyUntilWeek has passed', () => {
    const state = makeBaseState({
      currentWeek: 10,
      currentYear: 2024,
      projects: [],
      talent: [
        makeTalent({
          id: 't1',
          name: 'Actor',
          contractStatus: 'busy',
          busyUntilWeek: 2024 * 52 + 10,
        }),
      ],
    });

    const next = TalentAvailabilitySystem.onTick(state, { week: 10, year: 2024, recap: [] } as any);

    expect(next.talent[0].contractStatus).toBe('available');
    expect(next.talent[0].busyUntilWeek).toBeUndefined();
  });

  it('restores contracted status after the busy window ends', () => {
    const state = makeBaseState({
      currentWeek: 10,
      currentYear: 2024,
      projects: [],
      talent: [
        makeTalent({
          id: 't1',
          name: 'Actor',
          contractStatus: 'busy',
          contractStatusBase: 'contracted',
          busyUntilWeek: 2024 * 52 + 10,
        }),
      ],
    });

    const next = TalentAvailabilitySystem.onTick(state, { week: 10, year: 2024, recap: [] } as any);

    expect(next.talent[0].contractStatus).toBe('contracted');
    expect(next.talent[0].contractStatusBase).toBeUndefined();
    expect(next.talent[0].busyUntilWeek).toBeUndefined();
  });

  it('infers contracted base status from project contractedTalent for old saves', () => {
    const state = makeBaseState({
      currentWeek: 10,
      currentYear: 2024,
      projects: [
        {
          id: 'p1',
          title: 'Film',
          type: 'feature',
          status: 'production',
          currentPhase: 'production',
          cast: [],
          crew: [],
          contractedTalent: [{ talentId: 't1' }],
        } as any,
      ],
      talent: [
        makeTalent({
          id: 't1',
          name: 'Actor',
          contractStatus: 'busy',
          busyUntilWeek: 2024 * 52 + 10,
        }),
      ],
    });

    const next = TalentAvailabilitySystem.onTick(state, { week: 10, year: 2024, recap: [] } as any);

    expect(next.talent[0].contractStatus).toBe('contracted');
    expect(next.talent[0].contractStatusBase).toBeUndefined();
    expect(next.talent[0].busyUntilWeek).toBeUndefined();
  });

  it('marks cast talent busy while a project is in production (preserving contract status)', () => {
    const state = makeBaseState({
      currentWeek: 5,
      currentYear: 2024,
      talent: [
        makeTalent({
          id: 't1',
          name: 'Actor 1',
          contractStatus: 'contracted',
        }),
      ],
      projects: [
        {
          id: 'p1',
          title: 'Film',
          type: 'feature',
          status: 'production',
          currentPhase: 'production',
          cast: [{ talentId: 't1', role: 'Lead Actor' }],
          crew: [],
          script: {} as any,
          budget: { total: 1_000_000 } as any,
          timeline: {} as any,
          locations: [],
          distributionStrategy: {} as any,
          metrics: {} as any,
          phaseDuration: 1,
          contractedTalent: [],
          developmentProgress: {} as any,
        } as any,
      ],
    });

    const next = TalentAvailabilitySystem.onTick(state, { week: 5, year: 2024, recap: [] } as any);

    expect(next.talent[0].contractStatus).toBe('busy');
    expect(next.talent[0].contractStatusBase).toBe('contracted');
    expect(next.talent[0].busyUntilWeek).toBe(2024 * 52 + 5 + 8);
  });

  it('uses shorter busy windows for cameos', () => {
    const state = makeBaseState({
      currentWeek: 5,
      currentYear: 2024,
      talent: [
        makeTalent({
          id: 't1',
          name: 'Actor 1',
          contractStatus: 'contracted',
        }),
      ],
      projects: [
        {
          id: 'p1',
          title: 'Film',
          type: 'feature',
          status: 'production',
          currentPhase: 'production',
          cast: [{ talentId: 't1', role: 'Cameo' }],
          crew: [],
          script: {} as any,
          budget: { total: 1_000_000 } as any,
          timeline: {} as any,
          locations: [],
          distributionStrategy: {} as any,
          metrics: {} as any,
          phaseDuration: 1,
          contractedTalent: [],
          developmentProgress: {} as any,
        } as any,
      ],
    });

    const next = TalentAvailabilitySystem.onTick(state, { week: 5, year: 2024, recap: [] } as any);

    expect(next.talent[0].contractStatus).toBe('busy');
    expect(next.talent[0].contractStatusBase).toBe('contracted');
    expect(next.talent[0].busyUntilWeek).toBe(2024 * 52 + 5 + 2);
  });
});
