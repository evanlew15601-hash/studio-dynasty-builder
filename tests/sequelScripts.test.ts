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
});
