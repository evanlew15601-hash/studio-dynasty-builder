import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { isTalentAvailable, isTalentAvailableForProject } from '@/utils/talentAvailability';

function makeBaseState(overrides?: Partial<GameState>): GameState {
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

describe('talentAvailability', () => {
  it('treats talent assigned to an active project as unavailable', () => {
    const state = makeBaseState({
      talent: [{ id: 't1', name: 'Actor', type: 'actor', contractStatus: 'available' } as any],
      projects: [
        {
          id: 'p1',
          title: 'Film',
          status: 'development',
          cast: [],
          crew: [],
          contractedTalent: [],
          script: { id: 'sc1', title: 'Film', genre: 'drama', characters: [{ id: 'c1', assignedTalentId: 't1' }] } as any,
        } as any,
      ],
    });

    expect(isTalentAvailable(state, state.talent[0] as any)).toBe(false);
    expect(isTalentAvailableForProject(state, state.talent[0] as any, 'p1')).toBe(true);
  });

  it('treats busy talent as unavailable even if not attached to a project', () => {
    const state = makeBaseState({
      talent: [{ id: 't1', name: 'Actor', type: 'actor', contractStatus: 'busy', busyUntilWeek: 9999 } as any],
    });

    expect(isTalentAvailable(state, state.talent[0] as any)).toBe(false);
  });
});
