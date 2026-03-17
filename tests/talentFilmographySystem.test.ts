import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { TalentFilmographySystem } from '@/game/systems/talentFilmographySystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2026,
    currentWeek: 9,
    currentQuarter: 1,
    projects: [
      {
        id: 'p1',
        title: 'Release Test',
        type: 'feature',
        status: 'released',
        currentPhase: 'distribution',
        phaseDuration: 0,
        script: { id: 's1', title: 'Release Test', genre: 'drama', logline: '', writer: '', pages: 1, quality: 50, budget: 100, developmentStage: 'final', themes: [], targetAudience: 'general', estimatedRuntime: 100, characteristics: {} as any, characters: [] },
        budget: { total: 100, allocated: {} as any, spent: {} as any, overages: {} as any },
        cast: [{ talentId: 't1', role: 'Lead Actor', salary: 1, contractTerms: {} as any }],
        crew: [],
        timeline: {} as any,
        locations: [],
        distributionStrategy: {} as any,
        contractedTalent: [],
        developmentProgress: {} as any,
        metrics: { boxOfficeTotal: 350 } as any,
        releaseWeek: 10,
        releaseYear: 2026,
      } as any,
    ],
    talent: [
      {
        id: 't1',
        name: 'Actor One',
        type: 'actor',
        age: 25,
        experience: 1,
        reputation: 50,
        marketValue: 10,
        genres: ['drama'],
        contractStatus: 'available',
        availability: { start: new Date(), end: new Date() },
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
    boxOfficeHistory: [],
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

describe('TalentFilmographySystem', () => {
  it('updates filmography when a project releases this week', () => {
    const state = makeBaseState();

    const result = advanceWeek(state, createRng(1), [TalentFilmographySystem]);

    const t = result.nextState.talent.find((x) => x.id === 't1');
    expect(t?.filmography?.some((f) => f.projectId === 'p1')).toBe(true);
  });

  it('updates filmography for releases present only in allReleases (AI/competitors)', () => {
    const base = makeBaseState({ projects: [], allReleases: makeBaseState().projects as any });

    const result = advanceWeek(base, createRng(1), [TalentFilmographySystem]);

    const t = result.nextState.talent.find((x) => x.id === 't1');
    expect(t?.filmography?.some((f) => f.projectId === 'p1')).toBe(true);
  });
});
