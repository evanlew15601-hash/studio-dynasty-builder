import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState, Project } from '@/types/game';
import { useGameStore } from '@/game/store';

type MinimalProject = Project & { awardsCampaign?: any };

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 80,
      budget: 1_000_000_000,
      debt: 0,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
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

  return { ...base, ...(overrides || {}) } as GameState;
}

function makeReleasedProject(id: string): MinimalProject {
  return {
    id,
    title: 'Test Film',
    type: 'feature',
    status: 'released',
    currentPhase: 'released',
    script: { id: 's-1', title: 'Test Film', genre: 'drama', pages: 100, quality: 75 } as any,
    budget: { total: 10_000_000 } as any,
    metrics: { criticsScore: 80 } as any,
    releaseWeek: 1,
    releaseYear: 2026,
    postTheatricalReleases: [],
  } as any;
}

describe('store project mutations propagate across legacy arrays', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 111, rngState: 111 }), 123);
  });

  it('updateProject updates allReleases when ids overlap', () => {
    const project = makeReleasedProject('p-1');
    const dupe = { ...project };

    useGameStore.getState().initGame(
      makeBaseState({
        universeSeed: 111,
        rngState: 111,
        projects: [project as any],
        allReleases: [dupe as any],
      }),
      123
    );

    useGameStore.getState().updateProject('p-1', { awardsCampaign: { budget: 123 } } as any);

    const state = useGameStore.getState().game!;
    expect((state.projects[0] as any).awardsCampaign?.budget).toBe(123);
    expect(((state.allReleases as any[])[0] as any).awardsCampaign?.budget).toBe(123);
  });

  it('replaceProject replaces allReleases when ids overlap', () => {
    const project = makeReleasedProject('p-1');
    const dupe = { ...project };

    useGameStore.getState().initGame(
      makeBaseState({
        universeSeed: 111,
        rngState: 111,
        projects: [project as any],
        allReleases: [dupe as any],
      }),
      123
    );

    useGameStore.getState().replaceProject({ ...project, title: 'Updated' } as any);

    const state = useGameStore.getState().game!;
    expect(state.projects[0].title).toBe('Updated');
    expect(((state.allReleases as any[])[0] as any).title).toBe('Updated');
  });
});
