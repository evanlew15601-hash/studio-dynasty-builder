import type { PlatformMarketState } from '@/types/platformEconomy';
import type { GameEvent } from '@/types/game';
import type { TickSystem } from '../core/types';

function triggerDateFromWeekYear(year: number, week: number): Date {
  // Game years are not real-world years; we just need a stable Date for UI ordering.
  return new Date(year, 0, 1 + Math.max(0, week - 1) * 7);
}

export const PlatformCrisisSystem: TickSystem = {
  id: 'platformCrisis',
  label: 'Platform crises (Streaming Wars)',
  dependsOn: ['platformCompetition'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;
    if ((state.eventQueue || []).length > 0) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    const player = market?.player;

    if (!market || !player || player.status !== 'active') return state;

    const kpis = market.lastWeek?.player;
    if (!kpis) return state;

    // "Spike" is intentionally high: roughly 8–10% monthly churn.
    const isChurnSpike = kpis.churnRate >= 0.02 && kpis.netAdds < 0;
    if (!isChurnSpike) return state;

    const subsLost = Math.max(0, -kpis.netAdds);

    const event: GameEvent = {
      id: `platform:churn-spike:${ctx.year}:W${ctx.week}:${player.id}`,
      title: 'Churn spike: subscriber backlash',
      description: `${player.name} is seeing a churn spike this week.\n\n- Net adds: ${kpis.netAdds}\n- Churn: ${(kpis.churnRate * 100).toFixed(2)}%\n\nIf you don’t respond, the churn spiral may worsen and force you into a distressed sale later.`,
      type: 'crisis',
      triggerDate: triggerDateFromWeekYear(ctx.year, ctx.week),
      data: {
        kind: 'platform:churn-spike',
        playerPlatformId: player.id,
        netAdds: kpis.netAdds,
        churnRate: kpis.churnRate,
        suggestedLoss: subsLost,
      },
      choices: [
        {
          id: 'retention-campaign',
          text: 'Launch a retention campaign',
          requirements: [
            {
              type: 'budget',
              threshold: 20_000_000,
              description: 'Requires $20M budget for emergency retention marketing',
            },
          ],
          consequences: [
            {
              type: 'budget',
              impact: -20_000_000,
              description: '-$20M emergency campaign spend',
            },
          ],
        },
        {
          id: 'cut-price',
          text: 'Cut price (reduce ARPU to stabilize churn)',
          consequences: [
            {
              type: 'reputation',
              impact: -1,
              description: '-1 studio reputation (price war optics)',
            },
          ],
        },
        {
          id: 'hold-course',
          text: 'Hold course',
          consequences: [
            {
              type: 'reputation',
              impact: -2,
              description: '-2 studio reputation (press backlash)',
            },
          ],
        },
      ],
    };

    return {
      ...state,
      eventQueue: [...(state.eventQueue || []), event],
    };
  },
};
