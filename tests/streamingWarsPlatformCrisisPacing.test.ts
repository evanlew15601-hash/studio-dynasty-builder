import { describe, expect, it } from 'vitest';
import type { GameEvent, GameState } from '@/types/game';
import type { TickSystem } from '@/game/core/types';
import { SystemRegistry } from '@/game/core/registry';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';
import { triggerDateFromWeekYear } from '@/utils/gameTime';
import { PlatformCrisisSystem } from '@/game/systems/platformCrisisSystem';

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
    currentWeek: 25,
    currentQuarter: 2,
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

describe('Streaming Wars: platform crisis pacing', () => {
  it('does not let non-crisis events (queued earlier in the same tick) block platform crisis enqueuing', () => {
    const nonCrisisNoteSystem: TickSystem = {
      id: 'test:nonCrisisMarketNote',
      label: 'Test: enqueue a non-crisis market note',
      dependsOn: ['platformCompetition'],
      onTick: (state, ctx) => {
        const ev: GameEvent = {
          id: 'existing-market-event',
          title: 'FYI: market note',
          description: 'A non-crisis event already in the queue.',
          type: 'market',
          triggerDate: triggerDateFromWeekYear(ctx.year, ctx.week),
          choices: [{ id: 'ok', text: 'Ok', consequences: [] }],
          data: { kind: 'test:market-note' } as any,
        };

        return {
          ...state,
          eventQueue: [...(state.eventQueue || []), ev],
        };
      },
    };

    const registry = new SystemRegistry();
    registry.register(nonCrisisNoteSystem);
    registry.register(PlatformCrisisSystem);

    const initial = makeBaseState({
      dlc: { streamingWars: true },
      universeSeed: 9001,
      rngState: 9001,
      currentWeek: 12,
      eventQueue: [],
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: 'player-platform:studio-1',
          name: 'TestFlix',
          launchedWeek: 1,
          launchedYear: 2026,
          subscribers: 12_000_000,
          cash: -100_000_000,
          status: 'active',
          tierMix: { adSupportedPct: 60, adFreePct: 40 },
          promotionBudgetPerWeek: 0,
          priceIndex: 1.5,
          serviceQuality: 20,
          freshness: 0,
          catalogValue: 0,
          distressWeeks: 0,
        },
        rivals: [],
        lastWeek: {
          player: {
            subscribers: 12_000_000,
            churnRate: 0.03,
            churned: 400_000,
            acquired: 100_000,
            netAdds: -300_000,
            revenue: 150_000_000,
            opsCost: 160_000_000,
            profit: -10_000_000,
          },
          rivals: [],
        },
      } as any,
    });

    const result = advanceWeek(initial, createRng(9001), registry.getOrdered());
    const state = result.nextState;

    // Existing non-crisis event still present.
    expect(state.eventQueue.some((e) => e.id === 'existing-market-event')).toBe(true);

    // Platform crisis event is also enqueued.
    expect(state.eventQueue.some((e: any) => e?.data?.kind === 'platform:churn-spike')).toBe(true);
  });
});
