import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { PostTheatricalRevenueSystem } from '@/game/systems/postTheatricalRevenueSystem';

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
    },
    currentYear: 2024,
    currentWeek: 9,
    currentQuarter: 1,
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

describe('Engine post-theatrical revenue system', () => {
  it('starts a planned window on its scheduled week and increments revenue', () => {
    const project: Project = {
      id: 'p1',
      title: 'Test Release',
      script: {
        id: 's1',
        title: 'Test Release',
        genre: 'drama',
        logline: '',
        writer: 'x',
        pages: 100,
        quality: 50,
        budget: 10_000_000,
        developmentStage: 'final',
        themes: [],
        targetAudience: 'general',
        estimatedRuntime: 100,
        characteristics: {
          tone: 'balanced',
          pacing: 'steady',
          dialogue: 'naturalistic',
          visualStyle: 'realistic',
          commercialAppeal: 5,
          criticalPotential: 5,
          cgiIntensity: 'minimal',
        },
      },
      type: 'feature',
      currentPhase: 'distribution' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'released',
      metrics: {},
      phaseDuration: 0,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 100,
        locationSecured: 100,
        completionThreshold: 100,
        issues: [],
      },
      releaseWeek: 1,
      releaseYear: 2024,
      postTheatricalReleases: [
        {
          id: 'post-1',
          projectId: 'p1',
          platform: 'streaming',
          releaseDate: new Date(2024, 0, 1),
          releaseWeek: 10,
          releaseYear: 2024,
          revenue: 0,
          weeklyRevenue: 250_000,
          weeksActive: 0,
          status: 'planned',
          cost: 0,
          durationWeeks: 26,
        },
      ],
    };

    const state = makeBaseState({
      projects: [project],
      allReleases: [project],
    });

    const result = advanceWeek(state, createRng(1), [PostTheatricalRevenueSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(10);

    const updated = next.projects[0];
    const window = updated.postTheatricalReleases?.[0]!;

    expect(window.lastProcessedWeek).toBe(10);
    expect(window.lastProcessedYear).toBe(2024);

    expect(window.status).toBe('active');
    expect(window.weeksActive).toBe(1);
    expect(window.revenue).toBe(250_000);
  });

  it('does not start a planned window early', () => {
    const project: Project = {
      id: 'p2',
      title: 'Test Release 2',
      script: {
        id: 's2',
        title: 'Test Release 2',
        genre: 'drama',
        logline: '',
        writer: 'x',
        pages: 100,
        quality: 50,
        budget: 10_000_000,
        developmentStage: 'final',
        themes: [],
        targetAudience: 'general',
        estimatedRuntime: 100,
        characteristics: {
          tone: 'balanced',
          pacing: 'steady',
          dialogue: 'naturalistic',
          visualStyle: 'realistic',
          commercialAppeal: 5,
          criticalPotential: 5,
          cgiIntensity: 'minimal',
        },
      },
      type: 'feature',
      currentPhase: 'distribution' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'released',
      metrics: {},
      phaseDuration: 0,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 100,
        locationSecured: 100,
        completionThreshold: 100,
        issues: [],
      },
      releaseWeek: 1,
      releaseYear: 2024,
      postTheatricalReleases: [
        {
          id: 'post-2',
          projectId: 'p2',
          platform: 'streaming',
          releaseDate: new Date(2024, 0, 1),
          releaseWeek: 10,
          releaseYear: 2024,
          revenue: 0,
          weeklyRevenue: 250_000,
          weeksActive: 0,
          status: 'planned',
          cost: 0,
          durationWeeks: 26,
        },
      ],
    };

    const state = makeBaseState({
      currentWeek: 7,
      projects: [project],
      allReleases: [project],
    });

    const result = advanceWeek(state, createRng(1), [PostTheatricalRevenueSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(8);

    const window = next.projects[0].postTheatricalReleases?.[0]!;
    expect(window.status).toBe('planned');
    expect(window.revenue).toBe(0);
    expect(window.lastProcessedWeek).toBe(8);
    expect(window.lastProcessedYear).toBe(2024);
  });
});
