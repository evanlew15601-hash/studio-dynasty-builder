import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { TalentFilmographySystem } from '@/game/systems/talentFilmographySystem';
import { TalentCareerArcSystem } from '@/game/systems/talentCareerArcSystem';

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
        title: 'Breakout Film',
        type: 'feature',
        status: 'released',
        currentPhase: 'distribution',
        phaseDuration: 0,
        script: {
          id: 's1',
          title: 'Breakout Film',
          genre: 'drama',
          logline: '',
          writer: '',
          pages: 1,
          quality: 50,
          budget: 100,
          developmentStage: 'final',
          themes: [],
          targetAudience: 'general',
          estimatedRuntime: 100,
          characteristics: {} as any,
          characters: [],
        },
        budget: { total: 100, allocated: {} as any, spent: {} as any, overages: {} as any },
        cast: [{ talentId: 't1', role: 'Lead Actor', salary: 1, points: 0, contractTerms: {} as any }],
        crew: [{ talentId: 't2', role: 'Director', salary: 1, points: 0, contractTerms: {} as any }],
        timeline: {} as any,
        locations: [],
        distributionStrategy: {} as any,
        contractedTalent: [],
        developmentProgress: {} as any,
        metrics: { boxOfficeTotal: 350, criticsScore: 90 } as any,
        releaseWeek: 10,
        releaseYear: 2026,
      } as any,
    ],
    talent: [
      {
        id: 't1',
        name: 'Rookie Star',
        type: 'actor',
        age: 22,
        experience: 2,
        reputation: 55,
        marketValue: 10,
        genres: ['drama'],
        contractStatus: 'available',
        availability: { start: new Date(), end: new Date() },
        careerStage: 'rising',
      } as any,
      {
        id: 't2',
        name: 'Vet Director',
        type: 'director',
        age: 55,
        experience: 25,
        reputation: 80,
        marketValue: 60,
        genres: ['drama'],
        contractStatus: 'available',
        availability: { start: new Date(), end: new Date() },
        careerStage: 'veteran',
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

describe('TalentCareerArcSystem', () => {
  it('creates breakthrough events for rising talent on a hit release', () => {
    const state = makeBaseState();

    const result = advanceWeek(state, createRng(1), [TalentFilmographySystem, TalentCareerArcSystem]);

    const t1 = result.nextState.talent.find((t) => t.id === 't1');
    expect(t1?.careerEvolution?.some((e) => e.type === 'breakthrough' && e.sourceProjectId === 'p1')).toBe(true);
  });

  it('creates career events for hit releases present only in allReleases (AI/competitors)', () => {
    const base = makeBaseState({ projects: [], allReleases: makeBaseState().projects as any });

    const result = advanceWeek(base, createRng(1), [TalentFilmographySystem, TalentCareerArcSystem]);

    const t1 = result.nextState.talent.find((t) => t.id === 't1');
    expect(t1?.careerEvolution?.some((e) => e.type === 'breakthrough' && e.sourceProjectId === 'p1')).toBe(true);
  });

  it('does not duplicate events if already present for the same source project', () => {
    const state = makeBaseState({
      talent: [
        {
          id: 't1',
          name: 'Rookie Star',
          type: 'actor',
          age: 22,
          experience: 2,
          reputation: 55,
          marketValue: 10,
          genres: ['drama'],
          contractStatus: 'available',
          availability: { start: new Date(), end: new Date() },
          careerStage: 'rising',
          careerEvolution: [
            {
              type: 'breakthrough',
              year: 2026,
              week: 10,
              description: 'x',
              impactOnReputation: 0,
              impactOnMarketValue: 0,
              sourceProjectId: 'p1',
            },
          ],
        } as any,
        {
          id: 't2',
          name: 'Vet Director',
          type: 'director',
          age: 55,
          experience: 25,
          reputation: 80,
          marketValue: 60,
          genres: ['drama'],
          contractStatus: 'available',
          availability: { start: new Date(), end: new Date() },
          careerStage: 'veteran',
        } as any,
      ],
    });

    const result = advanceWeek(state, createRng(1), [TalentFilmographySystem, TalentCareerArcSystem]);

    const t1 = result.nextState.talent.find((t) => t.id === 't1');
    const hits = (t1?.careerEvolution || []).filter((e) => e.type === 'breakthrough' && e.sourceProjectId === 'p1');
    expect(hits.length).toBe(1);
  });
});
