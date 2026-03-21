import { beforeEach, describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '@/types/game';
import { useGameStore } from '@/game/store';
import { checkTickOrdering, validateGameState } from '@/game/core/coreLoopChecks';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 75,
      budget: 500_000_000,
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
    universeSeed: 10101,
    rngState: 10101 as any,
  };

  return { ...base, ...(overrides || {}) } as GameState;
}

describe('Core gameplay loop checks (in order)', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState(), 123);
  });

  it('1) tick ordering invariants', () => {
    const systems = useGameStore.getState().registry.getOrdered();
    const issues = checkTickOrdering(systems);
    expect(issues).toEqual([]);
  });

  it('2) event resolution is idempotent (cannot apply consequences twice)', () => {
    const evt: GameEvent = {
      id: 'evt:test-budget',
      title: 'Test event',
      description: 'Test',
      type: 'system',
      triggerDate: new Date('2027-01-01T00:00:00.000Z'),
      data: { kind: 'test:event' } as any,
      choices: [
        {
          id: 'take',
          text: 'Take',
          consequences: [{ type: 'budget', impact: 100_000_000, description: 'Test payout' } as any],
        },
      ],
    } as any;

    useGameStore.getState().initGame(
      makeBaseState({
        studio: { ...makeBaseState().studio, budget: 0 },
        eventQueue: [evt],
      }),
      123
    );

    useGameStore.getState().resolveGameEvent(evt.id, 'take');

    const afterOne = useGameStore.getState().game!;
    expect(afterOne.studio.budget).toBe(100_000_000);
    expect(afterOne.eventQueue.length).toBe(0);

    // Second call should not re-apply consequences.
    useGameStore.getState().resolveGameEvent(evt.id, 'take');

    const afterTwo = useGameStore.getState().game!;
    expect(afterTwo.studio.budget).toBe(100_000_000);
    expect(afterTwo.eventQueue.length).toBe(0);
  });

  it('3-7) long-horizon invariants (no duplicates, no drift, no NaNs)', () => {
    // Keep this short enough for unit tests, but long enough to hit multiple subsystems.
    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 15_000_000,
            cash: 1_000_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 50, adFreePct: 50 },
            promotionBudgetPerWeek: 5_000_000,
            priceIndex: 1.0,
            adLoadIndex: 50,
            freshness: 65,
            catalogValue: 60,
            distressWeeks: 0,
          },
          rivals: [
            {
              id: 'streamflix',
              name: 'StreamFlix',
              subscribers: 35_000_000,
              cash: 2_000_000_000,
              status: 'healthy',
              distressWeeks: 0,
              tierMix: { adSupportedPct: 40, adFreePct: 60 },
              priceIndex: 1.0,
              catalogValue: 70,
              freshness: 60,
            },
          ],
        } as any,
      }),
      123
    );

    for (let i = 0; i < 52 * 2; i++) {
      useGameStore.getState().advanceWeek({ suppressRecap: true });
      const state = useGameStore.getState().game!;

      const issues = validateGameState(state);
      expect(issues).toEqual([]);

      // Resolve any queued events with the first choice to keep the loop moving.
      while ((useGameStore.getState().game!.eventQueue || []).length > 0) {
        const next = useGameStore.getState().game!;
        const evt = next.eventQueue[0];
        const choiceId = evt.choices?.[0]?.id;
        useGameStore.getState().resolveGameEvent(evt.id, choiceId);

        const updated = useGameStore.getState().game!;
        const issuesAfterEvent = validateGameState(updated);
        expect(issuesAfterEvent).toEqual([]);
      }
    }
  });
});
