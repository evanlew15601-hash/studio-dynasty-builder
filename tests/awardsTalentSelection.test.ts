import { describe, expect, it } from 'vitest';
import type { Project, Script, TalentPerson } from '@/types/game';
import { findRelevantTalentForAwardsCategory } from '@/utils/awardsTalentSelection';

function makeTalent(overrides: Partial<TalentPerson> = {}): TalentPerson {
  return {
    id: 't1',
    name: 'Test Talent',
    type: 'actor',
    age: 30,
    experience: 50,
    reputation: 50,
    marketValue: 1_000_000,
    genres: ['drama'],
    contractStatus: 'available',
    availability: { start: new Date(), end: new Date() },
    ...overrides,
  };
}

function makeScript(overrides: Partial<Script> = {}): Script {
  return {
    id: 's1',
    title: 'Test Film',
    genre: 'drama',
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

describe('findRelevantTalentForAwardsCategory - excluded roles', () => {
  it('does not pick excluded script roles for director awards', () => {
    const project = {
      script: makeScript({
        characters: [
          { id: 'd-ex', name: 'Director', importance: 'crew', requiredType: 'director', assignedTalentId: 'dir-ex', excluded: true },
          { id: 'd-ok', name: 'Director', importance: 'crew', requiredType: 'director', assignedTalentId: 'dir-ok' },
        ],
      }),
      cast: [],
      crew: [],
    } as any as Project;

    const talentPool: TalentPerson[] = [
      makeTalent({ id: 'dir-ex', name: 'Excluded Director', type: 'director' }),
      makeTalent({ id: 'dir-ok', name: 'Active Director', type: 'director' }),
    ];

    const picked = findRelevantTalentForAwardsCategory({
      project,
      category: 'Best Director',
      talentPool,
      random: () => 0,
    });

    expect(picked?.id).toBe('dir-ok');
  });

  it('does not fall back to legacy cast when script.characters is non-empty, even if all roles are excluded', () => {
    const project = {
      script: makeScript({
        characters: [
          { id: 'd1', name: 'Director', importance: 'crew', requiredType: 'director', excluded: true },
          { id: 'l1', name: 'Lead', importance: 'lead', requiredType: 'actor', excluded: true },
        ],
      }),
      cast: [
        { talentId: 'dir-legacy', role: 'Director', salary: 0, contractTerms: { duration: new Date(), exclusivity: false, merchandising: false, sequelOptions: 0 } },
      ],
      crew: [],
    } as any as Project;

    const talentPool: TalentPerson[] = [
      makeTalent({ id: 'dir-legacy', name: 'Legacy Director', type: 'director' }),
    ];

    const picked = findRelevantTalentForAwardsCategory({
      project,
      category: 'Best Director',
      talentPool,
      random: () => 0,
    });

    expect(picked).toBeUndefined();
  });
});
