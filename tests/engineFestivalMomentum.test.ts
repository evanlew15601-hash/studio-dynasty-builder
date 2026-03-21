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

function makeFestivalProject(params: {
  id: string;
  critics: number;
  audience: number;
}): Project {
  return {
    id: params.id,
    title: 'Festival Film',
    script: {
      id: `s-${params.id}`,
      title: 'Festival Film',
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
    } as any,
    type: 'feature',
    currentPhase: 'release' as any,
    budget: { total: 10_000_000 } as any,
    cast: [],
    crew: [],
    timeline: {} as any,
    locations: [],
    distributionStrategy: {} as any,
    status: 'released',
    metrics: { criticsScore: params.critics, audienceScore: params.audience },
    phaseDuration: 0,
    contractedTalent: [],
    developmentProgress: {
      scriptCompletion: 100,
      budgetApproval: 100,
      talentAttached: 100,
      locationSecured: 100,
      completionThreshold: 100,
      issues: [],
    } as any,
    releaseStrategy: {
      type: 'festival',
      premiereDate: new Date(Date.UTC(2024, 0, 1)),
      rolloutPlan: [],
      specialEvents: [],
      pressStrategy: { reviewScreenings: 0, pressJunkets: 0, interviews: 0, expectedCriticalReception: 0 },
    } as any,
    releaseWeek: 10,
    releaseYear: 2024,
  } as any;
}

describe('Festival momentum (engine)', () => {
  it('ends weak festival runs earlier (≈6 weeks)', () => {
    const project = makeFestivalProject({ id: 'fest-weak', critics: 50, audience: 50 });

    let state = makeBaseState({
      projects: [project],
      allReleases: [project],
    });

    // Advance to Y2024W16 (release at W10; week index 6).
    for (let i = 0; i < 7; i++) {
      state = advanceWeek(state, createRng(1), [BoxOfficeSystem]).nextState;
    }

    expect(state.currentWeek).toBe(16);
    const updated = state.projects[0];
    expect(updated.metrics?.theatricalRunLocked).toBe(true);
    expect(updated.metrics?.inTheaters).toBe(false);
    expect(String(updated.metrics?.boxOfficeStatus || '')).toMatch(/festival run ended|ended/i);
  });

  it('lets strong festival runs play longer before ending (≈10 weeks)', () => {
    const project = makeFestivalProject({ id: 'fest-strong', critics: 90, audience: 85 });

    let state = makeBaseState({
      projects: [project],
      allReleases: [project],
    });

    // Advance to Y2024W19 (release at W10; week index 9). Should still be in theaters.
    for (let i = 0; i < 10; i++) {
      state = advanceWeek(state, createRng(1), [BoxOfficeSystem]).nextState;
    }

    expect(state.currentWeek).toBe(19);
    expect(state.projects[0].metrics?.inTheaters).toBe(true);
    expect(state.projects[0].metrics?.theatricalRunLocked).toBe(false);

    // One more week: Y2024W20 (week index 10) should end.
    state = advanceWeek(state, createRng(1), [BoxOfficeSystem]).nextState;
    expect(state.currentWeek).toBe(20);
    expect(state.projects[0].metrics?.theatricalRunLocked).toBe(true);
    expect(state.projects[0].metrics?.inTheaters).toBe(false);
  });
});
