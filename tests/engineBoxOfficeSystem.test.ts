import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
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

describe('Engine box office system', () => {
  it('records opening week box office and creates a BoxOfficeWeek entry', () => {
    const project: Project = {
      id: 'p1',
      title: 'Test Release',
      script: { id: 's1', title: 'Test Release', genre: 'drama', logline: '', writer: 'x', pages: 100, quality: 50, budget: 10_000_000, developmentStage: 'final', themes: [], targetAudience: 'general', estimatedRuntime: 100, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 5, cgiIntensity: 'minimal' } },
      type: 'feature',
      currentPhase: 'release' as any,
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
      developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 100, locationSecured: 100, completionThreshold: 100, issues: [] },
      releaseStrategy: { type: 'wide', premiereDate: new Date(2024, 0, 1), rolloutPlan: [], specialEvents: [], pressStrategy: { reviewScreenings: 0, pressJunkets: 0, interviews: 0, expectedCriticalReception: 0 } } as any,
      releaseWeek: 10,
      releaseYear: 2024,
    };

    const state = makeBaseState({
      projects: [project],
      allReleases: [project],
    });

    const result = advanceWeek(state, createRng(1), [BoxOfficeSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(10);

    const updated = next.projects[0];
    expect(updated.metrics?.weeksSinceRelease).toBe(0);
    expect(updated.metrics?.boxOfficeTotal || 0).toBeGreaterThan(0);

    expect(next.boxOfficeHistory.length).toBe(1);
    expect(next.boxOfficeHistory[0].week).toBe(10);
    expect(next.boxOfficeHistory[0].year).toBe(2024);
    expect(next.boxOfficeHistory[0].releases.some((r) => r.projectId === 'p1')).toBe(true);

    const rel = next.boxOfficeHistory[0].releases.find((r) => r.projectId === 'p1')!;
    expect(rel.weekInRelease).toBe(1);
    expect(rel.weeklyRevenue).toBe(updated.metrics?.lastWeeklyRevenue);
    expect(rel.totalRevenue).toBe(updated.metrics?.boxOfficeTotal);
  });

  it('advances box office totals by one week and records a new BoxOfficeWeek entry', () => {
    const project: Project = {
      id: 'p2',
      title: 'Test Release 2',
      script: { id: 's2', title: 'Test Release 2', genre: 'action', logline: '', writer: 'x', pages: 100, quality: 50, budget: 10_000_000, developmentStage: 'final', themes: [], targetAudience: 'general', estimatedRuntime: 100, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 5, cgiIntensity: 'minimal' } },
      type: 'feature',
      currentPhase: 'release' as any,
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
      developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 100, locationSecured: 100, completionThreshold: 100, issues: [] },
      releaseStrategy: { type: 'wide', premiereDate: new Date(2024, 0, 1), rolloutPlan: [], specialEvents: [], pressStrategy: { reviewScreenings: 0, pressJunkets: 0, interviews: 0, expectedCriticalReception: 0 } } as any,
      releaseWeek: 10,
      releaseYear: 2024,
    };

    const state0 = makeBaseState({
      projects: [project],
      allReleases: [project],
    });

    const week0 = advanceWeek(state0, createRng(1), [BoxOfficeSystem]).nextState;
    const opening = week0.projects[0].metrics?.boxOfficeTotal || 0;

    const week1 = advanceWeek(week0, createRng(1), [BoxOfficeSystem]).nextState;

    const after = week1.projects[0].metrics?.boxOfficeTotal || 0;
    expect(after).toBeGreaterThan(opening);

    expect(week1.boxOfficeHistory.some((w) => w.week === 10 && w.year === 2024)).toBe(true);
    expect(week1.boxOfficeHistory.some((w) => w.week === 11 && w.year === 2024)).toBe(true);

    const entry = week1.boxOfficeHistory.find((w) => w.week === 11 && w.year === 2024)!;
    const rel = entry.releases.find((r) => r.projectId === 'p2')!;
    expect(rel.weekInRelease).toBe(2);
    expect(rel.totalRevenue).toBe(after);
  });

  it('backfills the opening-week BoxOfficeWeek when a project was released outside the engine tick', () => {
    const project: Project = {
      id: 'p3',
      title: 'Legacy Release',
      script: { id: 's3', title: 'Legacy Release', genre: 'drama', logline: '', writer: 'x', pages: 100, quality: 50, budget: 10_000_000, developmentStage: 'final', themes: [], targetAudience: 'general', estimatedRuntime: 100, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 5, cgiIntensity: 'minimal' } },
      type: 'feature',
      currentPhase: 'distribution' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'released',
      metrics: { boxOfficeTotal: 2_000_000, weeksSinceRelease: 0, lastWeeklyRevenue: 2_000_000 },
      phaseDuration: 0,
      contractedTalent: [],
      developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 100, locationSecured: 100, completionThreshold: 100, issues: [] },
      releaseStrategy: { type: 'wide', premiereDate: new Date(2024, 0, 1), rolloutPlan: [], specialEvents: [], pressStrategy: { reviewScreenings: 0, pressJunkets: 0, interviews: 0, expectedCriticalReception: 0 } } as any,
      releaseWeek: 10,
      releaseYear: 2024,
    };

    const state = makeBaseState({
      currentWeek: 10,
      projects: [project],
      allReleases: [project],
      boxOfficeHistory: [],
    });

    const result = advanceWeek(state, createRng(1), [BoxOfficeSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(11);

    expect(next.boxOfficeHistory.some((w) => w.week === 10 && w.year === 2024)).toBe(true);
    expect(next.boxOfficeHistory.some((w) => w.week === 11 && w.year === 2024)).toBe(true);

    const openingWeek = next.boxOfficeHistory.find((w) => w.week === 10 && w.year === 2024)!;
    const openingRel = openingWeek.releases.find((r) => r.projectId === 'p3')!;
    expect(openingRel.weekInRelease).toBe(1);
    expect(openingRel.weeklyRevenue).toBeGreaterThan(0);
  });

  it('does not change existing totals when a save is missing weeksSinceRelease but already has a boxOfficeTotal', () => {
    const project: Project = {
      id: 'p4',
      title: 'Legacy Release 2',
      script: { id: 's4', title: 'Legacy Release 2', genre: 'drama', logline: '', writer: 'x', pages: 100, quality: 50, budget: 10_000_000, developmentStage: 'final', themes: [], targetAudience: 'general', estimatedRuntime: 100, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 5, cgiIntensity: 'minimal' } },
      type: 'feature',
      currentPhase: 'distribution' as any,
      budget: { total: 10_000_000 } as any,
      cast: [],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      status: 'released',
      metrics: { boxOfficeTotal: 1_000_000 },
      phaseDuration: 0,
      contractedTalent: [],
      developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 100, locationSecured: 100, completionThreshold: 100, issues: [] },
      releaseStrategy: { type: 'wide', premiereDate: new Date(2024, 0, 1), rolloutPlan: [], specialEvents: [], pressStrategy: { reviewScreenings: 0, pressJunkets: 0, interviews: 0, expectedCriticalReception: 0 } } as any,
      releaseWeek: 8,
      releaseYear: 2024,
    };

    const state = makeBaseState({
      currentWeek: 10,
      projects: [project],
      allReleases: [project],
    });

    const result = advanceWeek(state, createRng(1), [BoxOfficeSystem]);
    const next = result.nextState;

    expect(next.currentWeek).toBe(11);
    expect(next.projects[0].metrics?.boxOfficeTotal).toBe(1_000_000);
    expect(next.projects[0].metrics?.weeksSinceRelease).toBe(3);
  });
});
