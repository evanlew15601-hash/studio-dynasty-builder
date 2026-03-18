import type {
  PlatformMarketState,
  PlatformWeekKpis,
  RivalPlatformState,
} from '@/types/platformEconomy';
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

function normalizeTierMix(tierMix: any): { adSupportedShare: number; adFreeShare: number } {
  const adSupportedPct = typeof tierMix?.adSupportedPct === 'number' ? tierMix.adSupportedPct : 50;
  const adFreePct = typeof tierMix?.adFreePct === 'number' ? tierMix.adFreePct : 50;
  const normTotal = adSupportedPct + adFreePct;
  return {
    adSupportedShare: normTotal > 0 ? adSupportedPct / normTotal : 0.5,
    adFreeShare: normTotal > 0 ? adFreePct / normTotal : 0.5,
  };
}

function computePlatformStep(params: {
  subs: number;
  cash: number;
  freshness: number;
  catalogValue: number;
  priceIndex: number;
  promotionBudgetPerWeek: number;
  tierMix: any;
  fixedOps: number;
  variableOpsPerSub: number;
  extraCost: number;
  /** Baseline acquisition (new signups) that does not depend on current subs. */
  baseAcquired: number;
  rngFloat: number;
}): { nextSubs: number; nextCash: number; kpis: PlatformWeekKpis } {
  const {
    subs,
    cash,
    freshness,
    catalogValue,
    priceIndex,
    promotionBudgetPerWeek,
    tierMix,
    fixedOps,
    variableOpsPerSub,
    extraCost,
    baseAcquired,
    rngFloat,
  } = params;

  // Base churn ~4% monthly => ~1% weekly (roughly).
  const baseChurnWeekly = 0.010;

  const freshnessMod = clamp(1.25 - freshness / 100, 0.5, 1.7);
  const catalogMod = clamp(1.15 - catalogValue / 140, 0.7, 1.25);
  const priceMod = clamp(priceIndex, 0.75, 1.5);

  const promoEffect = clamp(promotionBudgetPerWeek / 25_000_000, 0, 1.2);

  const churnRate = clamp(baseChurnWeekly * freshnessMod * catalogMod * priceMod * (1 - promoEffect * 0.25), 0.002, 0.06);
  const churned = Math.floor(subs * churnRate);

  // Acquisition rate scales with freshness and promotion, constrained by diminishing returns.
  const acquisitionRate = clamp(0.0035 + freshness / 35_000 + promoEffect * 0.003, 0.001, 0.03);

  // Important: acquisition must be possible from 0 subs (launch period).
  const acquired = Math.floor((subs * acquisitionRate + Math.max(0, baseAcquired)) * rngFloat);

  const nextSubs = Math.max(0, subs - churned + acquired);

  const { adSupportedShare, adFreeShare } = normalizeTierMix(tierMix);

  // Weekly ARPU proxy: scaled by priceIndex (higher price => more ARPU, but also more churn).
  const arpuWeeklyBase = adSupportedShare * 1.2 + adFreeShare * 2.2;
  const arpuWeekly = arpuWeeklyBase * clamp(priceIndex, 0.7, 1.6);
  const revenue = nextSubs * arpuWeekly;

  const opsCost = fixedOps + nextSubs * variableOpsPerSub + promotionBudgetPerWeek + extraCost;
  const profit = revenue - opsCost;
  const nextCash = cash + profit;

  return {
    nextSubs,
    nextCash,
    kpis: {
      subscribers: nextSubs,
      netAdds: nextSubs - subs,
      churnRate,
      revenue,
      opsCost,
      profit,
      cash: nextCash,
    },
  };
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

    const rivalsKpis: Record<string, PlatformWeekKpis> = {};

    const nextRivals = market.rivals.map((r) => {
      if (!r) return r;
      if (r.status === 'collapsed') {
        rivalsKpis[r.id] = {
          subscribers: 0,
          netAdds: 0,
          churnRate: 0,
          revenue: 0,
          opsCost: 0,
          profit: 0,
          cash: typeof r.cash === 'number' ? r.cash : 0,
        };
        return r;
      }

      const subs = typeof r.subscribers === 'number' ? r.subscribers : 0;
      const cash = typeof r.cash === 'number' ? r.cash : 0;

      const freshness = typeof r.freshness === 'number' ? clamp(r.freshness, 0, 100) : 55;
      const catalogValue = typeof r.catalogValue === 'number' ? clamp(r.catalogValue, 0, 100) : 50;
      const priceIndex = typeof r.priceIndex === 'number' ? r.priceIndex : 1;

      const { nextSubs, nextCash, kpis } = computePlatformStep({
        subs,
        cash,
        freshness,
        catalogValue,
        priceIndex,
        promotionBudgetPerWeek: 0,
        tierMix: r.tierMix,
        fixedOps: 22_000_000,
        variableOpsPerSub: 0.07,
        extraCost: 0,
        baseAcquired: 0,
        rngFloat: ctx.rng.nextFloat(0.7, 1.3),
      });

      rivalsKpis[r.id] = kpis;

      return {
        ...r,
        subscribers: nextSubs,
        cash: nextCash,
      };
    });

    const player = market.player;

    const nextPlayerResult = (() => {
      if (!player || player.status !== 'active') return { player, kpis: undefined as PlatformWeekKpis | undefined, studioBudgetDelta: 0 };

      const subs = typeof player.subscribers === 'number' ? player.subscribers : 0;
      const cash = typeof player.cash === 'number' ? player.cash : 0;

      const freshness = typeof player.freshness === 'number' ? clamp(player.freshness, 0, 100) : 40;
      const catalogValue = typeof player.catalogValue === 'number' ? clamp(player.catalogValue, 0, 100) : 35;
      const priceIndex = typeof player.priceIndex === 'number' ? player.priceIndex : 1;
      const promotionBudgetPerWeek = typeof player.promotionBudgetPerWeek === 'number' ? player.promotionBudgetPerWeek : 0;

      const originalsInPipeline = (state.projects || []).filter(
        (p) => (p as any)?.streamingContract?.platformId === player.id && (p as any)?.status !== 'released'
      ).length;

      const contentSpendPerWeek = originalsInPipeline * 2_500_000;

      const promoEffect = clamp(promotionBudgetPerWeek / 25_000_000, 0, 1.2);
      const baseAcquired = Math.floor(15_000 + freshness * 400 + promoEffect * 80_000);

      const { nextSubs, nextCash, kpis } = computePlatformStep({
        subs,
        cash,
        freshness,
        catalogValue,
        priceIndex,
        promotionBudgetPerWeek,
        tierMix: player.tierMix,
        fixedOps: 28_000_000,
        variableOpsPerSub: 0.09,
        extraCost: contentSpendPerWeek,
        baseAcquired,
        rngFloat: ctx.rng.nextFloat(0.65, 1.35),
      });

      // Integrate platform profit/loss into studio budget (consolidated cash flow).
      const studioBudgetDelta = kpis.profit;

      return {
        player: {
          ...player,
          subscribers: nextSubs,
          cash: nextCash,
          contentSpendPerWeek,
        },
        kpis,
        studioBudgetDelta,
      };
    })();

    // Clamp total subscribers to market headroom (keep deterministic).
    let rivalsOut = nextRivals as RivalPlatformState[];
    let playerOut = nextPlayerResult.player;

    if (totalAddressableSubs > 0) {
      const playerSubs = playerOut && playerOut.status === 'active' ? (playerOut.subscribers ?? 0) : 0;
      const totalSubs = playerSubs + sumSubs(rivalsOut);

      if (totalSubs > totalAddressableSubs && totalSubs > 0) {
        const scale = totalAddressableSubs / totalSubs;

        if (playerOut && playerOut.status === 'active') {
          playerOut = {
            ...playerOut,
            subscribers: clampInt((playerOut.subscribers ?? 0) * scale, 0, totalAddressableSubs),
          };
        }

        rivalsOut = rivalsOut.map((r) => {
          if (!r || r.status === 'collapsed') return r;
          return {
            ...r,
            subscribers: clampInt(r.subscribers * scale, 0, totalAddressableSubs),
          };
        });
      }
    }

    const nextStudio = (() => {
      if (!nextPlayerResult.kpis) return state.studio;
      return {
        ...state.studio,
        budget: (state.studio.budget ?? 0) + nextPlayerResult.studioBudgetDelta,
      };
    })();

    return {
      ...state,
      studio: nextStudio,
      platformMarket: {
        ...market,
        player: playerOut,
        rivals: rivalsOut,
        lastWeek: {
          player: nextPlayerResult.kpis,
          rivals: rivalsKpis,
        },
        lastUpdatedWeek: ctx.week,
        lastUpdatedYear: ctx.year,
      },
    };
  },
};
