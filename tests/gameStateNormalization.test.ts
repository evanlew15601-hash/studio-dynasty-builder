import { describe, expect, it, vi } from 'vitest';
import type { Franchise, GameState, Project, Script } from '@/types/game';
import { normalizeGameStateForLoad } from '@/utils/gameStateNormalization';

function makeBaseGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 100_000_000,
      founded: 2000,
      specialties: ['drama'],
    },
    currentYear: 2024,
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
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
    ...overrides,
  };
}

function makeBaseScript(overrides: Partial<Script> = {}): Script {
  return {
    id: 'script-1',
    title: 'Test Script',
    genre: 'drama',
    logline: 'A test story.',
    writer: 'In-house',
    pages: 120,
    quality: 50,
    budget: 10_000_000,
    developmentStage: 'polish',
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
    ...overrides,
  };
}

describe('normalizeGameStateForLoad', () => {
  it('preserves persisted traits/screenTimeMinutes/excluded when re-importing roles', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);

    const franchise: Franchise = {
      id: 'f-1',
      title: 'Space Saga',
      originDate: '2024-01-01',
      creatorStudioId: 'studio-1',
      genre: ['sci-fi'],
      tone: 'epic',
      parodySource: 'Star Wars',
      entries: [],
      status: 'active',
      franchiseTags: [],
      culturalWeight: 50,
      cost: 0,
    };

    const script = makeBaseScript({
      sourceType: 'franchise',
      genre: 'sci-fi',
      franchiseId: franchise.id,
      characters: [
        {
          id: 'hero-custom-id',
          name: 'Luke Starwalker',
          importance: 'lead',
          requiredType: 'actor',
          franchiseId: franchise.id,
          franchiseCharacterId: 'char_hero_pilot',
          locked: true,
          excluded: true,
          screenTimeMinutes: 88,
          traits: ['Custom Trait'],
        },
      ],
    });

    const state = makeBaseGameState({
      franchises: [franchise],
      scripts: [script],
    });

    const normalized = normalizeGameStateForLoad(state);
    const hero = normalized.scripts[0].characters?.find(c => c.franchiseCharacterId === 'char_hero_pilot');

    expect(hero?.traits).toEqual(['Custom Trait']);
    expect(hero?.screenTimeMinutes).toBe(88);
    expect(hero?.excluded).toBe(true);
  });

  it('defaults requiredType for older scripts/projects missing it', () => {
    const script = makeBaseScript({
      sourceType: 'original',
      characters: [
        { id: 'c1', name: 'Supporting', importance: 'supporting' },
        { id: 'c2', name: 'Director', importance: 'crew' },
      ],
    });

    const project: Project = {
      id: 'p1',
      title: 'Project',
      script: makeBaseScript({
        id: 'script-2',
        title: 'Project Script',
        characters: [{ id: 'p-c1', name: 'Lead', importance: 'lead' }],
      }),
      type: 'feature',
      currentPhase: 'development',
      budget: {
        total: 1,
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
      status: 'development',
      metrics: {},
      phaseDuration: 1,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 0,
        budgetApproval: 0,
        talentAttached: 0,
        locationSecured: 0,
        completionThreshold: 0,
        issues: [],
      },
    };

    const state = makeBaseGameState({ scripts: [script], projects: [project] });
    const normalized = normalizeGameStateForLoad(state);

    const s1 = normalized.scripts[0];
    expect(s1.characters?.find(c => c.id === 'c1')?.requiredType).toBe('actor');
    expect(s1.characters?.find(c => c.id === 'c2')?.requiredType).toBe('director');

    const p1 = normalized.projects[0];
    expect(p1.script.characters?.find(c => c.id === 'p-c1')?.requiredType).toBe('actor');
  });

  it('normalizes allReleases projects that contain scripts', () => {
    const releaseProject: Project = {
      id: 'ai-1',
      title: 'AI Film',
      script: makeBaseScript({
        id: 'ai-script',
        title: 'AI Film',
        characters: [{ id: 'r1', name: 'Lead', importance: 'lead' }],
      }),
      type: 'feature',
      currentPhase: 'release',
      budget: {
        total: 1,
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
      metrics: {},
      phaseDuration: 1,
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 0,
        budgetApproval: 0,
        talentAttached: 0,
        locationSecured: 0,
        completionThreshold: 0,
        issues: [],
      },
    };

    const state = makeBaseGameState({ allReleases: [releaseProject] });
    const normalized = normalizeGameStateForLoad(state);

    const normalizedRelease = normalized.allReleases[0] as Project;
    expect(normalizedRelease.script.characters?.[0].requiredType).toBe('actor');
  });

  it('accepts older saves that used publicDomainSources and maps them to publicDomainIPs', () => {
    const state: any = makeBaseGameState();
    state.publicDomainIPs = undefined;
    state.publicDomainSources = [
      {
        id: 'pd-1',
        name: 'Some IP',
        domainType: 'literature',
        dateEnteredDomain: '1900-01-01',
        coreElements: [],
        genreFlexibility: ['drama'],
        notableAdaptations: [],
        reputationScore: 50,
        cost: 0,
      },
    ];

    const normalized = normalizeGameStateForLoad(state);
    expect(normalized.publicDomainIPs).toHaveLength(1);
    expect(normalized.publicDomainIPs[0].id).toBe('pd-1');
  });
});
