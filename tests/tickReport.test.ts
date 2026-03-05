import { describe, expect, it } from 'vitest';
import type { GameState, Project, StudioAward } from '@/types/game';
import type { TickSystemReport } from '@/types/tickReport';
import { createTickReport } from '@/utils/tickReport';

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
    currentYear: 2027,
    currentWeek: 10,
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
  };

  return { ...base, ...(overrides || {}) };
}

function makeReleasedProject(id: string, title: string, week: number, year: number): Project {
  return {
    id,
    title,
    type: 'feature',
    currentPhase: 'release' as any,
    status: 'released' as any,
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
    script: {
      id: `script-${id}`,
      title,
      genre: 'drama',
      logline: 'test',
      writer: 'test',
      pages: 100,
      quality: 80,
      budget: 10_000_000,
      developmentStage: 'final' as any,
      themes: [],
      targetAudience: 'general' as any,
      estimatedRuntime: 120,
      characteristics: {
        tone: 'balanced' as any,
        pacing: 'steady' as any,
        dialogue: 'naturalistic' as any,
        visualStyle: 'realistic' as any,
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal' as any,
      },
    },
    budget: {
      total: 10_000_000,
      allocated: {
        aboveTheLine: 1,
        belowTheLine: 1,
        postProduction: 1,
        marketing: 1,
        distribution: 1,
        contingency: 1,
      },
      spent: {
        aboveTheLine: 1,
        belowTheLine: 1,
        postProduction: 1,
        marketing: 1,
        distribution: 1,
        contingency: 1,
      },
      overages: {
        aboveTheLine: 0,
        belowTheLine: 0,
        postProduction: 0,
        marketing: 0,
        distribution: 0,
        contingency: 0,
      },
    },
    cast: [],
    crew: [],
    timeline: {
      preProduction: { start: new Date(), end: new Date() },
      principalPhotography: { start: new Date(), end: new Date() },
      postProduction: { start: new Date(), end: new Date() },
      release: new Date(),
      milestones: [],
    },
    locations: [],
    distributionStrategy: null,
    marketingCampaign: null,
    weeksInPhase: 0,
    readyForRelease: false,
    releaseWeek: week,
    releaseYear: year,
    metrics: {
      inTheaters: false,
      boxOfficeTotal: 0,
      theaterCount: 0,
      weeksSinceRelease: 0,
      criticsScore: 70,
      audienceScore: 70,
      boxOfficeStatus: 'Ended',
      theatricalRunLocked: true,
    },
  } as any;
}

describe('createTickReport', () => {
  it('computes summary deltas and carries system timings through', () => {
    const prev = makeBaseState();
    const next = makeBaseState({
      currentWeek: 11,
      studio: {
        ...prev.studio,
        budget: prev.studio.budget + 250_000,
        reputation: prev.studio.reputation - 2,
      },
    });

    const systems: TickSystemReport[] = [
      { id: 'time', label: 'Advance time', ms: 1.2 },
      { id: 'ai', label: 'AI studios', ms: 5.6 },
    ];

    const report = createTickReport({
      prev,
      next,
      systems,
      recap: [],
      startedAtIso: '2027-01-01T00:00:00.000Z',
      finishedAtIso: '2027-01-01T00:00:00.100Z',
      totalMs: 100,
    });

    expect(report.week).toBe(11);
    expect(report.year).toBe(2027);
    expect(report.summary?.budgetDelta).toBe(250_000);
    expect(report.summary?.reputationDelta).toBe(-2);
    expect(report.systems).toHaveLength(2);
    expect(report.recap[0]?.title).toBeTruthy();
  });

  it('counts newly released player projects', () => {
    const p0 = { ...makeReleasedProject('p0', 'Already Out', 1, 2027) };
    const p1Prev: Project = { ...makeReleasedProject('p1', 'Not Released Yet', 1, 2027), status: 'marketing' as any };
    const p1Next: Project = { ...makeReleasedProject('p1', 'Not Released Yet', 11, 2027), status: 'released' as any };

    const prev = makeBaseState({ projects: [p0, p1Prev] });
    const next = makeBaseState({ currentWeek: 11, projects: [p0, p1Next] });

    const report = createTickReport({
      prev,
      next,
      systems: [],
      recap: [],
      startedAtIso: 's',
      finishedAtIso: 'f',
      totalMs: 1,
    });

    expect(report.summary?.newReleases).toBe(1);
  });

  it('counts awards won based on studio award list growth', () => {
    const prev = makeBaseState({
      studio: { ...makeBaseState().studio, awards: [] },
    });

    const award: StudioAward = {
      id: 'a1',
      projectId: 'p1',
      category: 'Best Picture',
      ceremony: 'Crown',
      year: 2027,
      prestige: 10,
      reputationBoost: 1,
      revenueBoost: 0,
    };

    const next = makeBaseState({
      currentWeek: 11,
      studio: { ...prev.studio, awards: [award] },
    });

    const report = createTickReport({
      prev,
      next,
      systems: [],
      recap: [],
      startedAtIso: 's',
      finishedAtIso: 'f',
      totalMs: 1,
    });

    expect(report.summary?.awardsWon).toBe(1);
  });
});
