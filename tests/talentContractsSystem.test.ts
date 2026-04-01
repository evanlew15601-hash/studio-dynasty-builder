import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { TalentContractsSystem } from '@/game/systems/talentContractsSystem';
import { createRng } from '@/game/core/rng';

function makeState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Studio',
      reputation: 50,
      budget: 150_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
      weeksSinceLastProject: 0,
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
    universeSeed: 123,
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('TalentContractsSystem', () => {
  it('pays weekly payroll, decrements weeksRemaining, and releases talent when the contract ends', () => {
    const project: Project = {
      id: 'p1',
      title: 'Proj',
      type: 'feature',
      currentPhase: 'development' as any,
      status: 'development',
      budget: { total: 1 } as any,
      script: {} as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      metrics: {} as any,
      phaseDuration: 1,
      developmentProgress: {} as any,
      contractedTalent: [
        {
          talentId: 't1',
          role: 'Lead Actor',
          weeklyPay: 100_000,
          contractWeeks: 2,
          weeksRemaining: 2,
          startWeek: 10,
        },
      ],
    };

    const state0 = makeState({
      studio: { ...makeState().studio, budget: 150_000, debt: 0 },
      projects: [project],
      talent: [
        {
          id: 't1',
          name: 'Star',
          type: 'actor',
          age: 30,
          experience: 10,
          reputation: 70,
          marketValue: 10_000_000,
          genres: ['drama'],
          contractStatus: 'available',
          availability: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
        } as any,
      ],
    });

    const ctx = { rng: createRng(1), week: 10, year: 2024, quarter: 2, recap: [], debug: false } as any;

    const after1 = TalentContractsSystem.onTick(state0, ctx);

    expect(after1.studio.budget).toBe(50_000);
    expect(after1.projects[0].contractedTalent[0].weeksRemaining).toBe(1);
    expect(after1.talent[0].contractStatus).toBe('contracted');

    const after2 = TalentContractsSystem.onTick(after1, ctx);

    expect(after2.studio.budget).toBe(0);
    expect((after2.studio.debt || 0)).toBe(50_000);
    expect(after2.projects[0].contractedTalent.length).toBe(0);
    expect(after2.talent[0].contractStatus).toBe('available');
  });
});
