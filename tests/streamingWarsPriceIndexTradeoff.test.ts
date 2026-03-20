import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types/game';
import type { TickContext } from '@/game/core/types';
import { createRng } from '@/game/core/rng';
import { PlatformEconomySystem } from '@/game/systems/platformEconomySystem';

function makeCtx(seed: number, week: number, year: number): TickContext {
  return {
    rng: createRng(seed),
    week,
    year,
    quarter: Math.max(1, Math.min(4, Math.ceil(week / 13))),
    recap: [],
    debug: false,
    prevState: {} as any,
  };
}

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 70,
      budget: 500_000_000,
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

describe('Streaming Wars: price index tradeoff', () => {
  it('higher price index increases revenue but worsens churn', () => {
    const base = makeBaseState({
      dlc: { streamingWars: true },
      platformMarket: {
        totalAddressableSubs: 100_000_000,
        player: {
          id: 'player-platform:studio-1',
          name: 'TestFlix',
          launchedWeek: 1,
          launchedYear: 2026,
          subscribers: 5_000_000,
          cash: 0,
          status: 'active',
          tierMix: { adSupportedPct: 50, adFreePct: 50 },
          promotionBudgetPerWeek: 0,
          priceIndex: 1.0,
          adLoadIndex: 55,
          freshness: 80,
          catalogValue: 80,
        },
        rivals: [],
      },
    });

    const cheap = PlatformEconomySystem.onTick(
      {
        ...base,
        platformMarket: {
          ...(base.platformMarket as any),
          player: {
            ...(base.platformMarket as any).player,
            priceIndex: 0.8,
          },
        },
      } as any,
      makeCtx(5150, 10, 2027)
    );

    const expensive = PlatformEconomySystem.onTick(
      {
        ...base,
        platformMarket: {
          ...(base.platformMarket as any),
          player: {
            ...(base.platformMarket as any).player,
            priceIndex: 1.2,
          },
        },
      } as any,
      makeCtx(5150, 10, 2027)
    );

    const cheapKpis = cheap.platformMarket!.lastWeek!.player!;
    const expensiveKpis = expensive.platformMarket!.lastWeek!.player!;

    expect(expensiveKpis.revenue).toBeGreaterThan(cheapKpis.revenue);
    expect(expensiveKpis.churnRate).toBeGreaterThan(cheapKpis.churnRate);
  });
});
