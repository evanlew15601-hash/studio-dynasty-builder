import { describe, expect, it } from 'vitest';
import type { GameState, Project, Script } from '@/types/game';
import { runLongTermSimulation } from '@/simulation/longTermRunner';

const makeBudget = (total: number) => ({
  total,
  allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
  spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
  overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
});

const makeScript = (id: string, title: string, genre: any, budget: number): Script => ({
  id,
  title,
  genre,
  logline: 'Test logline',
  writer: 'Test Writer',
  pages: 100,
  quality: 75,
  budget,
  developmentStage: 'final',
  themes: [],
  targetAudience: 'general',
  estimatedRuntime: 110,
  characteristics: {
    tone: 'balanced',
    pacing: 'steady',
    dialogue: 'naturalistic',
    visualStyle: 'realistic',
    commercialAppeal: 7,
    criticalPotential: 7,
    cgiIntensity: 'minimal',
  },
});

const makeReleasedFilm = (overrides: Partial<Project> = {}): Project => {
  const budget = overrides.budget?.total ?? 40_000_000;

  return {
    id: overrides.id ?? 'p1',
    title: overrides.title ?? 'Test Film',
    script: overrides.script ?? makeScript('s1', 'Test Film', 'action', budget),
    type: 'feature',
    currentPhase: 'release',
    budget: overrides.budget ?? makeBudget(budget),
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
    distributionStrategy: {
      primary: { platform: 'Theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 55 } },
      international: [],
      windows: [],
      marketingBudget: 10_000_000,
    },
    status: 'released',
    postTheatricalEligible: false,
    metrics: {
      inTheaters: true,
      boxOfficeTotal: 25_000_000,
      theaterCount: 3200,
      weeksSinceRelease: 0,
      criticsScore: 70,
      audienceScore: 75,
      boxOfficeStatus: 'Opening',
      theatricalRunLocked: false,
      lastWeeklyRevenue: 25_000_000,
    },
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
    ...overrides,
  };
};

describe('long-term simulation runner', () => {
  it('can advance years without producing NaNs or negative totals', () => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};

    try {
      const startYear = 2025;

      const initial: GameState = {
        studio: {
        id: 'player-studio',
        name: 'Test Studio',
        reputation: 50,
        budget: 10_000_000,
        founded: startYear,
        specialties: ['drama'],
        debt: 0,
        lastProjectWeek: 0,
        weeksSinceLastProject: 0,
      },
      currentYear: startYear,
      currentWeek: 1,
      currentQuarter: 1,
      projects: [
        makeReleasedFilm({
          id: 'released-1',
          releaseWeek: 1,
          releaseYear: startYear,
        }),
        makeReleasedFilm({
          id: 'scheduled-1',
          title: 'Scheduled Film',
          status: 'scheduled-for-release',
          metrics: {
            inTheaters: false,
            boxOfficeTotal: 0,
            theaterCount: 0,
            weeksSinceRelease: 0,
            criticsScore: 72,
            audienceScore: 74,
            boxOfficeStatus: 'Scheduled',
            theatricalRunLocked: false,
          },
          scheduledReleaseWeek: 10,
          scheduledReleaseYear: startYear,
          releaseWeek: 10,
          releaseYear: startYear,
        }),
      ],
      talent: [],
      scripts: [],
      competitorStudios: [],
      marketConditions: {
        trendingGenres: ['action', 'drama', 'comedy'],
        audiencePreferences: [],
        economicClimate: 'stable',
        technologicalAdvances: [],
        regulatoryChanges: [],
        seasonalTrends: [],
        competitorReleases: [],
        awardsSeasonActive: false,
      },
      eventQueue: [],
      boxOfficeHistory: [],
      awardsCalendar: [],
      industryTrends: [],
      allReleases: [],
      topFilmsHistory: [],
      franchises: [],
      publicDomainIPs: [],
      aiStudioProjects: [],
    };

    const { finalState, totalBoxOfficeGross, totalStudioRevenueShare } = runLongTermSimulation(initial, 52 * 10);

    expect(Number.isFinite(totalBoxOfficeGross)).toBe(true);
    expect(Number.isFinite(totalStudioRevenueShare)).toBe(true);
    expect(totalBoxOfficeGross).toBeGreaterThan(0);
    expect(totalStudioRevenueShare).toBeGreaterThan(0);

    const boxOfficeTotals = finalState.projects.map(p => p.metrics?.boxOfficeTotal ?? 0);
    for (const total of boxOfficeTotals) {
      expect(Number.isFinite(total)).toBe(true);
      expect(total).toBeGreaterThanOrEqual(0);
    }

    expect(finalState.studio.budget).toBeGreaterThan(0);
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    }
  });
});
