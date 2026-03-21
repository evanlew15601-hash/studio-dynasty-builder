import { describe, expect, it } from 'vitest';
import { ReleaseSystem } from '@/components/game/ReleaseSystem';

function makeFilm(overrides: any = {}): any {
  return {
    id: 'p1',
    title: 'Film',
    type: 'feature',
    status: 'completed',
    currentPhase: 'marketing',
    script: {
      id: 's1',
      title: 'Film',
      genre: 'drama',
      logline: 'x',
      writer: 'x',
      pages: 110,
      quality: 70,
      budget: 10_000_000,
      developmentStage: 'final',
      themes: [],
      targetAudience: 'general',
      estimatedRuntime: 120,
      characteristics: {
        tone: 'balanced',
        pacing: 'steady',
        dialogue: 'naturalistic',
        visualStyle: 'realistic',
        commercialAppeal: 6,
        criticalPotential: 6,
        cgiIntensity: 'minimal',
      },
      characters: [],
    },
    budget: { total: 10_000_000 },
    cast: [],
    crew: [],
    locations: [],
    timeline: {} as any,
    distributionStrategy: {} as any,
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
    ...overrides,
  };
}

describe('ReleaseSystem.validateFilmForRelease', () => {
  it('accepts legacy projects where the director is stored in crew rather than cast', () => {
    const project = makeFilm({
      cast: [{ talentId: 't-lead', role: 'Lead Actor', salary: 1 }],
      crew: [{ talentId: 't-dir', role: 'Director', salary: 1 }],
    });

    const result = ReleaseSystem.validateFilmForRelease(project);

    expect(result.canRelease).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
