import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { AwardsSeasonSystem } from '@/game/systems/awardsSeasonSystem';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 5_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2025,
    currentWeek: 1,
    currentQuarter: 1,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios: [],
    marketConditions: {
      trendingGenres: ['drama', 'comedy', 'action'],
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
    universeSeed: 77,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

describe('AwardsSeasonSystem actor dedupe', () => {
  it('does not nominate the same actor across multiple acting categories in a single show', () => {
    const actorA = {
      id: 'actor-a',
      name: 'Alex Lead',
      type: 'actor',
      age: 30,
      gender: 'Male',
      experience: 50,
      reputation: 80,
      marketValue: 1_000_000,
      genres: ['drama', 'comedy'],
      contractStatus: 'available',
      availability: { start: new Date('2025-01-01'), end: new Date('2025-12-31') },
    } as any;

    const actorB = {
      id: 'actor-b',
      name: 'Blake Comic',
      type: 'actor',
      age: 32,
      gender: 'Male',
      experience: 45,
      reputation: 70,
      marketValue: 900_000,
      genres: ['comedy'],
      contractStatus: 'available',
      availability: { start: new Date('2025-01-01'), end: new Date('2025-12-31') },
    } as any;

    const dramaProject = {
      id: 'p-drama',
      title: 'Serious Business',
      status: 'released',
      type: 'feature',
      script: { id: 's-drama', title: 'Serious Business', genre: 'drama', characteristics: { criticalPotential: 9 } },
      budget: { total: 12_000_000 },
      metrics: { criticsScore: 94, audienceScore: 84, boxOfficeTotal: 55_000_000 },
      cast: [{ talentId: actorA.id, role: 'lead' }],
      crew: [],
      releaseWeek: 40,
      releaseYear: 2024,
    } as any;

    const comedyWithActorA = {
      id: 'p-comedy-a',
      title: 'Laugh Riot',
      status: 'released',
      type: 'feature',
      script: { id: 's-comedy-a', title: 'Laugh Riot', genre: 'comedy', characteristics: { criticalPotential: 7 } },
      budget: { total: 10_000_000 },
      metrics: { criticsScore: 88, audienceScore: 86, boxOfficeTotal: 48_000_000 },
      cast: [{ talentId: actorA.id, role: 'lead' }],
      crew: [],
      releaseWeek: 41,
      releaseYear: 2024,
    } as any;

    const comedyWithActorB = {
      id: 'p-comedy-b',
      title: 'Punchline City',
      status: 'released',
      type: 'feature',
      script: { id: 's-comedy-b', title: 'Punchline City', genre: 'comedy', characteristics: { criticalPotential: 7 } },
      budget: { total: 9_000_000 },
      metrics: { criticsScore: 86, audienceScore: 85, boxOfficeTotal: 45_000_000 },
      cast: [{ talentId: actorB.id, role: 'lead' }],
      crew: [],
      releaseWeek: 42,
      releaseYear: 2024,
    } as any;

    const systems = [AwardsSeasonSystem];
    const rng = createRng(123);

    let state = makeBaseState({
      talent: [actorA, actorB],
      projects: [dramaProject, comedyWithActorA, comedyWithActorB],
      allReleases: [dramaProject, comedyWithActorA, comedyWithActorB],
    });

    // Week 2: Crystal Ring nominations.
    state = advanceWeek(state, rng, systems).nextState;
    expect(state.currentWeek).toBe(2);

    // Advance to week 6: Crystal Ring ceremony.
    for (let i = 0; i < 4; i++) {
      state = advanceWeek(state, rng, systems).nextState;
    }

    expect(state.currentWeek).toBe(6);

    const ceremony = state.awardsSeason?.ceremonyHistory?.['crystal-ring'];
    expect(ceremony).toBeTruthy();

    const dramaNoms = ceremony?.nominations?.['Best Actor - Drama'] || [];
    const comedyNoms = ceremony?.nominations?.['Best Actor - Comedy/Musical'] || [];

    const dramaTalentIds = new Set(dramaNoms.map((n) => n.talentId).filter(Boolean));
    const comedyTalentIds = new Set(comedyNoms.map((n) => n.talentId).filter(Boolean));

    expect(dramaTalentIds.has(actorA.id)).toBe(true);
    expect(comedyTalentIds.has(actorA.id)).toBe(false);
    expect(comedyTalentIds.has(actorB.id)).toBe(true);
  });
});
