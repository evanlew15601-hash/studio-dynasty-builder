import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
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

describe('TalentAvailabilitySystem', () => {
  it('clears expired busy status', () => {
    const state = makeBaseState({
      talent: [
        {
          id: 't1',
          name: 'Actor 1',
          type: 'actor',
          contractStatus: 'busy',
          busyUntilWeek: 2024 * 52 + 10,
          age: 30,
          gender: 'Male',
          fame: 0,
          reputation: 50,
          marketValue: 100_000,
        } as any,
      ],
    });

    const ctx = { rng: createRng(1), week: 10, year: 2024, quarter: 2, recap: [], debug: false };

    const next = TalentAvailabilitySystem.onTick(state, ctx as any);
    expect(next.talent[0].contractStatus).toBe('available');
    expect(next.talent[0].busyUntilWeek).toBeUndefined();
  });

  it('marks cast talent busy while a project is in production', () => {
    const state = makeBaseState({
      currentWeek: 5,
      talent: [
        {
          id: 't1',
          name: 'Actor 1',
          type: 'actor',
          contractStatus: 'available',
          age: 30,
          gender: 'Male',
          fame: 0,
          reputation: 50,
          marketValue: 100_000,
        } as any,
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

    const ctx = { rng: createRng(1), week: 5, year: 2024, quarter: 2, recap: [], debug: false };

    const next = TalentAvailabilitySystem.onTick(state, ctx as any);

    expect(next.talent[0].contractStatus).toBe('busy');
    expect(next.talent[0].busyUntilWeek).toBe(2024 * 52 + 5 + 8);
  });

  it('uses shorter busy windows for cameos', () => {
    const state = makeBaseState({
      currentWeek: 5,
      talent: [
        {
          id: 't1',
          name: 'Actor 1',
          type: 'actor',
          contractStatus: 'available',
          age: 30,
          gender: 'Male',
          fame: 0,
          reputation: 50,
          marketValue: 100_000,
        } as any,
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

    const ctx = { rng: createRng(1), week: 5, year: 2024, quarter: 2, recap: [], debug: false };

    const next = TalentAvailabilitySystem.onTick(state, ctx as any);

    expect(next.talent[0].contractStatus).toBe('busy');
    expect(next.talent[0].busyUntilWeek).toBe(2024 * 52 + 5 + 2);
  });
});
