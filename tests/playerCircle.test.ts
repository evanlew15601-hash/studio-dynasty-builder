import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { computePlayerCircle } from '@/utils/playerCircle';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 55,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama', 'thriller'] as any,
      awards: [],
    },
    currentYear: 2026,
    currentWeek: 10,
    currentQuarter: 1,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios: [],
    marketConditions: {
      trendingGenres: ['drama'] as any,
      audiencePreferences: [],
      economicClimate: 'stable' as any,
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
  } as any;

  return { ...base, ...(overrides || {}) };
}

describe('computePlayerCircle', () => {
  it('ranks collaborators by loyalty then reputation', () => {
    const state = makeBaseState({
      talent: [
        {
          id: 'a',
          name: 'Alpha Actor',
          type: 'actor',
          age: 30,
          experience: 5,
          reputation: 70,
          marketValue: 1,
          contractStatus: 'contracted',
          genres: ['drama'] as any,
          availability: { start: new Date(), end: new Date() },
          studioLoyalty: { 'studio-1': 60 },
        },
        {
          id: 'b',
          name: 'Bravo Director',
          type: 'director',
          age: 45,
          experience: 10,
          reputation: 80,
          marketValue: 1,
          contractStatus: 'contracted',
          genres: ['thriller'] as any,
          availability: { start: new Date(), end: new Date() },
          studioLoyalty: { 'studio-1': 75 },
        },
        {
          id: 'c',
          name: 'Charlie Actor',
          type: 'actor',
          age: 28,
          experience: 2,
          reputation: 90,
          marketValue: 1,
          contractStatus: 'available',
          genres: ['drama'] as any,
          availability: { start: new Date(), end: new Date() },
          studioLoyalty: { 'studio-1': 95 },
        },
      ] as any,
    });

    const circle = computePlayerCircle(state, { limit: 10 });

    // Charlie (loyalty 95) is now included because loyalty > 50 qualifies as collaborator
    expect(circle.collaborators.map((c) => c.talent.id)).toEqual(['c', 'b', 'a']);
    expect(circle.collaborators[0].loyalty).toBe(95);
  });

  it('derives rivals from collaborator relationships', () => {
    const state = makeBaseState({
      talent: [
        {
          id: 'a',
          name: 'Alpha Actor',
          type: 'actor',
          age: 30,
          experience: 5,
          reputation: 70,
          marketValue: 1,
          contractStatus: 'contracted',
          genres: ['drama'] as any,
          availability: { start: new Date(), end: new Date() },
          studioLoyalty: { 'studio-1': 60 },
          relationships: { r: 'rivals' },
        },
        {
          id: 'b',
          name: 'Bravo Director',
          type: 'director',
          age: 45,
          experience: 10,
          reputation: 80,
          marketValue: 1,
          contractStatus: 'contracted',
          genres: ['thriller'] as any,
          availability: { start: new Date(), end: new Date() },
          studioLoyalty: { 'studio-1': 75 },
          relationships: { r: 'hostile' },
        },
        {
          id: 'r',
          name: 'Rival Star',
          type: 'actor',
          age: 35,
          experience: 12,
          reputation: 85,
          marketValue: 1,
          contractStatus: 'available',
          genres: ['drama'] as any,
          availability: { start: new Date(), end: new Date() },
          studioLoyalty: {},
        },
      ] as any,
    });

    const circle = computePlayerCircle(state, { limit: 10 });

    expect(circle.rivals.length).toBe(1);
    expect(circle.rivals[0].talent.id).toBe('r');
    expect(circle.rivals[0].relationshipCount).toBe(2);
  });

  it('dedupes managers across collaborators', () => {
    const agent = {
      id: 'agent-1',
      name: 'Mina Agent',
      agency: 'Upfront',
      powerLevel: 8,
      commission: 0.1,
      specialties: ['drama'] as any,
      clientList: ['a', 'b'],
      reputation: 70,
      connectionStrength: 50,
    };

    const state = makeBaseState({
      talent: [
        {
          id: 'a',
          name: 'Alpha Actor',
          type: 'actor',
          age: 30,
          experience: 5,
          reputation: 70,
          marketValue: 1,
          contractStatus: 'contracted',
          genres: ['drama'] as any,
          availability: { start: new Date(), end: new Date() },
          studioLoyalty: { 'studio-1': 60 },
          agent,
        },
        {
          id: 'b',
          name: 'Bravo Director',
          type: 'director',
          age: 45,
          experience: 10,
          reputation: 80,
          marketValue: 1,
          contractStatus: 'contracted',
          genres: ['thriller'] as any,
          availability: { start: new Date(), end: new Date() },
          studioLoyalty: { 'studio-1': 75 },
          agent,
        },
      ] as any,
    });

    const circle = computePlayerCircle(state, { limit: 10 });
    expect(circle.managers).toHaveLength(1);
    expect(circle.managers[0].id).toBe('agent-1');
  });

  it('ranks studio rivals by genre overlap and rep proximity', () => {
    const state = makeBaseState({
      competitorStudios: [
        { id: 's1', name: 'Overlap Close', reputation: 52, budget: 0, founded: 2000, specialties: ['drama'] as any } as any,
        { id: 's2', name: 'No Overlap Close', reputation: 54, budget: 0, founded: 2000, specialties: ['horror'] as any } as any,
        { id: 's3', name: 'Overlap Far', reputation: 5, budget: 0, founded: 2000, specialties: ['thriller'] as any } as any,
      ],
    });

    const circle = computePlayerCircle(state, { limit: 10 });
    expect(circle.studios[0].studio.id).toBe('s1');
  });
});
