import type { PlatformMarketState, RivalPlatformState } from '@/types/platformEconomy';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(clamp(n, min, max));
}

function sumSubs(rivals: RivalPlatformState[]): number {
  return rivals.reduce((acc, r) => acc + (typeof r.subscribers === 'number' ? r.subscribers : 0), 0);
}

export const PlatformEconomySystem: TickSystem = {
  id: 'platformEconomy',
  label: 'Platform economy (Streaming Wars)',
  dependsOn: ['platformCatalog'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    if (!market || !Array.isArray(market.rivals)) return state;

    const totalAddressableSubs = typeof market.totalAddressableSubs === 'number' ? market.totalAddressableSubs : 0;

    const nextRivals = market.rivals.map((r) => {
      if (!r) return r;
      if (r.status === 'collapsed') return r;

      const subs = typeof r.subscribers === 'number' ? r.subscribers : 0;
      const cash = typeof r.cash === 'number' ? r.cash : 0;

      const freshness = typeof r.freshness === 'number' ? clamp(r.freshness, 0, 100) : 55;
      const priceIndex = typeof r.priceIndex === 'number' ? r.priceIndex : 1;

      // Very simple churn/acquisition model.
      // Base churn ~4% monthly => ~1% weekly (roughly).
      const baseChurnWeekly = 0.010;
      const freshnessMod = clamp(1.25 - freshness / 100, 0.5, 1.6); // lower freshness => higher churn
      const priceMod = clamp(priceIndex, 0.7, 1.4); // higher priceIndex => higher churn

      const churnRate = clamp(baseChurnWeekly * freshnessMod * priceMod, 0.002, 0.05);
      const churned = Math.floor(subs * churnRate);

      // Acquisition scales with freshness and spend proxy (cash), with diminishing returns.
      const acquisitionRate = clamp(0.004 + freshness / 50_000, 0.001, 0.02);
      const acquired = Math.floor(subs * acquisitionRate * ctx.rng.nextFloat(0.7, 1.3));

      const nextSubs = Math.max(0, subs - churned + acquired);

      // Revenue/expense proxy: ARPU based on tier mix and price index.
      const tierMix = r.tierMix;
      const adSupportedPct = typeof tierMix?.adSupportedPct === 'number' ? tierMix.adSupportedPct : 50;
      const adFreePct = typeof tierMix?.adFreePct === 'number' ? tierMix.adFreePct : 50;
      const normTotal = adSupportedPct + adFreePct;
      const adSupportedShare = normTotal > 0 ? adSupportedPct / normTotal : 0.5;
      const adFreeShare = normTotal > 0 ? adFreePct / normTotal : 0.5;

      const arpuWeekly = (adSupportedShare * 1.2 + adFreeShare * 2.2) * (1 / clamp(priceIndex, 0.6, 1.6));
      const revenue = nextSubs * arpuWeekly;

      const opsCost = 20_000_000 + nextSubs * 0.05; // fixed + variable
      const nextCash = cash + revenue - opsCost;

      return {
        ...r,
        subscribers: nextSubs,
        cash: nextCash,
      };
    });

    // Clamp total rival subscribers to market headroom (keep deterministic).
    let rivalsOut = nextRivals as RivalPlatformState[];

    if (totalAddressableSubs > 0) {
      const totalRivalSubs = sumSubs(rivalsOut);
      if (totalRivalSubs > totalAddressableSubs) {
        const scale = totalAddressableSubs / totalRivalSubs;
        rivalsOut = rivalsOut.map((r) => {
          if (!r || r.status === 'collapsed') return r;
          return {
            ...r,
            subscribers: clampInt(r.subscribers * scale, 0, totalAddressableSubs),
          };
        });
      }
    }

    return {
      ...state,
      platformMarket: {
        ...market,
        rivals: rivalsOut,
        lastUpdatedWeek: ctx.week,
        lastUpdatedYear: ctx.year,
      },
    };
  },
};
