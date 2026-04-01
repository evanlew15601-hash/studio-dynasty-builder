import { beforeEach, describe, expect, it } from 'vitest';
import { BoxOfficeSystem } from '@/components/game/BoxOfficeSystem';
import { TVRatingsSystem } from '@/components/game/TVRatingsSystem';
import { FinancialEngine } from '@/components/game/FinancialEngine';
import type { Project } from '@/types/game';

function makeBaseFilm(overrides: Partial<Project> = {}): Project {
  return {
    id: 'film-1',
    title: 'Test Film',
    type: 'feature',
    status: 'completed' as any,
    currentPhase: 'release' as any,
    budget: {
      total: 20_000_000,
      allocated: {
        aboveTheLine: 0,
        belowTheLine: 0,
        postProduction: 0,
        marketing: 0,
        distribution: 0,
        contingency: 0,
      },
      spent: {
        aboveTheLine: 0,
        belowTheLine: 0,
        postProduction: 0,
        marketing: 0,
        distribution: 0,
        contingency: 0,
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
    script: {
      id: 's1',
      title: 'Test Film',
      genre: 'drama' as any,
      logline: '',
      writer: '',
      pages: 110,
      quality: 70,
      budget: 20_000_000,
      developmentStage: 'final' as any,
      themes: [],
      targetAudience: 'general' as any,
      estimatedRuntime: 110,
      characteristics: {
        tone: 'balanced' as any,
        pacing: 'steady' as any,
        dialogue: 'naturalistic' as any,
        visualStyle: 'realistic' as any,
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal' as any,
      },
      characters: [],
    } as any,
    ...overrides,
  } as Project;
}

function makeBaseTv(overrides: Partial<Project> = {}): Project {
  return {
    id: 'tv-1',
    title: 'Test Show',
    type: 'series',
    status: 'completed' as any,
    currentPhase: 'release' as any,
    budget: {
      total: 10_000_000,
      allocated: {
        aboveTheLine: 0,
        belowTheLine: 0,
        postProduction: 0,
        marketing: 0,
        distribution: 0,
        contingency: 0,
      },
      spent: {
        aboveTheLine: 0,
        belowTheLine: 0,
        postProduction: 0,
        marketing: 0,
        distribution: 0,
        contingency: 0,
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
    script: {
      id: 's1',
      title: 'Test Show',
      genre: 'drama' as any,
      logline: '',
      writer: '',
      pages: 1,
      quality: 60,
      budget: 10_000_000,
      developmentStage: 'final' as any,
      themes: [],
      targetAudience: 'general' as any,
      estimatedRuntime: 45,
      characteristics: {
        tone: 'balanced' as any,
        pacing: 'steady' as any,
        dialogue: 'naturalistic' as any,
        visualStyle: 'realistic' as any,
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal' as any,
      },
      characters: [],
    } as any,
    ...overrides,
  } as Project;
}

beforeEach(() => {
  FinancialEngine.clearAll();
});

describe('Player release determinism + guardrails', () => {
  it('BoxOfficeSystem.initializeRelease does not overwrite existing scores', () => {
    const project = makeBaseFilm({
      metrics: { criticsScore: 88, audienceScore: 77 } as any,
    });

    const released = BoxOfficeSystem.initializeRelease(project, 10, 2026);
    expect(released.metrics?.criticsScore).toBe(88);
    expect(released.metrics?.audienceScore).toBe(77);
  });

  it('BoxOfficeSystem.initializeRelease produces deterministic scores when missing', () => {
    const project = makeBaseFilm({ metrics: {} as any });

    const a = BoxOfficeSystem.initializeRelease(project, 10, 2026);
    FinancialEngine.clearAll();
    const b = BoxOfficeSystem.initializeRelease(project, 10, 2026);

    expect(a.metrics?.criticsScore).toBe(b.metrics?.criticsScore);
    expect(a.metrics?.audienceScore).toBe(b.metrics?.audienceScore);
  });

  it('TVRatingsSystem.initializeAiring produces deterministic scores when missing', () => {
    const project = makeBaseTv({ metrics: {} as any });

    const a = TVRatingsSystem.initializeAiring(project, 10, 2026);
    const b = TVRatingsSystem.initializeAiring(project, 10, 2026);

    expect(a.metrics?.criticsScore).toBe(b.metrics?.criticsScore);
    expect(a.metrics?.audienceScore).toBe(b.metrics?.audienceScore);
    expect(a.metrics?.streaming?.viewsFirstWeek).toBe(b.metrics?.streaming?.viewsFirstWeek);
  });
});
