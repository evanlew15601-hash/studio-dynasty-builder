import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '@/types/game';
import { useGameStore } from '@/game/store';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 1_000_000,
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
    universeSeed: 42,
    rngState: 42 as any,
  };

  return { ...base, ...(overrides || {}) } as any;
}

describe('advanceWeek guard', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState(), 123);
  });

  it('does not advance the week when there are pending events in eventQueue', () => {
    const event: GameEvent = {
      id: 'evt:blocking',
      title: 'Blocking event',
      description: 'Resolve me first',
      type: 'system',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: { kind: 'test:blocking' } as any,
      choices: [{ id: 'ok', text: 'OK', consequences: [] }],
    } as any;

    useGameStore.getState().initGame(
      makeBaseState({
        currentWeek: 10,
        eventQueue: [event],
      }),
      123
    );

    const before = useGameStore.getState().game!;
    const report = useGameStore.getState().advanceWeek({ suppressRecap: true });
    const after = useGameStore.getState().game!;

    expect(report).toBeNull();
    expect(after.currentWeek).toBe(before.currentWeek);
    expect(after.currentYear).toBe(before.currentYear);
    expect(after.eventQueue.length).toBe(1);
  });
});
