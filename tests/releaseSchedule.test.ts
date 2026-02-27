import { describe, it, expect, beforeEach } from 'vitest';
import type { Project, Script } from '@/types/game';
import { ReleaseSystem } from '@/components/game/ReleaseSystem';
import { CalendarManager } from '@/components/game/CalendarManager';

function makeScript(overrides: Partial<Script> = {}): Script {
  return {
    id: 's1',
    title: 'Test Film',
    genre: 'action',
    logline: 'A test film',
    writer: 'Writer',
    pages: 110,
    quality: 75,
    budget: 50_000_000,
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
    characters: [
      { id: 'd1', name: 'Director', importance: 'crew', requiredType: 'director', assignedTalentId: 't1' },
      { id: 'l1', name: 'Lead', importance: 'lead', requiredType: 'actor', assignedTalentId: 't2' },
    ] as any,
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  const base: Project = {
    id: 'p1',
    title: 'Test Film',
    type: 'feature',
    currentPhase: 'marketing',
    status: 'completed',
    phaseDuration: 0,
    script: makeScript(),
    budget: {
      total: 100_000_000,
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
      primary: { platform: 'theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 0.5 } },
      international: [],
      windows: [],
      marketingBudget: 30_000_000,
    },
    metrics: {},
    contractedTalent: [],
    developmentProgress: {
      currentStage: 'concept',
      stagesCompleted: [],
      overallProgress: 0,
      currentQuality: 0,
      qualityHistory: [],
      lastUpdateWeek: 1,
      lastUpdateYear: 2020,
    } as any,
  };

  return {
    ...base,
    ...overrides,
    script: overrides.script ?? base.script,
  };
}

describe('ReleaseSystem.scheduleRelease', () => {
  beforeEach(() => {
    CalendarManager.clearAllEvents();
  });

  it('rejects scheduling a release in the past', () => {
    const project = makeProject();
    const currentTime = { currentWeek: 10, currentYear: 2026, currentQuarter: 1 };

    const res = ReleaseSystem.scheduleRelease(project, 9, 2026, currentTime);
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/future/i);
  });

  it('rejects scheduling a release with insufficient lead time', () => {
    const project = makeProject();
    const currentTime = { currentWeek: 10, currentYear: 2026, currentQuarter: 1 };

    const res = ReleaseSystem.scheduleRelease(project, 12, 2026, currentTime);
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/4 weeks/i);
  });

  it('succeeds scheduling a valid future release', () => {
    const project = makeProject();
    const currentTime = { currentWeek: 10, currentYear: 2026, currentQuarter: 1 };

    const res = ReleaseSystem.scheduleRelease(project, 20, 2026, currentTime);
    expect(res.success).toBe(true);
    expect(res.releaseWeek).toBe(20);
    expect(res.releaseYear).toBe(2026);
  });
});
