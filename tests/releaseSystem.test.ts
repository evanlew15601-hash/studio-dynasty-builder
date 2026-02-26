import { describe, expect, it } from 'vitest';
import type { Project, Script } from '@/types/game';
import { ReleaseSystem } from '@/components/game/ReleaseSystem';

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
    characters: [],
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

describe('ReleaseSystem.validateFilmForRelease - excluded roles', () => {
  it('ignores excluded roles for cast requirements', () => {
    const project = makeProject({
      script: makeScript({
        characters: [
          { id: 'd1', name: 'Director', importance: 'crew', requiredType: 'director', assignedTalentId: 't1', excluded: true },
          { id: 'l1', name: 'Lead', importance: 'lead', requiredType: 'actor', assignedTalentId: 't2', excluded: true },
        ],
      }),
    });

    const res = ReleaseSystem.validateFilmForRelease(project);
    expect(res.canRelease).toBe(false);
    expect(res.errors.join(' | ')).toMatch(/cast member/i);
  });

  it('allows release when required active roles are cast (even if other excluded roles exist)', () => {
    const project = makeProject({
      script: makeScript({
        characters: [
          { id: 'd1', name: 'Director', importance: 'crew', requiredType: 'director', assignedTalentId: 't1' },
          { id: 'l1', name: 'Lead', importance: 'lead', requiredType: 'actor', assignedTalentId: 't2' },
          { id: 'x1', name: 'Cut Character', importance: 'supporting', requiredType: 'actor', assignedTalentId: 't3', excluded: true },
        ],
      }),
    });

    const res = ReleaseSystem.validateFilmForRelease(project);
    expect(res.canRelease).toBe(true);
  });

  it('falls back to legacy project.cast when script characters are absent (back-compat)', () => {
    const project = makeProject({
      script: makeScript({
        characters: [],
      }),
      cast: [
        {
          talentId: 't1',
          role: 'Director',
          salary: 0,
          contractTerms: { duration: new Date(), exclusivity: false, merchandising: false, sequelOptions: 0 },
        },
        {
          talentId: 't2',
          role: 'Lead - Hero',
          salary: 0,
          contractTerms: { duration: new Date(), exclusivity: false, merchandising: false, sequelOptions: 0 },
        },
      ] as any,
    });

    const res = ReleaseSystem.validateFilmForRelease(project);
    expect(res.canRelease).toBe(true);
  });

  it('falls back to legacy project.cast when script characters are all excluded (treated as non-participating)', () => {
    const project = makeProject({
      script: makeScript({
        characters: [
          { id: 'd1', name: 'Director', importance: 'crew', requiredType: 'director', excluded: true },
          { id: 'l1', name: 'Lead', importance: 'lead', requiredType: 'actor', excluded: true },
        ],
      }),
      cast: [
        {
          talentId: 't1',
          role: 'Director',
          salary: 0,
          contractTerms: { duration: new Date(), exclusivity: false, merchandising: false, sequelOptions: 0 },
        },
        {
          talentId: 't2',
          role: 'Lead - Hero',
          salary: 0,
          contractTerms: { duration: new Date(), exclusivity: false, merchandising: false, sequelOptions: 0 },
        },
      ] as any,
    });

    const res = ReleaseSystem.validateFilmForRelease(project);
    expect(res.canRelease).toBe(true);
  });
});
