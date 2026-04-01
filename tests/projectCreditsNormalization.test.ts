import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { normalizeProjectCreditsState } from '@/utils/projectCreditsNormalization';

function makeBaseState(): GameState {
  return {
    studio: {
      id: 's1',
      name: 'Studio',
      reputation: 50,
      budget: 1,
      founded: 2000,
      specialties: ['drama'],
    },
    currentYear: 2025,
    currentWeek: 1,
    currentQuarter: 1,
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
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
  };
}

describe('normalizeProjectCreditsState', () => {
  it('moves director credits out of cast and actor credits out of crew for loaded saves', () => {
    const state = makeBaseState();

    const actor = { id: 'a1', type: 'actor' } as any;
    const director = { id: 'd1', type: 'director' } as any;

    state.talent = [actor, director];

    const project = {
      id: 'p1',
      title: 'Test',
      type: 'feature',
      status: 'released',
      script: { id: 's1', title: 'Test', genre: 'drama' },
      budget: { total: 1 },
      cast: [{ talentId: director.id, role: 'Director' }],
      crew: [{ talentId: actor.id, role: 'Lead Actor' }],
      contractedTalent: [],
    } as any;

    state.projects = [project];
    state.allReleases = [project];

    const normalized = normalizeProjectCreditsState(state);

    const p = normalized.projects[0] as any;

    expect(p.cast.some((c: any) => c.talentId === actor.id)).toBe(true);
    expect(p.cast.some((c: any) => c.talentId === director.id)).toBe(false);

    expect(p.crew.some((c: any) => c.talentId === director.id)).toBe(true);
    expect(p.crew.some((c: any) => c.talentId === actor.id)).toBe(false);
  });
});
