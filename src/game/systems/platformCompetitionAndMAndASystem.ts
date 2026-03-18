import type { PlatformMarketState, RivalPlatformState } from '@/types/platformEconomy';
import type { TickSystem } from '../core/types';

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

    let didCollapse = false;

    const rivals = market.rivals.map((r) => {
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

      const nextStatus: RivalPlatformState['status'] =
        nextDistressWeeks >= COLLAPSE_AFTER_WEEKS && ctx.rng.chance(0.25)
          ? 'collapsed'
          : isDistress
            ? 'distress'
            : 'healthy';

      if (r.status !== 'collapsed' && nextStatus === 'collapsed') didCollapse = true;

      return {
        ...r,
        status: nextStatus,
        distressWeeks: nextDistressWeeks,
        subscribers: nextStatus === 'collapsed' ? 0 : r.subscribers,
      };
    });

    if (didCollapse) {
      ctx.recap.push({
        type: 'market',
        title: 'Streaming consolidation',
        body: 'A rival platform has collapsed under sustained losses.',
        severity: 'warning',
      });
    }

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
