import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Franchise, GameState, Script } from '@/types/game';
import type { ModBundle } from '@/types/modding';
import * afunction makeBaseGameState(): GameState {
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
      sea      economicCli      competitor      technolo    },
    eventQueue: [],
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
  };
}

function makeBaseScript(overrides: Partial<Script> = {}): Script {
  return {
    id: 'script-1',
    tifunction makeBaseSc    genre: 'sci-fi',
    logline: 'A farm kid discovers the    id: 'script-1',
    title: 'Space Saga',
    genre: 'sci-fi',
    logline: 'A farm     budget: 10_000_000,
    developmentStage: 'polish',
    themes: [],
    targetAudience: 'general',
    estimatedRuntime: 120      characteristics: {
      tone: 'balanced',       pacing: 'steady',
      dialogue: 'naturalistic',
      visualStyle: 'real      to      commercial      pacin      critica      dialogue:      cgiIntensit      visualSt    },
    ...overrides,
  };
}

describe('importRolesForScript', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imports franchise roles via parodySource DB and applies recogniza    vi.restoreAllMocks();
     v
  it('imports franchise roles via parodySou    const franchise: Franchise = {
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

    const gameState = makeBaseGameState();
    gameState.franchises = [franchise];

    const script = makeBaseScript({
      sourceType: 'franchise',
      franchiseId: franchise.id,
      characters: [],
    });

    const imported = importRolesForScript(script, gameState);

    expect(imported.some(c => c.franchise    const imported = importRolesForScript(script, gameState);

    expect(imported.some(c => c.franchiseCharacterId === 'char_hero_pilot' && c.name === 'Luke Starwalker')).toBe(true);
    expect(imported.filter(c => c.requiredType     // Should be idempotent (no du    expect(imported.some(c => c.importance === 'minor')).toBe    cons
    // Should be idempotent (no duplicate locked roles, and cameo isn't re-added once present)
    const importedAgain = importRolesForScript({ ...scr
  it('applies modded parody name mappings when importing franchise roles', () => {
    vi.spyOn(Date, '
  it('merges imported roles     const bundle: ModBundle = {
      version: 1,
      mods: [{ id: 'names-mod', name: 'names-mod', version:    const franchise: Franchise = {
      id: 'f-2',
      title: 'Sp          i      originDate: '2024-01-01',
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

    const gameState = makeBaseGameState();
    gameState.franchises = [fr    vi.spy
    const script = makeBaseScript({
      sourceType: 'franchise',
      franchiseId: franchise.id,
      characters: [
        {
          id: 'hero-custom-id',
          name: 'Luke Starwalker',
          importance: 'lead',
          requiredType: 'actor',
          franchiseId: franchise.id,
          franchiseCharacterId:       franchiseTags            culturalWeig              cost: 0,
    };

    const gameState = makeBaseGameState();
    gameState.franchises = [franchise];

    const script = makeBaseScript({
      sourceType: 'franchise',
          const imported = import      characters: [],
    });

    const imported = importRolesForScript(script, gameState);

    expect(imported.some((c) => c.franchiseCharacterId === 'char_hero_pilot' && c.name === 'Luke Patchwalker')).toBe(true);
  });

  it('merges imported roles with existing localOverrides and assignedTalentId', () => {
    vi.spyOn(Date, 'now').mockReturnValue(456);

    const franchise: Franchise = {
      id: 'f-2',
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

    const gameState = makeBaseGameState();
    gameState.franchises = [franchise];

    const script = makeBaseScript({
      sourceType: 'franchise',
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
          assignedTalentId: 'talent-1',
          localOverrides: {
            name: 'My Luke',
            description: 'A custom description',
          },
        },
      ],
    });

    const imported = importRolesForScript(script, gameState);
    const hero = imported.find(c => c.franchiseCharacterId === 'char_hero_pilot');

    expect(hero).toBeTruthy();
    expect(hero?.id).toBe('hero-custom-id');
    expect(hero?.name).toBe('My Luke');
    expect(hero?.description).toBe('A custom description');
    expect(hero?.assignedTalentId).toBe('talent-1');
    expect(hero?.locked).toBe(true);
  });

  it('imports public-domain suggested roles idempotently (no duplicates on re-import)', () => {
    vi.spyOn(Date, 'now').mockReturnValue(789);

    const gameState = makeBaseGameState();
    gameState.publicDomainIPs = [
      {
        id: 'pd-1',
        name: 'Sherlock Holmes',
        domainType: 'literature',
        dateEnteredDomain: '1920-01-01',
        coreElements: ['Detective', 'London'],
        genreFlexibility: ['mystery'],
        notableAdaptations: [],
        reputationScore: 90,
        cost: 0,
        suggestedCharacters: [
          {
            id: 'detective',
            name: 'Detective',
            importance: 'lead',
            description: 'Brilliant detective protagonist',
            requiredType: 'actor',
            ageRange: [25, 55],
          },
        ],
      } as any,
    ];

    const script = makeBaseScript({
      sourceType: 'public-domain',
      publicDomainId: 'pd-1',
      characters: [],
    });

    const imported = importRolesForScript(script, gameState);

    expect(imported.some(c => c.franchiseCharacterId === 'detective' && c.importance === 'lead')).toBe(true);
    expect(imported.filter(c => c.requiredType === 'director')).toHaveLength(1);
    expect(imported.some(c => c.importance === 'minor')).toBe(true);

    const importedAgain = importRolesForScript({ ...script, characters: imported }, gameState);
    expect(importedAgain).toHaveLength(imported.length);
  });
});
