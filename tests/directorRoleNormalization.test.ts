import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { normalizeDirectorRolesInGameState } from '@/utils/directorRoleNormalization';

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

describe('normalizeDirectorRolesInGameState', () => {
  it('converts legacy director script characters to crew + requiredType director', () => {
    const state = makeState({
      talent: [
        { id: 'd1', name: 'Dir', type: 'director', contractStatus: 'available', reputation: 50, marketValue: 1 } as any,
      ],
      projects: [
        {
          id: 'p1',
          title: 'Film',
          script: {
            id: 's1',
            title: 'Film',
            genre: 'drama',
            characters: [
              { id: 'c1', name: 'Director', importance: 'lead', assignedTalentId: 'd1' } as any,
            ],
          } as any,
        } as any,
      ],
    });

    const patched = normalizeDirectorRolesInGameState(state);
    const ch = patched.projects[0].script.characters?.[0] as any;

    expect(ch.importance).toBe('crew');
    expect(ch.requiredType).toBe('director');
  });
});
