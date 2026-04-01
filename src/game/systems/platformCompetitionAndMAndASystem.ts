import type { PlatformMarketState, RivalPlatformState } from '@/types/platformEconomy';
import type { GameEvent } from '@/types/game';
import type { TickSystem } from '../core/types';
import { triggerDateFromWeekYear } from '@/utils/gameTime';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}



export const PlatformCompetitionAndMAndASystem: TickSystem = {
  id: 'platformCompetition',
  label: 'Platform competition & M&A (Streaming Wars)',
  dependsOn: ['platformEconomy'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const hasBlockingEvent = (state.eventQueue || []).length > 0;

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

      const willCollapse = nextDistressWeeks >= COLLAPSE_AFTER_WEEKS;

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

      if (nextStatus === 'collapsed') {
        collapsedThisTick.push(r);
      }

      return next;
    });

    let rivals = rivalsAfterStatus as RivalPlatformState[];

    // Rival collapse: offer the player a chance to acquire distressed assets.
    if (!hasBlockingEvent && collapsedThisTick.length > 0 && market.player && market.player.status === 'active') {
      const collapsed = collapsedThisTick[0];
      const buyer = rivals
        .filter((x) => x && x.id !== collapsed.id)
        .filter((x) => x.status !== 'collapsed')
        .sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0))[0];

      const subTransferRate = ctx.rng.nextFloat(0.45, 0.7);
      const transferredSubs = Math.floor((collapsed.subscribers ?? 0) * subTransferRate);

      const catalogTransferRate = ctx.rng.nextFloat(0.45, 0.7);
      const transferredCatalog = (collapsed.catalogValue ?? 50) * catalogTransferRate;

      const salePrice = Math.max(
        35_000_000,
        Math.floor((collapsed.subscribers ?? 0) * 10 + (collapsed.catalogValue ?? 50) * 900_000)
      );

      const buyerName = buyer?.name ?? 'a rival platform';

      const event: GameEvent = {
        id: `platform:rival-collapse:${ctx.year}:W${ctx.week}:${collapsed.id}`,
        title: 'Distressed acquisition opportunity',
        description: `${collapsed.name} has collapsed.\n\nYou can attempt a distressed acquisition to capture ${transferredSubs} subscribers and key catalog assets.\n\nIf you pass, ${buyerName} will absorb most of the demand.`,
        type: 'market',
        triggerDate: triggerDateFromWeekYear(ctx.year, ctx.week),
        data: {
          kind: 'platform:rival-collapse',
          collapsedId: collapsed.id,
          collapsedName: collapsed.name,
          rivalBuyerId: buyer?.id,
          rivalBuyerName: buyer?.name,
          salePrice,
          transferredSubs,
          transferredCatalog,
        },
        choices: [
          {
            id: 'buy',
            text: `Acquire assets (${Math.round(salePrice / 1_000_000)}M)`,
            requirements: [
              {
                type: 'budget',
                threshold: salePrice,
                description: `Requires ${Math.round(salePrice / 1_000_000)}M budget for a distressed acquisition`,
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
                impact: -1,
                description: '-1 studio reputation (consolidation optics)',
              },
            ],
          },
          {
            id: 'pass',
            text: 'Pass (let rivals consolidate)',
            consequences: [],
          },
        ],
      };

      ctx.recap.push({
        type: 'market',
        title: 'Distressed acquisition opportunity',
        body: `${collapsed.name} collapsed. You have a brief window to acquire distressed assets before rivals consolidate.`,
        severity: 'warning',
      });

      return {
        ...state,
        platformMarket: {
          ...market,
          rivals,
          lastUpdatedWeek: ctx.week,
          lastUpdatedYear: ctx.year,
        },
        eventQueue: [...(state.eventQueue || []), event],
      };
    }

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
    // This is event-driven so the player sees it coming and makes an explicit choice.
    let nextPlayer = market.player;

    if (market.player && market.player.status === 'active') {
      const player = market.player;
      const kpis = market.lastWeek?.player;

      const totalAddressableSubs = typeof market.totalAddressableSubs === 'number' ? market.totalAddressableSubs : 0;
      const minScale = totalAddressableSubs > 0 ? Math.floor(totalAddressableSubs * 0.02) : 1_500_000;

      const profit = kpis?.profit ?? 0;
      const subs = player.subscribers ?? 0;
      const cash = player.cash ?? 0;

      const isSevereBurn = profit < 0;
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

      if (shouldHardFail && !hasBlockingEvent) {
        const buyer = rivals
          .filter((r) => r.status !== 'collapsed')
          .sort((a, b) => (b.cash ?? 0) - (a.cash ?? 0))[0];

        const salePrice = Math.max(25_000_000, Math.floor(subs * 22 + (player.catalogValue ?? 40) * 1_000_000));
        const transferRate = buyer ? ctx.rng.nextFloat(0.5, 0.8) : 0;
        const transferredSubs = buyer ? Math.floor(subs * transferRate) : 0;
        const transferredCatalog = buyer ? clamp((player.catalogValue ?? 40) * 0.7, 0, 100) : 0;

        const emergencyFundingCost = 180_000_000;

        const event: GameEvent = {
          id: `platform:forced-sale:${ctx.year}:W${ctx.week}:${player.id}`,
          title: 'Board ultimatum: platform in distress',
          description: `${player.name} is in an extreme death spiral.\n\n- Scale: ${subs} subs\n- Weekly profit: ${profit}\n- Platform cash: ${cash}\n\nYou must act now.`,
          type: 'crisis',
          triggerDate: triggerDateFromWeekYear(ctx.year, ctx.week),
          data: {
            kind: 'platform:forced-sale',
            playerPlatformId: player.id,
            playerPlatformName: player.name,
            salePrice,
            buyerId: buyer?.id,
            buyerName: buyer?.name,
            transferredSubs,
            transferredCatalog,
            emergencyFundingCost,
          },
          choices: [
            {
              id: 'emergency-funding',
              text: `Emergency funding (${Math.round(emergencyFundingCost / 1_000_000)}M)`,
              requirements: [
                {
                  type: 'budget',
                  threshold: emergencyFundingCost,
                  description: `Requires ${Math.round(emergencyFundingCost / 1_000_000)}M budget for emergency funding`,
                },
              ],
              consequences: [
                {
                  type: 'budget',
                  impact: -emergencyFundingCost,
                  description: `-${Math.round(emergencyFundingCost / 1_000_000)}M emergency funding`,
                },
                {
                  type: 'reputation',
                  impact: -3,
                  description: '-3 studio reputation (public failure narrative)',
                },
              ],
            },
            {
              id: 'sell',
              text: `Accept distressed sale (${Math.round(salePrice / 1_000_000)}M)`,
              consequences: [
                {
                  type: 'budget',
                  impact: salePrice,
                  description: `+${Math.round(salePrice / 1_000_000)}M distressed sale proceeds`,
                },
                {
                  type: 'reputation',
                  impact: -2,
                  description: '-2 studio reputation (forced sale optics)',
                },
              ],
            },
            {
              id: 'shutdown',
              text: 'Shut it down',
              consequences: [
                {
                  type: 'budget',
                  impact: Math.floor(salePrice * 0.5),
                  description: `+${Math.round((salePrice * 0.5) / 1_000_000)}M liquidation proceeds`,
                },
                {
                  type: 'reputation',
                  impact: -3,
                  description: '-3 studio reputation (shutdown narrative)',
                },
              ],
            },
          ],
        };

        ctx.recap.push({
          type: 'market',
          title: 'Board ultimatum',
          body: `${player.name} is facing an existential crisis. You must choose: emergency funding, sale, or shutdown.`,
          severity: 'bad',
        });

        nextPlayer = {
          ...player,
          distressWeeks: nextDistress,
        };

        return {
          ...state,
          platformMarket: {
            ...market,
            player: nextPlayer,
            rivals,
            lastUpdatedWeek: ctx.week,
            lastUpdatedYear: ctx.year,
          },
          eventQueue: [...(state.eventQueue || []), event],
        };
      }

      nextPlayer = {
        ...player,
        distressWeeks: nextDistress,
      };
    }

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
