import { describe, expect, it } from 'vitest';
import type { AwardCategoryDefinition } from '@/data/AwardsSchedule';
import type { Project } from '@/types/game';
import { computeAwardsCampaignBoost } from '@/utils/awardsCampaign';

function makeProject(overrides?: Partial<Project>): Project {
  const base: Project = {
    id: 'p1',
    title: 'Film',
    status: 'released',
    releaseYear: 2025,
    releaseWeek: 1,
    type: 'feature' as any,
    budget: { total: 1_000_000 } as any,
    cast: [],
    crew: [],
    script: {
      id: 's1',
      title: 'Film',
      genre: 'drama' as any,
      characters: [],
      characteristics: { criticalPotential: 9 } as any,
    } as any,
    metrics: {
      criticsScore: 90,
      audienceScore: 75,
    } as any,
  } as any;

  return { ...base, ...(overrides || {}) } as any;
}

describe('computeAwardsCampaignBoost', () => {
  it('applies a larger boost when the category is targeted', () => {
    const project = makeProject({
      awardsCampaign: {
        projectId: 'p1',
        targetCategories: ['Best Actress'],
        budget: 3_000_000,
        budgetSpent: 1_000_000,
        duration: 8,
        weeksRemaining: 5,
        effectiveness: 80,
        activities: [],
      } as any,
    });

    const targeted: AwardCategoryDefinition = {
      id: 'c1',
      name: 'Best Actress - Drama',
      awardKind: 'talent',
      talent: { type: 'actor', gender: 'Female' },
    };

    const nonTargeted: AwardCategoryDefinition = {
      id: 'c2',
      name: 'Best Cinematography',
      awardKind: 'studio',
    };

    const a = computeAwardsCampaignBoost({ project, categoryDef: targeted, medium: 'film', week: 4, year: 2026 });
    const b = computeAwardsCampaignBoost({ project, categoryDef: nonTargeted, medium: 'film', week: 4, year: 2026 });

    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
    expect(a).toBeGreaterThan(b);
  });

  it('is strongly limited when voter interest is low (low critics/low prestige fit)', () => {
    const project = makeProject({
      script: {
        ...(makeProject().script as any),
        genre: 'action',
        characteristics: { criticalPotential: 2 } as any,
      } as any,
      metrics: { criticsScore: 50, audienceScore: 80 } as any,
      awardsCampaign: {
        projectId: 'p1',
        targetCategories: ['Best Picture'],
        budget: 5_000_000,
        budgetSpent: 2_500_000,
        duration: 8,
        weeksRemaining: 4,
        effectiveness: 100,
        activities: [],
      } as any,
    });

    const bestPicture: AwardCategoryDefinition = {
      id: 'c1',
      name: 'Best Picture',
      awardKind: 'studio',
    };

    const boost = computeAwardsCampaignBoost({ project, categoryDef: bestPicture, medium: 'film', week: 4, year: 2026 });

    expect(boost).toBeLessThan(3);
  });

  it('returns 0 when the show medium does not match the project type', () => {
    const project = makeProject({
      awardsCampaign: {
        projectId: 'p1',
        targetCategories: ['Best Drama Series'],
        budget: 1_000_000,
        budgetSpent: 500_000,
        duration: 8,
        weeksRemaining: 5,
        effectiveness: 80,
        activities: [],
      } as any,
    });

    const category: AwardCategoryDefinition = {
      id: 'tv',
      name: 'Best Drama Series',
      awardKind: 'studio',
    };

    expect(computeAwardsCampaignBoost({ project, categoryDef: category, medium: 'tv', week: 4, year: 2026 })).toBe(0);
  });

  it('heavily penalizes campaigns started too late (no time to influence voters)', () => {
    const project = makeProject({
      awardsCampaign: {
        projectId: 'p1',
        targetCategories: ['Best Picture'],
        budget: 3_000_000,
        budgetSpent: 0,
        duration: 8,
        weeksRemaining: 8,
        effectiveness: 100,
        startedWeek: 4,
        startedYear: 2026,
        activities: [],
      } as any,
    });

    const category: AwardCategoryDefinition = {
      id: 'c1',
      name: 'Best Picture',
      awardKind: 'studio',
    };

    // Nominations happening the same week as campaign start → 0 boost.
    expect(computeAwardsCampaignBoost({ project, categoryDef: category, medium: 'film', week: 4, year: 2026 })).toBe(0);

    // After a few weeks of runway → should provide some boost.
    expect(computeAwardsCampaignBoost({ project, categoryDef: category, medium: 'film', week: 8, year: 2026 })).toBeGreaterThan(0);
  });
});
