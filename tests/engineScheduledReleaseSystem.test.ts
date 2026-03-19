import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { ScheduledReleaseSystem } from '@/game/systems/scheduledReleaseSystem';
import { BoxOfficeSystem } from '@/game/systems/boxOfficeSystem';

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

describe('Engine scheduled release system', () => {
  it('releases scheduled theatrical projects and allows box office to run opening week in the same tick', () => {
    const project: Project = {
      id: 'p1',
      title: 'Scheduled Release',
      script: {
        id: 's1',
        title: 'Scheduled Release',
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
      currentPhase: 'release' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'scheduled-for-release',
      metrics: {},
      phaseDuration: -1,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 100,
        budgetApproval: 100,
        talentAttached: 100,
        locationSecured: 100,
        completionThreshold: 100,
        issues: [],
      },
      releaseStrategy: {
        type: 'wide',
        premiereDate: new Date(2024, 0, 1),
        rolloutPlan: [],
        specialEvents: [],
        pressStrategy: { reviewScreenings: 0, pressJunkets: 0, interviews: 0, expectedCriticalReception: 0 },
      } as any,
      scheduledReleaseWeek: 10,
      scheduledReleaseYear: 2024,
    };

    const state = makeBaseState({
      projects: [project],
      allReleases: [project],
    });

    const result = advanceWeek(state, createRng(1), [ScheduledReleaseSystem, BoxOfficeSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(10);

    const updated = next.projects[0];
    expect(updated.status).toBe('released');
    expect(updated.releaseWeek).toBe(10);
    expect(updated.releaseYear).toBe(2024);

    expect(updated.metrics?.boxOfficeTotal || 0).toBeGreaterThan(0);
    expect(next.boxOfficeHistory.some((w) => w.week === 10 && w.year === 2024)).toBe(true);
  });
});
