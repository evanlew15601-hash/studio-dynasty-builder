import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState, Project, Script, TalentPerson } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { PlayerCircleDramaSystem } from '@/game/systems/playerCircleDramaSystem';
import { useGameStore } from '@/game/store';

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
    currentWeek: 1,
    currentQuarter: 1,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios: [
      {
        id: 'studio-rival',
        name: 'Rival Studio',
        reputation: 55,
        budget: 5_000_000,
        founded: 1990,
        specialties: ['drama'],
        awards: [],
      },
    ],
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

  return { ...base, ...(overrides || {}) } as GameState;
}

function makeTalent(overrides: Partial<TalentPerson> & Pick<TalentPerson, 'id' | 'name'>): TalentPerson {
  return {
    id: overrides.id,
    name: overrides.name,
    type: 'actor',
    age: 30,
    experience: 10,
    reputation: 70,
    marketValue: 5_000_000,
    genres: ['drama'],
    contractStatus: 'available',
    availability: { start: new Date('2027-01-01T00:00:00.000Z'), end: new Date('2027-01-01T00:00:00.000Z') },
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> & Pick<Project, 'id' | 'title' | 'script'>): Project {
  return {
    id: overrides.id,
    title: overrides.title,
    script: overrides.script,
    type: 'feature',
    currentPhase: 'production',
    budget: {
      total: 10_000_000,
      allocated: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
      spent: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
      overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 },
    },
    cast: [],
    crew: [],
    timeline: {
      preProduction: { start: new Date('2027-01-01T00:00:00.000Z'), end: new Date('2027-01-01T00:00:00.000Z') },
      principalPhotography: { start: new Date('2027-01-01T00:00:00.000Z'), end: new Date('2027-01-01T00:00:00.000Z') },
      postProduction: { start: new Date('2027-01-01T00:00:00.000Z'), end: new Date('2027-01-01T00:00:00.000Z') },
      release: new Date('2027-01-01T00:00:00.000Z'),
      milestones: [],
    },
    locations: [],
    distributionStrategy: {
      primary: { platform: 'Theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } },
      international: [],
      windows: [],
      marketingBudget: 0,
    },
    status: 'production',
    metrics: {
      boxOffice: { openingWeekend: 0, domesticTotal: 0, internationalTotal: 0, production: 0, marketing: 0, profit: 0, theaters: 0, weeks: 0 },
      critical: { criticsConsensus: '' },
    },
    phaseDuration: 1,
    contractedTalent: [],
    developmentProgress: { scriptCompletion: 0, budgetApproval: 0, talentAttached: 0, locationSecured: 0, completionThreshold: 0, issues: [] },
    ...overrides,
  };
}

describe('PlayerCircleDramaSystem', () => {
  it('queues a poaching event when a contracted talent has very low loyalty', () => {
    const talent = makeTalent({
      id: 'talent-1',
      name: 'Low Loyalty Star',
      contractStatus: 'contracted',
      studioLoyalty: { 'studio-1': 10 },
    });

    const state = makeBaseState({ talent: [talent] });

    const next = PlayerCircleDramaSystem.onTick(state, {
      rng: createRng(123),
      week: 2,
      year: 2027,
      quarter: 1,
      recap: [],
      debug: false,
    });

    expect(next.eventQueue.length).toBe(1);
    expect((next.eventQueue[0] as any).data.kind).toBe('circle:poach');
  });

  it('prefers an on-set feud event when chemistry is very negative', () => {
    const a = makeTalent({
      id: 'talent-a',
      name: 'Actor A',
      contractStatus: 'contracted',
      chemistry: { 'talent-b': -80 },
      studioLoyalty: { 'studio-1': 70 },
    });

    const b = makeTalent({
      id: 'talent-b',
      name: 'Actor B',
      contractStatus: 'contracted',
      chemistry: { 'talent-a': -80 },
      studioLoyalty: { 'studio-1': 70 },
    });

    const script: Script = {
      id: 'script-1',
      title: 'Feud Project',
      genre: 'drama',
      logline: '...',
      writer: 'w',
      pages: 100,
      quality: 60,
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
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal',
      },
      characters: [],
    };

    const project = makeProject({
      id: 'project-1',
      title: 'Feud Project',
      script,
      cast: [
        { talentId: a.id, role: 'Lead', salary: 0, contractTerms: { duration: new Date(), exclusivity: true, merchandising: false, sequelOptions: 0 } },
        { talentId: b.id, role: 'Support', salary: 0, contractTerms: { duration: new Date(), exclusivity: true, merchandising: false, sequelOptions: 0 } },
      ],
    });

    const state = makeBaseState({ talent: [a, b], projects: [project] });

    const next = PlayerCircleDramaSystem.onTick(state, {
      rng: createRng(123),
      week: 2,
      year: 2027,
      quarter: 1,
      recap: [],
      debug: false,
    });

    expect(next.eventQueue.length).toBe(1);
    expect((next.eventQueue[0] as any).data.kind).toBe('circle:feud');
  });
});

describe('resolveGameEvent (store)', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 111 }), 123);
  });

  it('applies loyalty consequences and removes the event from the queue', () => {
    const event: GameEvent = {
      id: 'event-1',
      title: 'Test Event',
      description: '...',
      type: 'talent',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      choices: [
        {
          id: 'boost',
          text: 'Boost loyalty',
          consequences: [
            {
              type: 'talent-relationship',
              relationship: 'loyalty',
              target: { talentId: 'talent-1', studioId: 'studio-1' },
              impact: 10,
              description: 'Loyalty increases.'
            },
          ],
        },
      ],
    };

    useGameStore.getState().mergeGameState({
      talent: [makeTalent({ id: 'talent-1', name: 'T', contractStatus: 'contracted', studioLoyalty: { 'studio-1': 5 } })],
      eventQueue: [event],
    });

    useGameStore.getState().resolveGameEvent('event-1', 'boost');

    const state = useGameStore.getState().game!;
    expect(state.eventQueue.length).toBe(0);
    expect(state.talent[0].studioLoyalty?.['studio-1']).toBe(15);
  });

  it('supports PR-style choices via budget + reputation consequences', () => {
    const event: GameEvent = {
      id: 'event-pr',
      title: 'PR Test',
      description: '...',
      type: 'crisis',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      choices: [
        {
          id: 'pr-spin',
          text: 'Run damage control',
          consequences: [
            { type: 'budget', impact: -200_000, description: 'Pay for PR.' },
            { type: 'reputation', impact: 2, description: 'Reputation recovers.' },
          ],
        },
      ],
    };

    useGameStore.getState().mergeGameState({
      eventQueue: [event],
      studio: { ...useGameStore.getState().game!.studio, budget: 1_000_000, reputation: 50 },
    });

    useGameStore.getState().resolveGameEvent('event-pr', 'pr-spin');

    const state = useGameStore.getState().game!;
    expect(state.eventQueue.length).toBe(0);
    expect(state.studio.budget).toBe(800_000);
    expect(state.studio.reputation).toBe(52);
  });

  it('handles replace-b for circle:feud by removing the talent from the project', () => {
    const projectId = 'project-x';

    const project = makeProject({
      id: projectId,
      title: 'X',
      script: {
        id: 'script-x',
        title: 'X',
        genre: 'drama',
        logline: 'x',
        writer: 'x',
        pages: 100,
        quality: 60,
        budget: 10,
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
        characters: [{ id: 'c', name: 'c', importance: 'lead', assignedTalentId: 'talent-b' }],
      },
      cast: [
        { talentId: 'talent-a', role: 'A', salary: 0, contractTerms: { duration: new Date(), exclusivity: true, merchandising: false, sequelOptions: 0 } },
        { talentId: 'talent-b', role: 'B', salary: 0, contractTerms: { duration: new Date(), exclusivity: true, merchandising: false, sequelOptions: 0 } },
      ],
      contractedTalent: [
        { talentId: 'talent-b', role: 'B', weeklyPay: 0, contractWeeks: 10, weeksRemaining: 10, startWeek: 1 },
      ],
    });

    const event: GameEvent = {
      id: 'event-feud',
      title: 'Feud',
      description: '...',
      type: 'crisis',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: { kind: 'circle:feud', projectId, talentBId: 'talent-b' },
      choices: [
        {
          id: 'replace-b',
          text: 'Replace B',
          consequences: [],
        },
      ],
    };

    useGameStore.getState().mergeGameState({
      projects: [project],
      talent: [
        makeTalent({ id: 'talent-a', name: 'A', contractStatus: 'contracted' }),
        makeTalent({ id: 'talent-b', name: 'B', contractStatus: 'contracted' }),
      ],
      eventQueue: [event],
    });

    useGameStore.getState().resolveGameEvent('event-feud', 'replace-b');

    const state = useGameStore.getState().game!;
    expect(state.eventQueue.length).toBe(0);

    const updatedProject = state.projects[0];
    expect(updatedProject.cast.some((r) => r.talentId === 'talent-b')).toBe(false);
    expect(updatedProject.contractedTalent.some((r) => r.talentId === 'talent-b')).toBe(false);
    expect(updatedProject.script.characters?.[0].assignedTalentId).toBe(undefined);

    const removed = state.talent.find((t) => t.id === 'talent-b')!;
    expect(removed.contractStatus).toBe('available');
  });
});
