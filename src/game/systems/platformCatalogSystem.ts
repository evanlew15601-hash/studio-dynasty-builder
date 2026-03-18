import type { PlatformMarketState } from '@/types/platformEconomy';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function stepFreshnessCatalog(params: {
  prevFreshness: number;
  prevCatalog: number;
  jitter: number;
}): { freshness: number; catalogValue: number } {
  const { prevFreshness, prevCatalog, jitter } = params;

  // Freshness slowly decays unless catalog value is strong.
  const decay = 1 + jitter * 0.5;
  const support = prevCatalog * 0.02;
  const freshness = clamp(prevFreshness - decay + support, 0, 100);

  // Catalog value is a slow-moving proxy in v0.
  const catalogValue = clamp(prevCatalog + (jitter - 0.5), 0, 100);

  return { freshness, catalogValue };
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
      if (!r || r.status === 'collapsed') return r;

      const prevFreshness = typeof r.freshness === 'number' ? r.freshness : 55;
      const prevCatalog = typeof r.catalogValue === 'number' ? r.catalogValue : 50;
      const jitter = ctx.rng.nextFloat(0, 1);

      const next = stepFreshnessCatalog({ prevFreshness, prevCatalog, jitter });

      return {
        ...r,
        freshness: next.freshness,
        catalogValue: next.catalogValue,
      };
    });

    const player = market.player
      ? {
          ...market.player,
          ...stepFreshnessCatalog({
            prevFreshness: typeof market.player.freshness === 'number' ? market.player.freshness : 50,
            prevCatalog: typeof market.player.catalogValue === 'number' ? market.player.catalogValue : 35,
            jitter: ctx.rng.nextFloat(0, 1),
          }),
        }
      : undefined;

    return {
      ...state,
      platformMarket: {
        ...market,
        player,
        rivals,
        lastUpdatedWeek: ctx.week,
        lastUpdatedYear: ctx.year,
      },
    };
  },
};
