import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { StudioEconomySystem } from '@/game/systems/studioEconomySystem';
import { StudioRevenueSystem } from '@/game/systems/studioRevenueSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
      debt: 0,
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

describe('Studio economy + revenue systems', () => {
  it('deducts weekly overhead + production burn and increments debt if budget goes negative', () => {
    const productionProject: Project = {
      id: 'p1',
      title: 'Prod',
      type: 'feature',
      currentPhase: 'production' as any,
      status: 'production',
      budget: { total: 12_000_000 } as any,
      script: {} as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      metrics: {} as any,
      phaseDuration: 1,
      contractedTalent: [],
      developmentProgress: {} as any,
    };

    const ctx = { rng: createRng(1), week: 10, year: 2024, quarter: 2, recap: [], debug: false };

    const withCosts = StudioEconomySystem.onTick(
      makeBaseState({ projects: [productionProject] }),
      ctx as any
    );

    expect(Math.round(withCosts.studio.budget)).toBe(265_000);
    expect(Math.round(withCosts.studio.debt || 0)).toBe(0);
    expect(withCosts.studio.weeksSinceLastProject).toBe(1);

    const withDebt = StudioEconomySystem.onTick(
      makeBaseState({ studio: { ...makeBaseState().studio, budget: 100_000, debt: 0 }, projects: [productionProject] }),
      ctx as any
    );

    expect(withDebt.studio.budget).toBe(0);
    expect((withDebt.studio.debt || 0)).toBeGreaterThan(635_000);
  });

  it('credits weekly theatrical + post-theatrical revenue to the studio budget', () => {
    const released: Project = {
      id: 'p2',
      title: 'Release',
      type: 'feature',
      currentPhase: 'distribution' as any,
      status: 'released',
      budget: { total: 10_000_000 } as any,
      script: {} as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      metrics: {
        weeksSinceRelease: 0,
        lastWeeklyRevenue: 1_000_000,
        theatricalRunLocked: false,
      } as any,
      phaseDuration: -1,
      contractedTalent: [],
      developmentProgress: {} as any,
      releaseWeek: 10,
      releaseYear: 2024,
      releaseStrategy: { type: 'wide' } as any,
      postTheatricalReleases: [
        {
          id: 'r1',
          projectId: 'p2',
          platform: 'digital',
          providerId: undefined,
          releaseDate: new Date('2024-01-01T00:00:00.000Z'),
          releaseWeek: 10,
          releaseYear: 2024,
          delayWeeks: 0,
          revenue: 20_000,
          weeklyRevenue: 20_000,
          weeksActive: 1,
          status: 'active',
          cost: 0,
          durationWeeks: 10,
          lastProcessedWeek: 10,
          lastProcessedYear: 2024,
        } as any,
      ],
    };

    const ctx = { rng: createRng(1), week: 10, year: 2024, quarter: 2, recap: [], debug: false };

    const next = StudioRevenueSystem.onTick(
      makeBaseState({ studio: { ...makeBaseState().studio, budget: 0 }, projects: [released] }),
      ctx as any
    );

    expect(Math.round(next.studio.budget)).toBe(570_000);
  });
});
