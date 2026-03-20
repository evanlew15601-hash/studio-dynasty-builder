import type { PlatformMarketState } from '@/types/platformEconomy';
import type { GameEvent } from '@/types/game';
import { stableInt } from '@/utils/stableRandom';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function triggerDateFromWeekYear(year: number, week: number): Date {
  return new Date(Date.UTC(year, 0, 1 + Math.max(0, week - 1) * 7));
}

export const PlatformMnaOffersSystem: TickSystem = {
  id: 'platformMnaOffers',
  label: 'Platform M&A offers (Streaming Wars)',
  dependsOn: ['platformCrisis'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;
    if ((state.eventQueue || []).length > 0) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    const player = market?.player;
    const rivals = market?.rivals || [];

    if (!market || !player || player.status !== 'active' || rivals.length === 0) return state;

    const offerWeek = stableInt(`${state.universeSeed || 'seed'}|platform:mna-offer-week|${ctx.year}|${player.id}`, 34, 46);
    if (ctx.week !== offerWeek) return state;
    if (player.lastMnaOfferYear === ctx.year) return state;

    const distressed = rivals
      .filter((r) => r && r.status === 'distress')
      .filter((r) => (r.distressWeeks ?? 0) >= 6)
      .sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0));

    const target = distressed[0];
    if (!target) return state;

    const transferRate = ctx.rng.nextFloat(0.6, 0.85);
    const transferredSubs = Math.floor((target.subscribers ?? 0) * transferRate);

    const transferredCatalog = clamp((target.catalogValue ?? 50) * ctx.rng.nextFloat(0.55, 0.8), 0, 100);

    // Deep discount vs a healthy acquisition, but still meaningful.
    const basePrice = Math.floor((target.subscribers ?? 0) * 14 + (target.catalogValue ?? 50) * 1_100_000);
    const salePrice = Math.max(60_000_000, Math.floor(basePrice * ctx.rng.nextFloat(0.55, 0.8)));

    ctx.recap.push({
      type: 'market',
      title: 'M&A opportunity',
      body: `${target.name} is distressed. You can buy at a discount — or pass and stay independent.`,
      severity: 'info',
    });

    const event: GameEvent = {
      id: `platform:mna-offer:${ctx.year}:W${ctx.week}:${player.id}:${target.id}`,
      title: 'M&A offer: distressed platform buyout',
      description: `${target.name} is in distress. Their board is open to a discounted buyout.\n\nIf you buy, you can absorb ~${Math.round(
        transferRate * 100
      )}% of their subscriber base and strengthen your catalog.\n\nThis is expensive and will be judged harshly by press and regulators.`,
      type: 'opportunity',
      triggerDate: triggerDateFromWeekYear(ctx.year, ctx.week),
      data: {
        kind: 'platform:mna-offer',
        targetId: target.id,
        targetName: target.name,
        salePrice,
        transferredSubs,
        transferredCatalog,
      },
      choices: [
        {
          id: 'buy',
          text: `Acquire ${target.name} (${Math.round(salePrice / 1_000_000)}M)`,
          requirements: [
            {
              type: 'budget',
              threshold: salePrice,
              description: `Requires ${Math.round(salePrice / 1_000_000)}M budget for the acquisition`,
            },
          ],
          consequences: [
            {
              type: 'budget',
              impact: -salePrice,
              description: `-${Math.round(salePrice / 1_000_000)}M acquisition cost`,
            },
            {
              type: 'reputation',
              impact: -2,
              description: '-2 studio reputation (consolidation optics)',
            },
          ],
        },
        {
          id: 'pass',
          text: 'Pass (stay independent)',
          consequences: [
            {
              type: 'reputation',
              impact: 1,
              description: '+1 studio reputation (anti-consolidation stance)',
            },
          ],
        },
      ],
    };

    return {
      ...state,
      platformMarket: {
        ...market,
        player: {
          ...player,
          lastMnaOfferYear: ctx.year,
        },
      },
      eventQueue: [...(state.eventQueue || []), event],
    };
  },
};
