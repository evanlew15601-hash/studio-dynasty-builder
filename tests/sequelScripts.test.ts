import { describe, expect, it } from 'vitest';
import { createSequelScript } from '@/utils/sequelScripts';

const baseProject = {
  id: 'p-1',
  title: 'Original',
  type: 'feature',
  budget: { total: 20_000_000 },
  script: {
    id: 's-1',
    title: 'Original',
    genre: 'drama',
    logline: 'x',
    writer: 'Writer',
    pages: 110,
    quality: 80,
    budget: 20_000_000,
    developmentStage: 'final',
    themes: ['theme'],
    targetAudience: 'general',
    estimatedRuntime: 120,
    characteristics: {
      tone: 'balanced',
      pacing: 'steady',
      dialogue: 'naturalistic',
      visualStyle: 'realistic',
      commercialAppeal: 6,
      criticalPotential: 6,
      cgiIntensity: 'minimal',
    },
    characters: [
      { id: 'c-1', name: 'Hero', importance: 'lead', requiredType: 'actor', requiredGender: 'Male', assignedTalentId: 'a-1' },
      { id: 'c-2', name: 'Sidekick', importance: 'supporting', requiredType: 'actor', requiredGender: 'Female', assignedTalentId: 'a-2' },
    ],
  },
} as any;

describe('createSequelScript', () => {
  it('creates a TV series draft with episodic pacing and pilot-length defaults', () => {
    const script = createSequelScript({
      id: 's-2',
      title: 'Original: The Series',
      description: 'TV spin-off',
      budget: 3_000_000,
      franchiseId: 'f-1',
      medium: 'tv-series',
      originalProject: baseProject,
      returningCast: [{ characterId: 'c-1', talentId: 'a-1', confirmed: true }],
      getCharacterKey: (c) => c.id,
    });

    expect(script.pages).toBe(60);
    expect(script.estimatedRuntime).toBe(45);
    expect(script.characteristics.pacing).toBe('episodic');
    expect(script.characters?.find((c: any) => c.id === 'c-1')?.assignedTalentId).toBe('a-1');
    expect(script.characters?.find((c: any) => c.id === 'c-2')?.assignedTalentId).toBeUndefined();
  });

  it('creates a film sequel draft with feature-length defaults', () => {
    const script = createSequelScript({
      id: 's-3',
      title: 'Original II',
      description: 'Film sequel',
      budget: 30_000_000,
      franchiseId: 'f-1',
      medium: 'film',
      originalProject: baseProject,
      returningCast: [],
      getCharacterKey: (c) => c.id,
    });

    expect(script.pages).toBe(120);
    expect(script.estimatedRuntime).toBe(130);
    expect(script.characteristics.pacing).toBe('fast-paced');
  });

  it('automatically carries forward established cast when no manual returning cast list is supplied', () => {
    const script = createSequelScript({
      id: 's-4',
      title: 'Original III',
      description: 'Continuation',
      budget: 35_000_000,
      franchiseId: 'f-1',
      medium: 'film',
      originalProject: baseProject,
      returningCast: [],
      getCharacterKey: (c) => c.id,
    });

    expect(script.characters?.find((c: any) => c.id === 'c-1')?.assignedTalentId).toBe('a-1');
    expect(script.characters?.find((c: any) => c.id === 'c-2')?.assignedTalentId).toBe('a-2');
  });

  it('imports active franchise library characters and returning talent into sequel drafts', () => {
    const script = createSequelScript({
      id: 's-5',
      title: 'Original: Legacy',
      description: 'Library-driven sequel',
      budget: 40_000_000,
      franchiseId: 'f-1',
      medium: 'film',
      originalProject: baseProject,
      returningCast: [],
      getCharacterKey: (c) => c.franchiseCharacterId || c.id,
      franchise: {
        id: 'f-1',
        title: 'Original Saga',
        originDate: '2025-01-01',
        creatorStudioId: 'studio-1',
        genre: ['drama'],
        tone: 'serious',
        entries: ['p-1'],
        status: 'active',
        franchiseTags: [],
        culturalWeight: 70,
        cost: 0,
        characterLibrary: [
          {
            characterId: 'c-1',
            name: 'Avery Vale',
            description: 'The established lead whose choices anchor the saga.',
            ageRange: [35, 50],
            gender: 'Male',
            narrativeImportance: 'lead',
            recurrencePotential: 95,
            status: 'active',
            appearances: ['p-1'],
          },
          {
            characterId: 'c-3',
            name: 'Mira Cross',
            description: 'A recurring ally introduced in the franchise bible.',
            ageRange: [30, 45],
            gender: 'Female',
            narrativeImportance: 'supporting',
            recurrencePotential: 85,
            status: 'active',
            appearances: ['p-1'],
          },
        ],
        talentLibrary: [
          { talentId: 'a-3', name: 'Actor Three', role: 'actor', characterId: 'c-3', projectIds: ['p-1'], continuityPreference: 'return', status: 'available' },
        ],
        continuity: {
          timelineEvents: [],
          characterAppearances: { 'c-3': ['p-1'] },
          deaths: {},
          relationships: [],
          locations: [],
          plotThreads: [{ id: 'arc-1', description: 'The missing city is still unresolved.', status: 'active', appearances: ['p-1'] }],
          warnings: [],
        },
      } as any,
    });

    const lead = script.characters?.find((c: any) => c.franchiseCharacterId === 'c-1') as any;
    const recurring = script.characters?.find((c: any) => c.franchiseCharacterId === 'c-3') as any;

    expect(lead.name).toBe('Avery Vale');
    expect(lead.description).toContain('established lead');
    expect(recurring.name).toBe('Mira Cross');
    expect(recurring.assignedTalentId).toBe('a-3');
    expect(script.themes).toContain('Active franchise arc: The missing city is still unresolved.');
  });

});
