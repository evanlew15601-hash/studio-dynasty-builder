import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState, Project, Script, TalentPerson } from '@/types/game';
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
      debt: 0,
    },
    currentYear: 2027,
    currentWeek: 10,
    currentQuarter: 2,
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
    universeSeed: 777,
    rngState: 777 as any,
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('PlayerCircleDrama: poach resolution', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState(), 123);
  });

  it('let-walk removes poached talent from projects and clears contracted state', () => {
    const talent: TalentPerson = {
      id: 'talent-1',
      name: 'Low Loyalty Star',
      type: 'actor',
      age: 30,
      experience: 10,
      reputation: 70,
      marketValue: 5_000_000,
      genres: ['drama'],
      contractStatus: 'contracted',
      currentContractWeeks: 12,
      studioLoyalty: { 'studio-1': 10 },
      availability: { start: new Date('2027-01-01T00:00:00.000Z'), end: new Date('2027-01-01T00:00:00.000Z') },
    };

    const script: Script = {
      id: 'script-1',
      title: 'Test Project',
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
      characters: [{ id: 'role-1', name: 'Lead', importance: 'lead', assignedTalentId: talent.id } as any],
    };

    const project: Project = {
      id: 'project-1',
      title: 'Test Project',
      script,
      type: 'feature',
      currentPhase: 'production',
      status: 'production',
      budget: { total: 10_000_000 } as any,
      cast: [{ talentId: talent.id, role: 'Lead', salary: 0, contractTerms: { duration: new Date(), exclusivity: true, merchandising: false, sequelOptions: 0 } }],
      crew: [],
      timeline: {} as any,
      locations: [],
      distributionStrategy: {} as any,
      metrics: {} as any,
      phaseDuration: 1,
      contractedTalent: [{ talentId: talent.id, role: 'Lead', weeklyPay: 100_000, contractWeeks: 12, weeksRemaining: 12, startWeek: 10 } as any],
      developmentProgress: {} as any,
    } as any;

    const evt: GameEvent = {
      id: 'evt:circle:poach',
      title: 'Poach',
      description: 'Poach',
      type: 'talent',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: { kind: 'circle:poach', talentId: talent.id } as any,
      choices: [
        { id: 'let-walk', text: 'Let them walk', consequences: [] },
        { id: 'pr-spin', text: 'PR spin', consequences: [] },
      ],
    } as any;

    useGameStore.getState().initGame(
      makeBaseState({
        talent: [talent],
        projects: [project],
        eventQueue: [evt],
      }),
      123
    );

    useGameStore.getState().resolveGameEvent(evt.id, 'let-walk');

    const after = useGameStore.getState().game!;
    const p = after.projects.find((x) => x.id === project.id)!;

    expect(p.cast.some((r) => r.talentId === talent.id)).toBe(false);
    expect((p.contractedTalent || []).some((r) => r.talentId === talent.id)).toBe(false);
    expect(p.script?.characters?.some((c: any) => c.assignedTalentId === talent.id)).toBe(false);

    const t = after.talent.find((x) => x.id === talent.id)!;
    expect(t.contractStatus).toBe('available');
    expect(t.currentContractWeeks).toBe(0);
  });
});
