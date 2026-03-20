import { describe, expect, it } from 'vitest';
import type { Project, TalentPerson } from '@/types/game';
import { attachBasicCastForAI } from '@/utils/attachBasicCastForAI';

function makeTalent(overrides: Partial<TalentPerson>): TalentPerson {
  return {
    id: overrides.id ?? 't',
    name: overrides.name ?? 'Talent',
    type: overrides.type ?? 'actor',
    age: overrides.age ?? 30,
    gender: overrides.gender ?? 'Male',
    race: overrides.race ?? 'White',
    nationality: overrides.nationality ?? 'US',
    experience: overrides.experience ?? 50,
    reputation: overrides.reputation ?? 50,
    marketValue: overrides.marketValue ?? 5_000_000,
    contractStatus: overrides.contractStatus ?? 'available',
    awards: overrides.awards ?? [],
    traits: overrides.traits ?? [],
    genres: overrides.genres ?? ['drama'],
    specialties: overrides.specialties,
    salary: overrides.salary,
    busyUntilWeek: overrides.busyUntilWeek,
    contractStatusBase: overrides.contractStatusBase,
    futureHolds: overrides.futureHolds,
  } as any;
}

function makeBaseProject(): Project {
  return {
    id: 'p1',
    title: 'AI Film',
    type: 'feature',
    status: 'released',
    currentPhase: 'release',
    phaseDuration: 0,
    studioName: 'AI Studio',
    script: {
      id: 's1',
      title: 'AI Film',
      genre: 'drama',
      logline: 'Test',
      writer: 'Test',
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
    } as any,
    budget: { total: 10_000_000, allocated: {}, spent: {}, overages: {} } as any,
    cast: [],
    crew: [],
    contractedTalent: [],
    developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 100, locationSecured: 100, completionThreshold: 100, issues: [] } as any,
    locations: [],
    timeline: { milestones: [] } as any,
    distributionStrategy: { primary: { platform: 'Theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } } } as any,
    metrics: {},
  } as any;
}

describe('attachBasicCastForAI', () => {
  it('does not introduce nondeterministic contract terms dates', () => {
    const talent: TalentPerson[] = [
      makeTalent({ id: 'd1', type: 'director', name: 'Director', gender: 'Female' }),
      makeTalent({ id: 'a1', type: 'actor', name: 'Lead', gender: 'Male' }),
      makeTalent({ id: 'a2', type: 'actor', name: 'Support', gender: 'Female' }),
      makeTalent({ id: 'a3', type: 'actor', name: 'Support 2', gender: 'Male' }),
    ];

    const project = makeBaseProject();
    const updated = attachBasicCastForAI(project, talent);

    const terms = [...(updated.cast || []), ...(updated.crew || [])]
      .map((c: any) => c?.contractTerms?.duration)
      .filter(Boolean) as Date[];

    expect(terms.length).toBeGreaterThan(0);
    for (const d of terms) {
      expect(d).toBeInstanceOf(Date);
      expect(d.getTime()).toBe(0);
    }
  });
});
