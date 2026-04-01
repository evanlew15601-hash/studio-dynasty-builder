import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { useGameStore } from '@/game/store';

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
    currentWeek: 10,
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

describe('Streaming Wars: rival collapse triggers consolidation', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 333, rngState: 333 }), 123);
  });

  it('collapses a distressed rival deterministically and transfers subscribers to the strongest remaining rival', () => {
    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 333,
        rngState: 333,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          rivals: [
            {
              id: 'streamflix',
              name: 'StreamFlix',
              subscribers: 40_000_000,
              cash: 2_000_000_000,
              status: 'healthy',
              distressWeeks: 0,
              tierMix: { adSupportedPct: 40, adFreePct: 60 },
              priceIndex: 1.0,
              catalogValue: 70,
              freshness: 60,
            },
            {
              id: 'orchardstream',
              name: 'Orchard Stream',
              subscribers: 8_000_000,
              cash: -300_000_000,
              status: 'distress',
              distressWeeks: 11,
              tierMix: { adSupportedPct: 20, adFreePct: 80 },
              priceIndex: 1.2,
              catalogValue: 55,
              freshness: 40,
            },
          ],
        },
      }),
      123
    );

    const before = useGameStore.getState().game!.platformMarket!.rivals!;
    const beforeBuyerSubs = before.find((r) => r.id === 'streamflix')!.subscribers;

    useGameStore.getState().advanceWeek();

    const after = useGameStore.getState().game!.platformMarket!.rivals!;

    const collapsed = after.find((r) => r.id === 'orchardstream')!;
    const buyer = after.find((r) => r.id === 'streamflix')!;

    expect(collapsed.status).toBe('collapsed');
    expect(collapsed.subscribers).toBe(0);

    // We don't assert exact transfer count (depends on deterministic RNG), just that the buyer gained subs.
    expect(buyer.subscribers).toBeGreaterThan(beforeBuyerSubs);
  });
});
