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
import { absWeek, effectiveArrivalAbs } from './platformRecency';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(clamp(n, min, max));
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

type OriginalPhase = 'development' | 'production' | 'post-production';

const ORIGINAL_PHASE_WEEKS: Record<OriginalPhase, number> = {
  development: 8,
  production: 12,
  'post-production': 6,
};

function normalizeOriginalPhase(project: Project): OriginalPhase | null {
  const phase = project.currentPhase;
  if (phase === 'development' || phase === 'production' || phase === 'post-production') return phase;

  const status = project.status;
  if (status === 'development' || status === 'production' || status === 'post-production') return status;

  return null;
}

function estimateOriginalWeeklySpend(project: Project): number {
  const totalBudget = Math.max(0, Math.floor(project.budget?.total ?? 0));

  const phase = normalizeOriginalPhase(project);
  if (!phase) return 0;

  // A rough approximation of cash burn by phase.
  const phaseWeights: Record<OriginalPhase, number> = {
    development: 0.15,
    production: 0.65,
    'post-production': 0.2,
  };

  const duration = ORIGINAL_PHASE_WEEKS[phase];
  const perWeek = duration > 0 ? (totalBudget * phaseWeights[phase]) / duration : 0;

  // Keep a small floor so even low-budget Originals have meaningful burn.
  return clampInt(perWeek, 250_000, 15_000_000);
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

    const directId = directPlatformId(project);

    if (directId === platformId) {
      const relWeek = project.releaseWeek;
      const relYear = project.releaseYear;
      const relAbs =
        typeof relWeek === 'number' && typeof relYear === 'number' ? absWeek(relWeek, relYear) : currentAbs;

      const arrivalAbs = effectiveArrivalAbs(project, relAbs, currentAbs);
      if (arrivalAbs > currentAbs) continue;
      if (arrivalAbs < minAbs) continue;

      const exclusiveFlag = project.releaseStrategy?.streamingExclusive;
      const contractExclusive = (project as any)?.streamingContract?.exclusivityClause;
      const isExclusive = exclusiveFlag !== false && contractExclusive !== false;
      factors.push(isExclusive ? 1.0 : 0.6);
      continue;
    }

    const post = project.postTheatricalReleases ?? [];

    const postArrivals = post
      .filter((r) => r && r.platform === 'streaming')
      .filter((r) => (r.platformId || r.providerId) === platformId)
      .map((r) => {
        if (typeof r.releaseWeek === 'number' && typeof r.releaseYear === 'number') {
          return absWeek(r.releaseWeek, r.releaseYear);
        }

        if (
          typeof r.delayWeeks === 'number' &&
          typeof project.releaseWeek === 'number' &&
          typeof project.releaseYear === 'number'
        ) {
          return absWeek(project.releaseWeek, project.releaseYear) + Math.max(0, Math.floor(r.delayWeeks));
        }

        if (r.status === 'active' || r.status === 'declining' || (r.status === 'ended' && platformId.startsWith('player-platform:'))) {
          return currentAbs;
        }

        return null;
      })
      .filter((x): x is number => typeof x === 'number');

    const latestArrivalAbs = postArrivals.length > 0 ? Math.max(...postArrivals) : null;

    if (latestArrivalAbs != null) {
      if (latestArrivalAbs > currentAbs) continue;
      if (latestArrivalAbs < minAbs) continue;
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
  serviceQuality?: number;
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
  const serviceQuality = typeof input.serviceQuality === 'number' ? clamp(input.serviceQuality, 0, 100) : 55;

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

  const serviceMod = clamp(1.0 + (55 - serviceQuality) / 120, 0.75, 1.35);

  const churnRate = clamp(baseChurnWeekly * freshnessMod * catalogMod * priceMod * adLoadMod * serviceMod, 0.002, 0.06);
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

function stepServiceQuality(params: {
  prev: number | undefined;
  profit: number;
  cash: number;
  rng: () => number;
}): number {
  const prev = typeof params.prev === 'number' ? clamp(params.prev, 0, 100) : 55;
  const profit = params.profit;
  const cash = params.cash;

  const runwayPenalty = cash < -350_000_000 ? -0.45 : cash < -150_000_000 ? -0.25 : cash > 250_000_000 ? 0.08 : 0;
  const profitDrift = profit >= 0 ? 0.12 : -0.22;
  const drift = runwayPenalty + profitDrift;

  let noise = params.rng() * 0.25 - 0.125;

  // If you're already at very high reliability and fundamentals are improving,
  // don't let random noise pull you down from the ceiling.
  if (prev >= 99 && drift >= 0) {
    noise = Math.max(0, noise);
  }

  return clamp(Math.round(prev + drift + noise), 0, 100);
}

function stepRivalStrategy(r: RivalPlatformState, rng: () => number): RivalPlatformState {
  const freshness = typeof r.freshness === 'number' ? clamp(r.freshness, 0, 100) : 55;
  const catalogValue = typeof r.catalogValue === 'number' ? clamp(r.catalogValue, 0, 100) : 50;
  const cash = typeof r.cash === 'number' ? r.cash : 0;

  const prevPriceIndex = typeof r.priceIndex === 'number' ? clamp(r.priceIndex, 0.7, 1.5) : 1;
  const prevPromo = typeof r.promotionBudgetPerWeek === 'number' ? Math.max(0, r.promotionBudgetPerWeek) : 0;
  const prevAdLoad = typeof r.adLoadIndex === 'number' ? clamp(r.adLoadIndex, 0, 100) : 55;

  let targetPriceIndex = 1.0;
  if (freshness < 42) targetPriceIndex = 0.9;
  else if (freshness > 70 && catalogValue > 60) targetPriceIndex = 1.05;

  if (cash < -250_000_000) targetPriceIndex += 0.05;
  if (cash > 1_000_000_000) targetPriceIndex -= 0.02;

  const priceStep = clamp(targetPriceIndex - prevPriceIndex, -0.03, 0.03);
  const nextPriceIndex = clamp(prevPriceIndex + priceStep, 0.7, 1.5);

  const freshnessPressure = Math.max(0, 50 - freshness);
  const catalogPressure = Math.max(0, 45 - catalogValue);

  let targetPromo = Math.floor(5_000_000 + freshnessPressure * 450_000 + catalogPressure * 250_000);
  if (cash < -350_000_000) targetPromo = Math.floor(targetPromo * 0.55);
  if (cash > 1_500_000_000) targetPromo = Math.floor(targetPromo * 1.25);

  targetPromo = Math.max(0, Math.min(40_000_000, targetPromo));

  const nextPromo = Math.floor(prevPromo * 0.65 + targetPromo * 0.35);

  let targetAdLoad = 55;
  if (cash < -250_000_000) targetAdLoad = 72;
  else if (cash < 0) targetAdLoad = 64;
  else if (cash > 1_000_000_000 && freshness > 65) targetAdLoad = 50;

  const adStep = clamp(targetAdLoad - prevAdLoad, -4, 4);
  const nextAdLoad = clamp(prevAdLoad + adStep + (rng() - 0.5) * 1.2, 0, 100);

  return {
    ...r,
    priceIndex: nextPriceIndex,
    promotionBudgetPerWeek: nextPromo,
    adLoadIndex: nextAdLoad,
  };
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

      const rngFloat = () => ctx.rng.nextFloat(0.65, 1.35);

      const strategized = stepRivalStrategy(r, () => ctx.rng.nextFloat(0, 1));

      const subs = typeof strategized.subscribers === 'number' ? strategized.subscribers : 0;
      const cash = typeof strategized.cash === 'number' ? strategized.cash : 0;

      const freshness = typeof strategized.freshness === 'number' ? clamp(strategized.freshness, 0, 100) : 55;
      const catalogValue = typeof strategized.catalogValue === 'number' ? clamp(strategized.catalogValue, 0, 100) : 50;
      const priceIndex = typeof strategized.priceIndex === 'number' ? strategized.priceIndex : 1;

      const step = stepPlatform({
        subscribers: subs,
        cash,
        freshness,
        catalogValue,
        priceIndex,
        tierMix: strategized.tierMix,
        promotionBudgetPerWeek: strategized.promotionBudgetPerWeek,
        adLoadIndex: strategized.adLoadIndex,
        serviceQuality: strategized.serviceQuality,
        fixedOpsCost: 20_000_000,
        rngFloat,
      });

      rivalKpis.push({ id: strategized.id, status: strategized.status, kpis: step.kpis });

      const nextServiceQuality = stepServiceQuality({
        prev: strategized.serviceQuality,
        profit: step.kpis.profit,
        cash: step.nextCash,
        rng: () => ctx.rng.nextFloat(0, 1),
      });

      return {
        ...strategized,
        subscribers: step.nextSubs,
        cash: step.nextCash,
        serviceQuality: nextServiceQuality,
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
      const serviceQuality = typeof playerIn.serviceQuality === 'number' ? clamp(playerIn.serviceQuality, 0, 100) : 55;
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
      ) as Project[];

      const contentSpendPerWeek = originalsInPipeline.reduce((acc, p) => acc + estimateOriginalWeeklySpend(p), 0);

      const step = stepPlatform({
        subscribers: subs,
        cash,
        freshness,
        catalogValue,
        priceIndex,
        tierMix: playerIn.tierMix,
        promotionBudgetPerWeek,
        adLoadIndex: typeof playerIn.adLoadIndex === 'number' ? playerIn.adLoadIndex : 55,
        serviceQuality,
        fixedOpsCost: 25_000_000,
        extraCost: contentSpendPerWeek,
        rngFloat: () => ctx.rng.nextFloat(0.7, 1.3),
        baseAcquired,
      });

      const nextServiceQuality = stepServiceQuality({
        prev: serviceQuality,
        profit: step.kpis.profit,
        cash: step.nextCash,
        rng: () => ctx.rng.nextFloat(0, 1),
      });

      playerOut = {
        ...playerIn,
        subscribers: step.nextSubs,
        cash: step.nextCash,
        monthlyPrice,
        contentSpendPerWeek,
        serviceQuality: nextServiceQuality,
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

    
