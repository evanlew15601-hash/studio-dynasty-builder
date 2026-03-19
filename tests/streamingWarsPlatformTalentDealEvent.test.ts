import { beforeEach, describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import { useGameStore } from '@/game/store';
import { stableInt } from '@/utils/stableRandom';

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
    currentWeek: 19,
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

describe('Streaming Wars: overall deal / talent poaching event', () => {
  beforeEach(() => {
    useGameStore.getState().initGame(makeBaseState({ universeSeed: 444, rngState: 444 }), 123);
  });

  it('enqueues a deterministic overall-deal event during the seeded offer week', () => {
    const offerWeek = stableInt(`444|platform:talent-offer-week|2027|player-platform:studio-1`, 16, 24);

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 444,
        rngState: 444,
        currentWeek: offerWeek - 1,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 5_000_000,
            cash: 100_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 55,
            catalogValue: 45,
            distressWeeks: 0,
            originalsQualityBonus: 0,
          },
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
          ],
        },
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const state = useGameStore.getState().game!;
    expect(state.currentWeek).toBe(offerWeek);

    expect(state.eventQueue.length).toBe(1);
    expect((state.eventQueue[0] as any)?.data?.kind).toBe('platform:overall-deal');
  });

  it('matching the overall deal increases Originals quality bonus (and spends budget via consequences)', () => {
    const offerWeek = stableInt(`445|platform:talent-offer-week|2027|player-platform:studio-1`, 16, 24);

    useGameStore.getState().initGame(
      makeBaseState({
        dlc: { streamingWars: true },
        universeSeed: 445,
        rngState: 445,
        currentWeek: offerWeek - 1,
        platformMarket: {
          totalAddressableSubs: 100_000_000,
          player: {
            id: 'player-platform:studio-1',
            name: 'TestFlix',
            launchedWeek: 1,
            launchedYear: 2026,
            subscribers: 5_000_000,
            cash: 100_000_000,
            status: 'active',
            tierMix: { adSupportedPct: 60, adFreePct: 40 },
            promotionBudgetPerWeek: 0,
            priceIndex: 1.0,
            freshness: 55,
            catalogValue: 45,
            distressWeeks: 0,
            originalsQualityBonus: 0,
          },
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
          ],
        },
      }),
      123
    );

    useGameStore.getState().advanceWeek();

    const withEvent = useGameStore.getState().game!;
    const event = withEvent.eventQueue[0];
    expect((event as any)?.data?.kind).toBe('platform:overall-deal');

    const cost = (event as any)?.data?.matchCost ?? 0;
    const beforeBonus = withEvent.platformMarket!.player!.originalsQualityBonus ?? 0;
    const budgetAtEvent = withEvent.studio.budget;

    useGameStore.getState().resolveGameEvent(event.id, 'match');

    const after = useGameStore.getState().game!;
    expect(after.eventQueue.length).toBe(0);
    expect(after.studio.budget).toBe(budgetAtEvent - cost);
    expect(after.platformMarket!.player!.originalsQualityBonus).toBeGreaterThan(beforeBonus);
  });
});
