import { describe, expect, it } from 'vitest';
import type { GameState, Project, Script } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { WorldErasSystem } from '@/game/systems/worldErasSystem';

function makeProject(params: { id: string; title: string; year: number; genre: Script['genre'] }): Project {
  const script: Script = {
    id: `s:${params.id}`,
    title: params.title,
    genre: params.genre,
    logline: 'x',
    writer: 'x',
    pages: 100,
    quality: 60,
    budget: 1_000_000,
    developmentStage: 'final',
    themes: [],
    targetAudience: 'general',
    estimatedRuntime: 120,
    characteristics: {
      tone: 'balanced',
      pacing: 'steady',
      dialogue: 'naturalistic',
      visualStyle: 'realistic',
      commercialAppeal: 5,
      criticalPotential: 5,
      cgiIntensity: 'minimal',
    },
    characters: [],
  };

  return {
    id: params.id,
    title: params.title,
    script,
    type: 'feature',
    currentPhase: 'release',
    budget: {
      total: 1_000_000,
      allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
      spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
      overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
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
    distributionStrategy: {
      primary: { platform: 'Theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } },
      international: [],
      windows: [],
      marketingBudget: 0,
    },
    status: 'released',
    metrics: { critical: { criticsConsensus: '' } },
    phaseDuration: 0,
    contractedTalent: [],
    developmentProgress: { scriptCompletion: 0, budgetApproval: 0, talentAttached: 0, locationSecured: 0, completionThreshold: 0, issues: [] },
    releaseYear: params.year,
    releaseWeek: 10,
  } as any;
}

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
    currentYear: 2030,
    currentWeek: 1,
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
    boxOfficeHistory: [
      {
        week: 1,
        year: 2024,
        releases: [{ projectId: 'p1', title: 'Decade Hit', studio: 'Test Studio', weeklyRevenue: 1, totalRevenue: 999, theaters: 1, weekInRelease: 1 }],
        totalRevenue: 0,
      },
    ],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [makeProject({ id: 'p1', title: 'Decade Hit', year: 2024, genre: 'drama' })],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
    universeSeed: 321,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('WorldErasSystem', () => {
  it('stamps a decade era entry at decade boundaries', () => {
    const state = makeBaseState();

    const recap: any[] = [];
    const next = WorldErasSystem.onTick(state, {
      rng: createRng(1),
      week: 1,
      year: 2030,
      quarter: 1,
      recap,
      debug: false,
    });

    expect((next.worldHistory || []).some((e) => e.id === 'hist:industry_era:2020:2029' && e.kind === 'industry_era')).toBe(true);
  });
});
