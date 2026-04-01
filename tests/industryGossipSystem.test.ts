import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState, TalentPerson } from '@/types/game';
import { createRng } from '@/game/core/rng';
import { IndustryGossipSystem } from '@/game/systems/industryGossipSystem';
import { MediaEngine } from '@/components/game/MediaEngine';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 2_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
    },
    currentYear: 2027,
    currentWeek: 12,
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
    universeSeed: 999,
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

function makeTalent(overrides: Partial<TalentPerson> & Pick<TalentPerson, 'id' | 'name'>): TalentPerson {
  return {
    id: overrides.id,
    name: overrides.name,
    type: 'actor',
    age: 35,
    experience: 10,
    reputation: 80,
    marketValue: 5_000_000,
    fame: 100,
    publicImage: 5,
    burnoutLevel: 100,
    genres: ['drama'],
    contractStatus: 'contracted',
    studioLoyalty: { 'studio-1': 50 },
    availability: { start: new Date('2027-01-01T00:00:00.000Z'), end: new Date('2027-01-01T00:00:00.000Z') },
    ...overrides,
  };
}

describe('IndustryGossipSystem', () => {
  beforeEach(() => {
    MediaEngine.cleanup();
  });

  it('creates a scandal, stamps world history, and queues a player event for contracted talent (quarterly)', () => {
    const star = makeTalent({ id: 't1', name: 'Star One' });

    const state = makeBaseState({ talent: [star] });

    const recap: any[] = [];
    const next = IndustryGossipSystem.onTick(state, {
      rng: createRng(1),
      week: 13,
      year: 2027,
      quarter: 1,
      recap,
      debug: false,
    });

    expect(next.eventQueue.length).toBe(1);
    expect((next.eventQueue[0] as any).data.kind).toBe('gossip:scandal');

    const updated = next.talent.find((t) => t.id === 't1')!;
    expect((updated.scandals || []).length).toBe(1);
    expect((updated.careerEvolution || []).some((e) => e.type === 'scandal' && e.year === 2027 && e.week === 13)).toBe(true);

    expect((next.worldHistory || []).some((e) => e.kind === 'talent_scandal' && (e.entityIds?.talentIds || []).includes('t1'))).toBe(true);

    const media = MediaEngine.getRecentMedia(10);
    expect(media.some((m) => m.id.startsWith('media:gossip:scandal:2027:W13:t1'))).toBe(true);
  });
});
