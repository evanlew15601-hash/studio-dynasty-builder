import type { PlatformMarketState, RivalPlatformState } from '@/types/platformEconomy';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export const PlatformCompetitionAndMAndASystem: TickSystem = {
  id: 'platformCompetition',
  label: 'Platform competition & M&A (Streaming Wars)',
  dependsOn: ['platformEconomy'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    if (!market || !Array.isArray(market.rivals)) return state;

    const DISTRESS_CASH_THRESHOLD = -250_000_000;
    const COLLAPSE_AFTER_WEEKS = 12;

    const rivalsWorking = [...market.rivals];

    const collapsedThisTick: RivalPlatformState[] = [];

    const rivalsAfterStatus = rivalsWorking.map((r) => {
      if (!r) return r;

      if (r.status === 'collapsed') {
        return {
          ...r,
          distressWeeks: 0,
        };
      }

      const cash = typeof r.cash === 'number' ? r.cash : 0;
      const distressWeeks = typeof r.distressWeeks === 'number' ? r.distressWeeks : 0;

      const isDistress = cash < DISTRESS_CASH_THRESHOLD;
      const nextDistressWeeks = isDistress ? distressWeeks + 1 : 0;

      const willCollapse = nextDistressWeeks >= COLLAPSE_AFTER_WEEKS && ctx.rng.chance(0.25);

      const nextStatus: RivalPlatformState['status'] = willCollapse
        ? 'collapsed'
        : isDistress
          ? 'distress'
          : 'healthy';

      const next = {
        ...r,
        status: nextStatus,
        distressWeeks: nextDistressWeeks,
        subscribers: nextStatus === 'collapsed' ? 0 : r.subscribers,
      };

      if (r.status !== 'collapsed' && nextStatus === 'collapsed') {
        collapsedThisTick.push(r);
      }

      return next;
    });

    let rivals = rivalsAfterStatus as RivalPlatformState[];

    // Consolidation: collapsed rivals are acquired by the strongest remaining rival.
    if (collapsedThisTick.length > 0) {
      for (const collapsed of collapsedThisTick) {
        const candidateBuyers = rivals
          .filter((x) => x && x.id !== collapsed.id)
          .filter((x) => x.status !== 'collapsed');

        const buyer = candidateBuyers.sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0))[0];
        if (!buyer) continue;

        const subTransferRate = ctx.rng.nextFloat(0.45, 0.7);
        const catalogTransferRate = ctx.rng.nextFloat(0.45, 0.7);

        const transferredSubs = Math.floor((collapsed.subscribers ?? 0) * subTransferRate);
        const transferredCatalog = (collapsed.catalogValue ?? 50) * catalogTransferRate;

        rivals = rivals.map((r) => {
          if (r.id === buyer.id) {
            return {
              ...r,
              subscribers: (r.subscribers ?? 0) + transferredSubs,
              catalogValue: clamp((r.catalogValue ?? 50) + transferredCatalog * 0.15, 0, 100),
              cash: (r.cash ?? 0) + Math.floor((collapsed.cash ?? 0) * 0.2),
            };
          }

          if (r.id === collapsed.id) {
            return {
              ...r,
              status: 'collapsed',
              subscribers: 0,
              distressWeeks: 0,
            };
          }

          return r;
        });

        ctx.recap.push({
          type: 'market',
          title: 'Streaming consolidation',
          body: `${collapsed.name} has collapsed. ${buyer.name} acquired key assets and captured ${Math.round(subTransferRate * 100)}% of its subscribers.`,
          severity: 'warning',
        });
      }
    }

    // Player platform hard-fail: extreme sustained underperformance can trigger a forced sale or shutdown.
    let nextPlayer = market.player;
    let nextStudioBudget = state.studio.budget ?? 0;

    if (market.player && market.player.status === 'active') {
      const player = market.player;
      const kpis = market.lastWeek?.player;

      const totalAddressableSubs = typeof market.totalAddressableSubs === 'number' ? market.totalAddressableSubs : 0;
      const minScale = totalAddressableSubs > 0 ? Math.floor(totalAddressableSubs * 0.02) : 1_500_000;

      const profit = kpis?.profit ?? 0;
      const subs = player.subscribers ?? 0;
      const cash = player.cash ?? 0;

      const isSevereBurn = profit < -25_000_000;
      const isLowScale = subs < minScale;
      const isRunwayBad = cash < -500_000_000;

      const prevDistress = typeof player.distressWeeks === 'number' ? player.distressWeeks : 0;
      const nextDistress = isSevereBurn && isLowScale && isRunwayBad ? prevDistress + 1 : 0;

      if (nextDistress === 10) {
        ctx.recap.push({
          type: 'market',
          title: 'Platform runway warning',
          body: `${player.name} is burning cash without enough scale. Your platform may be forced into a distressed sale if this continues.`,
          severity: 'warning',
        });
      }

      if (nextDistress === 16) {
        ctx.recap.push({
          type: 'market',
          title: 'Distress rumors',
          body: `Banks and rivals are circling ${player.name}. Without a rapid turnaround, you may lose the platform.`,
          severity: 'warning',
        });
      }

      const shouldHardFail = nextDistress >= 20;

      if (shouldHardFail) {
        const buyer = rivals
          .filter((r) => r.status !== 'collapsed')
          .sort((a, b) => (b.cash ?? 0) - (a.cash ?? 0))[0];

        const salePrice = Math.max(25_000_000, Math.floor(subs * 22 + (player.catalogValue ?? 40) * 1_000_000));
        nextStudioBudget += salePrice;

        if (buyer) {
          const transferRate = ctx.rng.nextFloat(0.5, 0.8);
          const transferredSubs = Math.floor(subs * transferRate);

          rivals = rivals.map((r) =>
            r.id === buyer.id
              ? {
                  ...r,
                  subscribers: (r.subscribers ?? 0) + transferredSubs,
                  catalogValue: clamp((r.catalogValue ?? 50) + (player.catalogValue ?? 40) * 0.12, 0, 100),
                }
              : r
          );

          ctx.recap.push({
            type: 'market',
            title: 'Forced sale: streaming platform',
            body: `${player.name} has been sold to ${buyer.name} after sustained extreme losses. You received ${Math.round(salePrice / 1_000_000)}M in a distressed sale.`,
            severity: 'bad',
          });

          nextPlayer = {
            ...player,
            status: 'sold',
            subscribers: 0,
            distressWeeks: nextDistress,
          };
        } else {
          ctx.recap.push({
            type: 'market',
            title: 'Shutdown: streaming platform',
            body: `${player.name} has been shut down after sustained extreme losses. You received ${Math.round(salePrice / 1_000_000)}M from liquidating remaining assets.`,
            severity: 'bad',
          });

          nextPlayer = {
            ...player,
            status: 'shutdown',
            subscribers: 0,
            distressWeeks: nextDistress,
          };
        }
      } else {
        nextPlayer = {
          ...player,
          distressWeeks: nextDistress,
        };
      }
    }

    return {
      ...state,
      studio: {
        ...state.studio,
        budget: nextStudioBudget,
      },
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
