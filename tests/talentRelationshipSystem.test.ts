import { describe, expect, it } from 'vitest';
import type { GameState, Project, TalentPerson } from '@/types/game';
import { TalentRelationshipSystem } from '@/game/systems/talentRelationshipSystem';
import { createRng } from '@/game/core/rng';
import type { TickContext } from '@/game/core/types';

function makeMinimalState(overrides?: Partial<GameState>): GameState {
  return {
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
    ...(overrides || {}),
  } as GameState;
}

function makeCtx(): TickContext {
  return {
    rng: createRng(123),
    week: 11,
    year: 2027,
    quarter: 1,
    recap: [],
    debug: false,
  };
}

function makeProductionProject(lead1Id: string, lead2Id: string): Project {
  return {
    id: 'proj-1',
    title: 'The Set',
    type: 'feature',
    status: 'production' as any,
    currentPhase: 'production' as any,
    phaseDuration: 10,
    script: {
      id: 's1',
      title: 'The Set',
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
      characters: [
        { id: 'c1', name: 'Lead One', importance: 'lead', assignedTalentId: lead1Id },
        { id: 'c2', name: 'Lead Two', importance: 'lead', assignedTalentId: lead2Id },
      ],
    } as any,
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
    } as any,
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
    distributionStrategy: null as any,
    metrics: {} as any,
    contractedTalent: [],
    developmentProgress: {
      scriptCompletion: 100,
      budgetApproval: 100,
      talentAttached: 100,
      locationSecured: 100,
      completionThreshold: 80,
      issues: [],
    },
  } as Project;
}

describe('TalentRelationshipSystem', () => {
  it('builds chemistry over repeated collaboration and can upgrade professional -> friendly', () => {
    const a: TalentPerson = {
      id: 'a',
      name: 'Actor A',
      type: 'actor',
      age: 30,
      experience: 8,
      reputation: 50,
      marketValue: 1_000_000,
      contractStatus: 'available',
      genres: ['drama'],
      availability: { start: new Date(), end: new Date() },
      chemistry: {},
      relationships: { b: 'professional' },
    } as any;

    const b: TalentPerson = {
      id: 'b',
      name: 'Actor B',
      type: 'actor',
      age: 30,
      experience: 8,
      reputation: 50,
      marketValue: 1_000_000,
      contractStatus: 'available',
      genres: ['drama'],
      availability: { start: new Date(), end: new Date() },
      chemistry: {},
      relationships: { a: 'professional' },
    } as any;

    let state = makeMinimalState({
      talent: [a, b],
      projects: [makeProductionProject('a', 'b')],
    });

    const ctx = makeCtx();
    for (let i = 0; i < 30; i++) {
      state = TalentRelationshipSystem.onTick(state, ctx);
    }

    const aAfter = state.talent.find(t => t.id === 'a')!;
    const bAfter = state.talent.find(t => t.id === 'b')!;

    expect(aAfter.chemistry?.b).toBeGreaterThanOrEqual(55);
    expect(aAfter.relationships?.b).toBe('friendly');
    expect(bAfter.relationships?.a).toBe('friendly');
    expect(typeof aAfter.relationshipNotes?.b).toBe('string');
  });

  it('can escalate into rivals for low compatibility pairs', () => {
    const a: TalentPerson = {
      id: 'a',
      name: 'Actor A',
      type: 'actor',
      age: 22,
      experience: 1,
      reputation: 40,
      marketValue: 400_000,
      contractStatus: 'available',
      genres: ['comedy'],
      availability: { start: new Date(), end: new Date() },
      chemistry: {},
      relationships: { b: 'professional' },
    } as any;

    const b: TalentPerson = {
      id: 'b',
      name: 'Actor B',
      type: 'actor',
      age: 58,
      experience: 25,
      reputation: 70,
      marketValue: 5_000_000,
      contractStatus: 'available',
      genres: ['war'],
      availability: { start: new Date(), end: new Date() },
      chemistry: {},
      relationships: { a: 'professional' },
    } as any;

    let state = makeMinimalState({
      talent: [a, b],
      projects: [makeProductionProject('a', 'b')],
    });

    const ctx = makeCtx();
    for (let i = 0; i < 25; i++) {
      state = TalentRelationshipSystem.onTick(state, ctx);
    }

    const aAfter = state.talent.find(t => t.id === 'a')!;
    const bAfter = state.talent.find(t => t.id === 'b')!;

    expect(aAfter.chemistry?.b).toBeLessThanOrEqual(-45);
    expect(aAfter.relationships?.b).toBe('rivals');
    expect(bAfter.relationships?.a).toBe('rivals');
  });
});
