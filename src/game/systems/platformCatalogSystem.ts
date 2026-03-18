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

    const player = market.player;
    const nextPlayer = (() => {
      if (!player || player.status !== 'active') return player;

      const playerId = player.id;
      const absNow = ctx.year * 52 + ctx.week;

      const titlesOnPlatform = (state.projects || [])
        .filter((p) => (p as any)?.status === 'released')
        .filter((p) => {
          const distId = p.distributionStrategy?.primary?.platformId;
          const releaseId = p.releaseStrategy?.streamingPlatformId;
          const contractId = (p as any)?.streamingContract?.platformId;

          if (distId === playerId || releaseId === playerId || contractId === playerId) return true;

          const eligiblePost = (p.postTheatricalReleases || []).some((r) => {
            if (r.platformId !== playerId) return false;
            if (r.status === 'ended') return false;
            if (typeof r.releaseWeek !== 'number' || typeof r.releaseYear !== 'number') return true;
            return r.releaseYear * 52 + r.releaseWeek <= absNow;
          });

          return eligiblePost;
        });

      const totalTitles = titlesOnPlatform.length;
      const recentTitles = titlesOnPlatform.filter((p) => {
        const wk = typeof p.releaseWeek === 'number' ? p.releaseWeek : null;
        const yr = typeof p.releaseYear === 'number' ? p.releaseYear : null;
        if (!wk || !yr) return false;
        const abs = yr * 52 + wk;
        return absNow - abs <= 52;
      }).length;

      const newThisWeek = titlesOnPlatform.filter(
        (p) => p.releaseWeek === ctx.week && p.releaseYear === ctx.year
      ).length;

      const prevFreshness = typeof player.freshness === 'number' ? player.freshness : 45;
      const prevCatalog = typeof player.catalogValue === 'number' ? player.catalogValue : 35;

      const freshnessInjection = newThisWeek * 14 + recentTitles * 0.35;
      const decay = 1.2;
      const nextFreshness = clamp(prevFreshness - decay + freshnessInjection, 0, 100);

      const scoreSum = titlesOnPlatform.reduce((sum, p) => sum + (p.metrics?.criticsScore ?? 60), 0);
      const avgScore = totalTitles > 0 ? scoreSum / totalTitles : 60;
      const catalogBase = totalTitles * 2.8 + avgScore * 0.35;
      const nextCatalog = clamp(prevCatalog * 0.95 + catalogBase * 0.05, 0, 100);

      return {
        ...player,
        freshness: nextFreshness,
        catalogValue: nextCatalog,
      };
    })();

    return {
      ...state,
      platformMarket: {
        ...market,
        player: nextPlayer,
        rivals,
        lastUpdatedWeek: ctx.week,
        lastUpdatedYear: ctx.year,
      },
    };
  },
};
