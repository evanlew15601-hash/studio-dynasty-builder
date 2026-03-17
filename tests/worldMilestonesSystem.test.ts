import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';

import { WorldMilestonesSystem } from '@/game/systems/worldMilestonesSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [
        { id: 'a-old', projectId: 'p-old', category: 'Best Picture', ceremony: 'Crown', year: 2024, prestige: 10, reputationBoost: 5 },
        { id: 'a1', projectId: 'p1', category: 'Best Picture', ceremony: 'Crown', year: 2026, prestige: 10, reputationBoost: 5 },
      ],
    },
    currentYear: 2026,
    currentWeek: 52,
    currentQuarter: 4,
    projects: [],
    talent: [
      {
        id: 't1',
        name: 'Star One',
        type: 'actor',
        age: 30,
        experience: 5,
        reputation: 88,
        marketValue: 50,
        genres: ['drama'],
        contractStatus: 'available',
        availability: { start: new Date(), end: new Date() },
        awards: [{ id: 'ta1', talentId: 't1', projectId: 'p1', category: 'Best Actor', ceremony: 'Crown', year: 2026, prestige: 9, reputationBoost: 2 }],
      } as any,
    ],
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
        week: 5,
        year: 2025,
        releases: [{ projectId: 'p-old', title: 'Old Hit', studio: 'Other', weeklyRevenue: 10, totalRevenue: 300, theaters: 1, weekInRelease: 1 }],
        totalRevenue: 0,
      },
      {
        week: 10,
        year: 2026,
        releases: [{ projectId: 'p1', title: 'New Hit', studio: 'Player Studio', weeklyRevenue: 10, totalRevenue: 500, theaters: 1, weekInRelease: 1 }],
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

describe('WorldMilestonesSystem', () => {
  it('adds award win + box office record entries on year rollover', () => {
    const state = makeBaseState();

    const result = advanceWeek(state, createRng(1), [WorldMilestonesSystem]);

    const history = result.nextState.worldHistory || [];

    expect(history.some((e) => e.kind === 'award_win' && e.year === 2026)).toBe(true);
    expect(history.some((e) => e.kind === 'box_office_record' && e.year === 2026)).toBe(true);

    const record = history.find((e) => e.kind === 'box_office_record' && e.year === 2026);
    expect(record?.title).toContain('New Hit');
  });

  it('is idempotent when rerun (no duplicate ids)', () => {
    const state = makeBaseState({
      worldHistory: [
        {
          id: 'hist:award_win:2026:a1',
          kind: 'award_win',
          year: 2026,
          week: 52,
          title: 'x',
          body: 'y',
          importance: 5,
        },
      ],
    });

    const result = advanceWeek(state, createRng(1), [WorldMilestonesSystem]);

    const ids = (result.nextState.worldHistory || []).map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
