import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Franchise, GameState, Script } from '@/types/game';
import { importRolesForScript } from '@/utils/roleImport';

function makeBaseGameState(): GameState {
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
  };
}

function makeBaseScript(overrides: Partial<Script> = {}): Script {
  return {
    id: 'script-1',
    title: 'Space Saga',
    genre: 'sci-fi',
    logline: 'A farm kid discovers their destiny among the stars.',
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

describe('importRolesForScript', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imports franchise roles via parodySource DB and applies recognizable name mapping', () => {
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

    const gameState = makeBaseGameState();
    gameState.franchises = [franchise];

    const script = makeBaseScript({
      sourceType: 'franchise',
      franchiseId: franchise.id,
      characters: [],
    });

    const imported = importRolesForScript(script, gameState);

    expect(imported.some(c => c.franchiseCharacterId === 'char_hero_pilot' && c.name === 'Luke Starwalker')).toBe(true);
    expect(imported.filter(c => c.requiredType === 'director')).toHaveLength(1);
    expect(imported.some(c => c.importance === 'minor')).toBe(true);

    // Should be idempotent (no duplicate locked roles, and cameo isn't re-added once present)
    const importedAgain = importRolesForScript({ ...script, characters: imported }, gameState);
    expect(importedAgain).toHaveLength(imported.length);
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

  it('treats sourceType="adaptation" as public-domain when publicDomainId is present', () => {
    vi.spyOn(Date, 'now').mockReturnValue(777);

    const gameState = makeBaseGameState();
    gameState.publicDomainIPs = [
      {
        id: 'pd-1',
        name: 'Sherlock Holmes',
        domainType: 'literature',
        dateEnteredDomain: '1900-01-01',
        coreElements: ['logic', 'friendship'],
        genreFlexibility: ['mystery'],
        notableAdaptations: [],
        reputationScore: 70,
        cost: 0,
        suggestedCharacters: [
          { id: 'holmes', name: 'Sherlock Holmes', importance: 'lead', requiredType: 'actor', ageRange: [28, 55] },
          { id: 'watson', name: 'Dr. John Watson', importance: 'supporting', requiredType: 'actor', ageRange: [28, 55] },
        ],
      },
    ];

    const script = makeBaseScript({
      sourceType: 'adaptation',
      publicDomainId: 'pd-1',
      characters: [],
    });

    const imported = importRolesForScript(script, gameState);

    expect(imported.some(c => c.id === 'holmes' && c.name === 'Sherlock Holmes')).toBe(true);
    expect(imported.some(c => c.requiredType === 'director')).toBe(true);
  });

  it('prefers freshly imported/merged roles over stale locked roles already on the script', () => {
    vi.spyOn(Date, 'now').mockReturnValue(888);

    const gameState = makeBaseGameState();
    gameState.publicDomainIPs = [
      {
        id: 'pd-1',
        name: 'Sherlock Holmes',
        domainType: 'literature',
        dateEnteredDomain: '1900-01-01',
        coreElements: ['logic', 'friendship'],
        genreFlexibility: ['mystery'],
        notableAdaptations: [],
        reputationScore: 70,
        cost: 0,
        suggestedCharacters: [
          { id: 'holmes', name: 'Sherlock Holmes', importance: 'lead', requiredType: 'actor', ageRange: [28, 55] },
        ],
      },
    ];

    const script = makeBaseScript({
      sourceType: 'public-domain',
      publicDomainId: 'pd-1',
      characters: [
        {
          id: 'holmes',
          name: 'Old Holmes',
          importance: 'lead',
          requiredType: 'actor',
          franchiseCharacterId: 'holmes',
          locked: true,
        },
      ],
    });

    const imported = importRolesForScript(script, gameState);
    const holmes = imported.find(c => c.franchiseCharacterId === 'holmes');

    expect(holmes?.name).toBe('Sherlock Holmes');
    expect(holmes?.locked).toBe(true);
  });
});
