import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Franchise, GameState, Script } from '@/types/game';
import { finalizeScriptForGreenlight, finalizeScriptForSave, getScriptGreenlightReport } from '@/utils/scriptFinalization';

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

function makeValidScript(overrides: Partial<Script> = {}): Script {
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

describe('script finalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finalizes a valid franchise script and keeps dashboard greenlight gated by current stage', () => {
    vi.spyOn(Date, 'now').mockReturnValue(999);

    const franchise: Franchise = {
      id: 'f-1',
      title: 'Space Saga',
      originDate: '2024-01-01',
      creatorStudioId: 'studio-1',
      genre: ['sci-fi'],
      tone: 'epic',
      parodySource: 'Star Saga',
      entries: [],
      status: 'active',
      franchiseTags: [],
      culturalWeight: 50,
      cost: 0,
    };

    const gameState = makeBaseGameState();
    gameState.franchises = [franchise];

    const script = makeValidScript({
      genre: 'sci-fi',
      sourceType: 'franchise',
      franchiseId: franchise.id,
      characters: [],
      developmentStage: 'polish',
    });

    const dashboardReport = getScriptGreenlightReport(script, gameState);
    expect(dashboardReport.canFinalize).toBe(true);
    expect(dashboardReport.canGreenlight).toBe(false);

    const { script: finalized, report } = finalizeScriptForGreenlight(script, gameState);
    expect(report.canFinalize).toBe(true);
    expect(report.canGreenlight).toBe(true);
    expect(finalized.developmentStage).toBe('final');

    expect(finalized.characters?.some(c => c.requiredType === 'director')).toBe(true);
    expect(finalized.characters?.some(c => c.requiredType !== 'director' && c.importance === 'lead')).toBe(true);
    expect(finalized.characters?.some(c => c.importance === 'minor')).toBe(true);
    expect(report.fixesApplied).toContain('Imported roles from source IP');
  });

  it('seeds franchise character continuity (casting + local overrides) when starting a new franchise script with no characters', () => {
    const franchise: Franchise = {
      id: 'f-1',
      title: 'Space Saga',
      originDate: '2024-01-01',
      creatorStudioId: 'studio-1',
      genre: ['sci-fi'],
      tone: 'epic',
      parodySource: 'Star Saga',
      entries: ['p-1'],
      status: 'active',
      franchiseTags: [],
      culturalWeight: 50,
      cost: 0,
    };

    const gameState = makeBaseGameState();
    gameState.franchises = [franchise];
    gameState.talent = [
      {
        id: 'talent-1',
        name: 'Actor One',
        type: 'actor',
        age: 30,
        experience: 10,
        reputation: 60,
        marketValue: 5_000_000,
        genres: ['sci-fi'],
        contractStatus: 'available',
        availability: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
      } as any,
      {
        id: 'talent-dir',
        name: 'Director One',
        type: 'director',
        age: 45,
        experience: 20,
        reputation: 70,
        marketValue: 8_000_000,
        genres: ['sci-fi'],
        contractStatus: 'available',
        availability: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
      } as any,
    ];

    gameState.projects = [
      {
        id: 'p-1',
        title: 'Space Saga Origins',
        status: 'released',
        releaseYear: 2024,
        releaseWeek: 1,
        script: {
          id: 'script-prev',
          title: 'Space Saga Origins',
          genre: 'sci-fi',
          logline: 'prev',
          writer: 'In-house',
          pages: 120,
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
            commercialAppeal: 5,
            criticalPotential: 5,
            cgiIntensity: 'minimal',
          },
          sourceType: 'franchise',
          franchiseId: franchise.id,
          characters: [
            {
              id: 'director',
              name: 'Director',
              importance: 'crew',
              requiredType: 'director',
              franchiseId: franchise.id,
              franchiseCharacterId: 'director',
              roleTemplateId: 'director',
              locked: true,
              assignedTalentId: 'talent-dir',
            },
            {
              id: 'char_hero_pilot',
              name: 'Hero Pilot',
              importance: 'lead',
              requiredType: 'actor',
              requiredGender: 'Male',
              franchiseId: franchise.id,
              franchiseCharacterId: 'char_hero_pilot',
              roleTemplateId: 'lead_hero',
              locked: true,
              assignedTalentId: 'talent-1',
              localOverrides: {
                name: 'Captain Patchwalker',
              },
            },
          ],
        },
      } as any,
    ];

    const script = makeValidScript({
      genre: 'sci-fi',
      sourceType: 'franchise',
      franchiseId: franchise.id,
      characters: [],
      developmentStage: 'concept',
    });

    const finalized = finalizeScriptForSave(script, gameState);
    const hero = finalized.characters?.find((c) => c.franchiseCharacterId === 'char_hero_pilot');
    const director = finalized.characters?.find((c) => c.requiredType === 'director');

    expect(hero?.assignedTalentId).toBe('talent-1');
    expect(hero?.name).toBe('Captain Patchwalker');

    // Directors do not automatically return for future franchise entries.
    expect(director?.assignedTalentId).toBeUndefined();
  });

  it('does not force final stage when blocking validation errors exist', () => {
    const gameState = makeBaseGameState();

    const badScript = makeValidScript({
      budget: 0,
      developmentStage: 'polish',
      characters: [],
    });

    const { script: out, report } = finalizeScriptForGreenlight(badScript, gameState);
    expect(report.canFinalize).toBe(false);
    expect(out.developmentStage).toBe('polish');
    expect(report.issues.some(i => i.level === 'error')).toBe(true);
  });

  it('adds missing director/lead/minor roles for an original script and ensures requiredType defaults', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);

    const gameState = makeBaseGameState();

    const script = makeValidScript({
      sourceType: 'original',
      developmentStage: 'concept',
      characters: [
        {
          id: 'support-1',
          name: 'Supporting',
          importance: 'supporting',
        },
      ],
    });

    const { script: finalized, report } = finalizeScriptForGreenlight(script, gameState);

    expect(finalized.developmentStage).toBe('final');
    expect(finalized.characters?.some(c => c.requiredType === 'director')).toBe(true);
    expect(finalized.characters?.some(c => c.importance === 'lead')).toBe(true);
    expect(finalized.characters?.some(c => c.importance === 'minor')).toBe(true);

    // Existing character should get requiredType defaulted to actor
    const supporting = finalized.characters?.find(c => c.id === 'support-1');
    expect(supporting?.requiredType).toBe('actor');

    expect(report.fixesApplied).toContain('Added a Director role');
    expect(report.fixesApplied).toContain('Added a Lead role');
    expect(report.fixesApplied).toContain('Added a Minor/Cameo role');
  });
});
