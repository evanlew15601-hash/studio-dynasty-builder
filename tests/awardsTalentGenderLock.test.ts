import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import type { AwardCategoryDefinition } from '@/data/AwardsSchedule';
import { findRelevantTalentForAwardCategory } from '@/utils/awardsTalent';

function makeState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: { id: 's1', name: 'Studio', budget: 0, reputation: 50, founded: 2000, specialties: [] as any } as any,
    currentYear: 2026,
    currentWeek: 10,
    currentQuarter: 1,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios: [],
    marketConditions: { trendingGenres: [] as any, audiencePreferences: [], competitorReleases: [] } as any,
    eventQueue: [],
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
  } as any;

  return { ...base, ...(overrides || {}) } as any;
}

describe('findRelevantTalentForAwardCategory', () => {
  it('enforces gendered categories (Best Actress does not accept male talent; category score should be 0)', () => {
    const state = makeState({
      talent: [
        { id: 'm1', name: 'Male Lead', type: 'actor', gender: 'Male', contractStatus: 'available' } as any,
      ],
    });

    const project: Project = {
      id: 'p1',
      title: 'Film',
      status: 'released',
      releaseYear: 2025,
      releaseWeek: 1,
      budget: { total: 1 } as any,
      cast: [{ talentId: 'm1', role: 'Lead Actor' } as any],
      crew: [],
      script: {
        id: 's1',
        title: 'Film',
        genre: 'drama',
        characters: [{ id: 'c1', name: 'Hero', importance: 'lead', requiredType: 'actor', assignedTalentId: 'm1' } as any],
      } as any,
    } as any;

    const bestActress: AwardCategoryDefinition = {
      id: 'best-actress',
      name: 'Best Actress',
      awardKind: 'talent',
      talent: { type: 'actor', gender: 'Female' },
    };

    const bestActor: AwardCategoryDefinition = {
      id: 'best-actor',
      name: 'Best Actor',
      awardKind: 'talent',
      talent: { type: 'actor', gender: 'Male' },
    };

    const actressTalent = findRelevantTalentForAwardCategory(state, project, bestActress.name, bestActress);
    const actorTalent = findRelevantTalentForAwardCategory(state, project, bestActor.name, bestActor);

    expect(actressTalent).toBeUndefined();
    expect(actorTalent?.id).toBe('m1');

    // Headless awards engine treats missing eligible credited talent as category-ineligible (score 0).
    const categoryScore = actressTalent ? 50 : 0;
    expect(categoryScore).toBe(0);
  });

  it('does not allow supporting talent to satisfy lead gendered categories', () => {
    const state = makeState({
      talent: [
        { id: 'm1', name: 'Male Lead', type: 'actor', gender: 'Male', contractStatus: 'available' } as any,
        { id: 'f1', name: 'Female Supporting', type: 'actor', gender: 'Female', contractStatus: 'available' } as any,
      ],
    });

    const project: Project = {
      id: 'p1',
      title: 'Film',
      status: 'released',
      releaseYear: 2025,
      releaseWeek: 1,
      budget: { total: 1 } as any,
      cast: [
        { talentId: 'm1', role: 'Lead Actor' } as any,
        { talentId: 'f1', role: 'Supporting Actor' } as any,
      ],
      crew: [],
      script: {
        id: 's1',
        title: 'Film',
        genre: 'drama',
        characters: [
          { id: 'c1', name: 'Hero', importance: 'lead', requiredType: 'actor', assignedTalentId: 'm1' } as any,
          { id: 'c2', name: 'Friend', importance: 'supporting', requiredType: 'actor', assignedTalentId: 'f1' } as any,
        ],
      } as any,
    } as any;

    const bestActress: AwardCategoryDefinition = {
      id: 'best-actress',
      name: 'Best Actress',
      awardKind: 'talent',
      talent: { type: 'actor', gender: 'Female' },
    };

    const bestSupportingActress: AwardCategoryDefinition = {
      id: 'best-supporting-actress',
      name: 'Best Supporting Actress',
      awardKind: 'talent',
      talent: { type: 'actor', gender: 'Female', supporting: true },
    };

    expect(findRelevantTalentForAwardCategory(state, project, bestActress.name, bestActress)).toBeUndefined();
    expect(findRelevantTalentForAwardCategory(state, project, bestSupportingActress.name, bestSupportingActress)?.id).toBe('f1');
  });
});
