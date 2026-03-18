import type { PlatformMarketState } from '@/types/platformEconomy';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export const PlatformCatalogSystem: TickSystem = {
  id: 'platformCatalog',
  label: 'Platform catalog (Streaming Wars)',
  dependsOn: ['platformMarketBootstrap'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    if (!market || !Array.isArray(market.rivals)) return state;

    const rivals = market.rivals.map((r) => {
      if (!r) return r;

      const prevFreshness = typeof r.freshness === 'number' ? r.freshness : 55;
      const prevCatalog = typeof r.catalogValue === 'number' ? r.catalogValue : 50;

      // Freshness slowly decays unless catalog value is strong.
      const decay = 1 + ctx.rng.nextFloat(0, 0.5);
      const support = prevCatalog * 0.02;
      const nextFreshness = clamp(prevFreshness - decay + support, 0, 100);

      // Catalog value is a slow-moving proxy in v0.
      const nextCatalog = clamp(prevCatalog + ctx.rng.nextFloat(-0.5, 0.5), 0, 100);

      return {
        ...r,
        freshness: nextFreshness,
        catalogValue: nextCatalog,
      };
    });

    return {
      ...state,
      platformMarket: {
        ...market,
        rivals,
        lastUpdatedWeek: ctx.week,
        lastUpdatedYear: ctx.year,
      },
    };
  },
};
