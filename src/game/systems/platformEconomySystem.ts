import type {
  PlatformMarketState,
  PlatformWeeklyKpis,
  PlayerPlatformState,
  RivalPlatformState,
} from '@/types/platformEconomy';
import type { Project } from '@/types/game';
import {
  getContractPlatformId,
  getDistributionChannelPlatformId,
  getReleaseStrategyPlatformId,
  getReleaseWindowPlatformId,
} from '@/utils/platformIds';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(clamp(n, min, max));
}

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function directPlatformId(project: Project): string | null {
  return (
    getContractPlatformId(project.streamingContract) ||
    project.streamingPremiereDeal?.providerId ||
    getReleaseStrategyPlatformId(project.releaseStrategy) ||
    getDistributionChannelPlatformId(project.distributionStrategy?.primary) ||
    getReleaseWindowPlatformId(project.distributionStrategy?.windows?.[0]) ||
    null
  );
}

function platformMoatFactor(params: {
  projects: Project[];
  platformId: string;
  week: number;
  year: number;
  lookbackWeeks: number;
}): number {
  const { projects, platformId, week, year, lookbackWeeks } = params;

  const currentAbs = absWeek(week, year);
  const minAbs = currentAbs - Math.max(1, lookbackWeeks);

  const factors: number[] = [];

  for (const project of projects) {
    if (!project || project.status !== 'released') continue;

    const relWeek = project.releaseWeek;
    const relYear = project.releaseYear;

    if (typeof relWeek === 'number' && typeof relYear === 'number') {
      const relAbs = absWeek(relWeek, relYear);
      if (relAbs > currentAbs) continue;
      if (relAbs < minAbs) continue;
    }

    const directId = directPlatformId(project);

    if (directId === platformId) {
      const exclusiveFlag = project.releaseStrategy?.streamingExclusive;
      const contractExclusive = (project as any)?.streamingContract?.exclusivityClause;
      const isExclusive = exclusiveFlag !== false && contractExclusive !== false;
      factors.push(isExclusive ? 1.0 : 0.6);
      continue;
    }

    const post = project.postTheatricalReleases ?? [];
    const hasOnPlatform = post
      .filter((r) => r && r.platform === 'streaming')
      .filter((r) => (r.platformId || r.providerId) === platformId)
      .some((r) => {
        if (typeof r.releaseWeek === 'number' && typeof r.releaseYear === 'number') {
          return absWeek(r.releaseWeek, r.releaseYear) <= currentAbs;
        }
        return r.status === 'active' || r.status === 'declining' || (r.status === 'ended' && platformId.startsWith('player-platform:'));
      });

    if (hasOnPlatform) {
      factors.push(0.35);
    }
  }

  if (factors.length === 0) return 0.8;

  return clamp(factors.reduce((a, b) => a + b, 0) / factors.length, 0.35, 1.0);
}

type PlatformStepInput = {
  subscribers: number;
  cash: number;
  freshness: number;
  catalogValue: number;
  priceIndex: number;
  tierMix?: { adSupportedPct: number; adFreePct: number };
  promotionBudgetPerWeek?: number;
  adLoadIndex?: number;
  fixedOpsCost: number;
  extraCost?: number;
  rngFloat: () => number;
  baseAcquired?: number;
};

function stepPlatform(input: PlatformStepInput): { nextSubs: number; nextCash: number; kpis: PlatformWeeklyKpis } {
  const subs = Math.max(0, Math.floor(input.subscribers || 0));
  const cash = typeof input.cash === 'number' ? input.cash : 0;

  const freshness = clamp(input.freshness, 0, 100);
  const catalogValue = clamp(input.catalogValue, 0, 100);
  const priceIndex = typeof input.priceIndex === 'number' ? input.priceIndex : 1;

  // Base churn ~4% monthly => ~1% weekly (roughly).
  const baseChurnWeekly = 0.010;
  const freshnessMod = clamp(1.35 - freshness / 100, 0.55, 1.9);
  const catalogMod = clamp(1.2 - catalogValue / 180, 0.65, 1.25);
  const priceMod = clamp(priceIndex, 0.7, 1.5);

  const tierMixChurn = input.tierMix;
  const tierAdSupportedPct = typeof tierMixChurn?.adSupportedPct === 'number' ? tierMixChurn.adSupportedPct : 50;
  const tierAdFreePct = typeof tierMixChurn?.adFreePct === 'number' ? tierMixChurn.adFreePct : 50;
  const tierNormTotal = tierAdSupportedPct + tierAdFreePct;
  const adSupportedShareForChurn = tierNormTotal > 0 ? tierAdSupportedPct / tierNormTotal : 0.5;

  const adLoadIndex = typeof input.adLoadIndex === 'number' ? clamp(input.adLoadIndex, 0, 100) : 55;
  const adLoadDelta = (adLoadIndex - 55) / 100;
  const adLoadMod = clamp(1 + adSupportedShareForChurn * adLoadDelta * 0.9, 0.85, 1.35);

  const churnRate = clamp(baseChurnWeekly * freshnessMod * catalogMod * priceMod * adLoadMod, 0.002, 0.06);
  const churned = Math.floor(subs * churnRate);

  // Acquisition scales with freshness and (for player) promotionBudget; allow non-zero growth from 0.
  const acquisitionRate = clamp(0.003 + freshness / 60_000 + catalogValue / 120_000, 0.001, 0.02);
  const baseAcquired = typeof input.baseAcquired === 'number' ? Math.max(0, Math.floor(input.baseAcquired)) : 0;
  const acquired = baseAcquired + Math.floor(subs * acquisitionRate * input.rngFloat());

  const nextSubs = Math.max(0, subs - churned + acquired);

  // Revenue/expense proxy: ARPU based on tier mix and price index.
  const tierMix = input.tierMix;
  const adSupportedPct = typeof tierMix?.adSupportedPct === 'number' ? tierMix.adSupportedPct : 50;
  const adFreePct = typeof tierMix?.adFreePct === 'number' ? tierMix.adFreePct : 50;
  const normTotal = adSupportedPct + adFreePct;
  const adSupportedShare = normTotal > 0 ? adSupportedPct / normTotal : 0.5;
  const adFreeShare = normTotal > 0 ? adFreePct / normTotal : 0.5;

  const adLoadIndexForRevenue = typeof input.adLoadIndex === 'number' ? clamp(input.adLoadIndex, 0, 100) : 55;
  const adLoadFactor = clamp(0.8 + (adLoadIndexForRevenue / 100) * 0.7, 0.8, 1.5);

  const arpuWeekly =
    (adSupportedShare * 1.1 * adLoadFactor + adFreeShare * 2.6) * clamp(priceIndex, 0.6, 1.7);
  const revenue = Math.floor(nextSubs * arpuWeekly);

  const promotion = typeof input.promotionBudgetPerWeek === 'number' ? Math.max(0, input.promotionBudgetPerWeek) : 0;
  const extraCost = typeof input.extraCost === 'number' ? Math.max(0, input.extraCost) : 0;
  const opsCost = Math.floor(input.fixedOpsCost + nextSubs * 0.06);
  const profit = Math.floor(revenue - opsCost - promotion - extraCost);

  const nextCash = cash + profit;

  return {
    nextSubs,
    nextCash,
    kpis: {
      subscribers: nextSubs,
      churnRate,
      churned,
      acquired,
      netAdds: nextSubs - subs,
      revenue,
      opsCost: opsCost + promotion + extraCost,
      profit,
    },
  };
}

function sumActiveSubs(params: { player?: PlayerPlatformState; rivals: RivalPlatformState[] }): number {
  const playerSubs = params.player && params.player.status === 'active' ? params.player.subscribers : 0;
  const rivalSubs = params.rivals.reduce((acc, r) => acc + (r && r.status !== 'collapsed' ? (r.subscribers ?? 0) : 0), 0);
  return (playerSubs ?? 0) + rivalSubs;
}

export const PlatformEconomySystem: TickSystem = {
  id: 'platformEconomy',
  label: 'Platform economy (Streaming Wars)',
  dependsOn: ['platformCatalog'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    if (!market) return state;

    const rivalsIn = Array.isArray(market.rivals) ? market.rivals : [];

    const totalAddressableSubs = typeof market.totalAddressableSubs === 'number' ? market.totalAddressableSubs : 0;

    const rivalKpis: Array<{ id: string; status: RivalPlatformState['status']; kpis: PlatformWeeklyKpis }> = [];

    const nextRivals = rivalsIn.map((r) => {
      if (!r) return r;
      if (r.status === 'collapsed') {
        rivalKpis.push({
          id: r.id,
          status: 'collapsed',
          kpis: {
            subscribers: 0,
            churnRate: 0,
            churned: 0,
            acquired: 0,
            netAdds: 0,
            revenue: 0,
            opsCost: 0,
            profit: 0,
          },
        });
        return r;
      }

      const subs = typeof r.subscribers === 'number' ? r.subscribers : 0;
      const cash = typeof r.cash === 'number' ? r.cash : 0;

      const freshness = typeof r.freshness === 'number' ? clamp(r.freshness, 0, 100) : 55;
      const catalogValue = typeof r.catalogValue === 'number' ? clamp(r.catalogValue, 0, 100) : 50;
      const priceIndex = typeof r.priceIndex === 'number' ? r.priceIndex : 1;

      const step = stepPlatform({
        subscribers: subs,
        cash,
        freshness,
        catalogValue,
        priceIndex,
        tierMix: r.tierMix,
        fixedOpsCost: 20_000_000,
        adLoadIndex: 55,
        rngFloat: () => ctx.rng.nextFloat(0.65, 1.35),
      });

      rivalKpis.push({ id: r.id, status: r.status, kpis: step.kpis });

      return {
        ...r,
        subscribers: step.nextSubs,
        cash: step.nextCash,
      };
    });

    const playerIn = market.player;
    let playerOut = playerIn;
    let playerKpis: PlatformWeeklyKpis | undefined;

    if (playerIn && playerIn.status === 'active') {
      const subs = typeof playerIn.subscribers === 'number' ? playerIn.subscribers : 0;
      const cash = typeof playerIn.cash === 'number' ? playerIn.cash : 0;

      const freshness = typeof playerIn.freshness === 'number' ? clamp(playerIn.freshness, 0, 100) : 55;
      const catalogValue = typeof playerIn.catalogValue === 'number' ? clamp(playerIn.catalogValue, 0, 100) : 45;

      const promotionBudgetPerWeek = typeof playerIn.promotionBudgetPerWeek === 'number' ? playerIn.promotionBudgetPerWeek : 0;
      const priceIndex = typeof playerIn.priceIndex === 'number' ? playerIn.priceIndex : 1;
      const monthlyPrice = Math.round(12.99 * clamp(priceIndex, 0.6, 1.7) * 100) / 100;

      const moat = platformMoatFactor({
        projects: (state.projects ?? []) as Project[],
        platformId: playerIn.id,
        week: ctx.week,
        year: ctx.year,
        lookbackWeeks: 26,
      });

      const baseAcquired = Math.floor(
        (promotionBudgetPerWeek / 1_000_000) *
          (0.65 + freshness / 200) *
          (0.85 + moat * 0.25) *
          900 *
          ctx.rng.nextFloat(0.75, 1.25)
      );

      const originalsInPipeline = (state.projects ?? []).filter(
        (p) => (p as any)?.streamingContract?.platformId === playerIn.id && (p as any)?.status !== 'released'
      ).length;

      const contentSpendPerWeek = originalsInPipeline * 2_500_000;

      const step = stepPlatform({
        subscribers: subs,
        cash,
        freshness,
        catalogValue,
        priceIndex,
        tierMix: playerIn.tierMix,
        promotionBudgetPerWeek,
        adLoadIndex: typeof playerIn.adLoadIndex === 'number' ? playerIn.adLoadIndex : 55,
        fixedOpsCost: 25_000_000,
        extraCost: contentSpendPerWeek,
        rngFloat: () => ctx.rng.nextFloat(0.7, 1.3),
        baseAcquired,
      });

      playerOut = {
        ...playerIn,
        subscribers: step.nextSubs,
        cash: step.nextCash,
        monthlyPrice,
        contentSpendPerWeek,
        distressWeeks: typeof playerIn.distressWeeks === 'number' ? playerIn.distressWeeks : 0,
      };
      playerKpis = step.kpis;
    }

    // Clamp combined subscribers to market headroom.
    let rivalsOut = nextRivals as RivalPlatformState[];

    if (totalAddressableSubs > 0) {
      const total = sumActiveSubs({ player: playerOut, rivals: rivalsOut });
      if (total > totalAddressableSubs) {
        const scale = totalAddressableSubs / total;

        if (playerOut && playerOut.status === 'active') {
          playerOut = {
            ...playerOut,
            subscribers: clampInt(playerOut.subscribers * scale, 0, totalAddressableSubs),
          };
          if (playerKpis) {
            playerKpis = { ...playerKpis, subscribers: playerOut.subscribers };
          }
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

    const budgetDelta = playerKpis?.profit ?? 0;

    return {
      ...state,
      studio: budgetDelta !== 0 ? { ...state.studio, budget: state.studio.budget + budgetDelta } : state.studio,
      platformMarket: {
        ...market,
        player: playerOut,
        rivals: rivalsOut,
        lastWeek: {
          player: playerKpis,
          rivals: rivalKpis,
        },
        lastUpdatedWeek: ctx.week,
        lastUpdatedYear: ctx.year,
      },
    };
  },
};

    
