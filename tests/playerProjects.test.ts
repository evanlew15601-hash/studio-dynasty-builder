import { describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { getAllKnownProjects, getPlayerProjectIds, isPlayerOwnedProject } from '@/utils/playerProjects';

describe('playerProjects utils', () => {
  it('dedupes by id, preferring state.projects over allReleases', () => {
    const playerProject: Project = {
      id: 'p-1',
      title: 'Player Cut',
      type: 'feature',
      status: 'released',
      currentPhase: 'released',
      script: { id: 's-1', title: 'Player Cut', genre: 'drama', pages: 100, quality: 80 } as any,
      budget: { total: 10_000_000 } as any,
      metrics: { criticsScore: 88 } as any,
      releaseYear: 2026,
      releaseWeek: 1,
    } as any;

    const dupeInAllReleases: Project = {
      ...playerProject,
      title: 'AI Copy',
      studioName: 'AI Studio',
    } as any;

    const state = {
      studio: { id: 'studio-1', name: 'Player Studio', budget: 0, reputation: 50, debt: 0, founded: 2000, specialties: [], awards: [] },
      currentYear: 2027,
      currentWeek: 1,
      currentQuarter: 1,
      projects: [playerProject],
      allReleases: [dupeInAllReleases],
      scripts: [],
      talent: [],
      competitorStudios: [],
      marketConditions: { trendingGenres: [], audiencePreferences: [], economicClimate: 'stable', technologicalAdvances: [], regulatoryChanges: [], seasonalTrends: [], competitorReleases: [] },
      eventQueue: [],
      boxOfficeHistory: [],
      awardsCalendar: [],
      industryTrends: [],
      topFilmsHistory: [],
      franchises: [],
      publicDomainIPs: [],
      allReleasesHistory: [],
    } as any as GameState;

    const all = getAllKnownProjects(state);
    expect(all.map((p) => p.id)).toEqual(['p-1']);
    expect(all[0].title).toBe('Player Cut');
  });

  it('treats projects as player-owned when studioName matches even if not in state.projects', () => {
    const state = {
      studio: { id: 'studio-1', name: 'Player Studio' },
      projects: [],
    } as any as GameState;

    const playerProjectIds = getPlayerProjectIds(state);

    const legacy: Project = {
      id: 'p-legacy',
      title: 'Legacy',
      type: 'feature',
      status: 'released',
      currentPhase: 'released',
      script: { id: 's-legacy', title: 'Legacy', genre: 'drama', pages: 100, quality: 70 } as any,
      budget: { total: 1 } as any,
      metrics: { criticsScore: 70 } as any,
      studioName: 'Player Studio',
    } as any;

    expect(isPlayerOwnedProject({ project: legacy, state, playerProjectIds })).toBe(true);
  });
});
