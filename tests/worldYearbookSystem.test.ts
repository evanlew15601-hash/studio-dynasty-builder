import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { TalentLifecycleSystem } from '@/game/systems/talentLifecycleSystem';
import { TalentRetirementSystem } from '@/game/systems/talentRetirementSystem';
import { WorldYearbookSystem } from '@/game/systems/worldYearbookSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [{
        id: 'a1',
        projectId: 'p1',
        category: 'Best Picture',
        ceremony: 'Crown',
        year: 2026,
        prestige: 10,
        reputationBoost: 5,
      }],
    },
    currentYear: 2026,
    currentWeek: 52,
    currentQuarter: 4,
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
    boxOfficeHistory: [
      {
        week: 10,
        year: 2026,
        releases: [
          { projectId: 'p1', title: 'Hit One', studio: 'Test Studio', weeklyRevenue: 10, totalRevenue: 100, theaters: 1, weekInRelease: 1 },
          { projectId: 'p2', title: 'Hit Two', studio: 'Other', weeklyRevenue: 10, totalRevenue: 200, theaters: 1, weekInRelease: 1 },
        ],
        totalRevenue: 0,
      },
    ],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
    universeSeed: 123,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('WorldYearbookSystem', () => {
  it('creates a yearbook entry on year rollover and emits a recap card', () => {
    const state = makeBaseState({
      talent: [
        {
          id: 't1',
          name: 'Rising Star',
          type: 'actor',
          age: 22,
          experience: 2,
          reputation: 70,
          marketValue: 10,
          genres: ['drama'],
          contractStatus: 'available',
          availability: { start: new Date(), end: new Date() },
          careerEvolution: [
            {
              type: 'breakthrough',
              year: 2026,
              week: 20,
              description: 'x',
              impactOnReputation: 0,
              impactOnMarketValue: 0,
              sourceProjectId: 'p1',
            },
          ],
        } as any,
      ],
    });

    const result = advanceWeek(state, createRng(1), [TalentLifecycleSystem, TalentRetirementSystem, WorldYearbookSystem]);

    expect(result.nextState.currentYear).toBe(2027);
    expect(result.nextState.currentWeek).toBe(1);

    expect(result.nextState.worldYearbooks?.length).toBe(1);
    expect(result.nextState.worldYearbooks?.[0].year).toBe(2026);
    expect(result.nextState.worldYearbooks?.[0].id).toBe('yearbook:2026');
    expect(result.nextState.worldYearbooks?.[0].body.includes('Career moments:')).toBe(true);

    expect(result.recap.some((c) => c.title.includes('Year in Review: 2026'))).toBe(true);
  });

  it('does not duplicate yearbook entries if already present', () => {
    const state = makeBaseState({ worldYearbooks: [{ id: 'yearbook:2026', year: 2026, title: 'x', body: 'y' }] });
    const result = advanceWeek(state, createRng(1), [TalentLifecycleSystem, TalentRetirementSystem, WorldYearbookSystem]);

    expect(result.nextState.worldYearbooks?.length).toBe(1);
  });
});
