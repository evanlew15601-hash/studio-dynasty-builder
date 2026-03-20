import type { PlatformMarketState } from '@/types/platformEconomy';
import type { GameEvent } from '@/types/game';
import { stableInt } from '@/utils/stableRandom';
import { triggerDateFromWeekYear } from '@/utils/gameTime';
import type { TickSystem } from '../core/types';



export const PlatformCrisisSystem: TickSystem = {
  id: 'platformCrisis',
  label: 'Platform crises (Streaming Wars)',
  dependsOn: ['platformCompetition'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    // Avoid stacking multiple crisis events at once, but don't let unrelated non-crisis events
    // (e.g., market/opportunity notifications) starve platform crisis pacing.
    const hasQueuedCrisis = (state.eventQueue || []).some((e) => e.type === 'crisis');
    if (hasQueuedCrisis) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    const player = market?.player;

    if (!market || !player || player.status !== 'active') return state;

    const kpis = market.lastWeek?.player;
    if (!kpis) return state;

    // "Spike" is intentionally high: roughly 8–10% monthly churn.
    const isChurnSpike = kpis.churnRate >= 0.02 && kpis.netAdds < 0;

    if (isChurnSpike) {
      const subsLost = Math.max(0, -kpis.netAdds);

      ctx.recap.push({
        type: 'market',
        title: 'Churn spike',
        body: `${player.name} is seeing a churn spike. Choose a response to stabilize retention and avoid a death spiral.`,
        severity: 'warning',
      });

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
    }

    // Deterministic outage crisis: once per year, week is seeded by universeSeed so it doesn't feel scripted.
    const serviceQuality = player.serviceQuality ?? 55;
    const subs = player.subscribers ?? 0;

    const outageWeek = stableInt(`${state.universeSeed || 'seed'}|platform:outage-week|${ctx.year}|${player.id}`, 22, 38);

    const isOutageWeek = ctx.week === outageWeek;
    const isOutageRisk = serviceQuality <= 35 && subs >= 5_000_000;

    if (!isOutageWeek || !isOutageRisk) return state;
    if (player.lastOutageYear === ctx.year) return state;

    const suggestedLoss = Math.max(0, Math.floor(subs * ctx.rng.nextFloat(0.003, 0.012)));

    ctx.recap.push({
      type: 'market',
      title: 'Service outage',
      body: `${player.name} suffered a major outage. Your response will affect churn and press coverage.`,
      severity: 'warning',
    });

    const outageEvent: GameEvent = {
      id: `platform:outage:${ctx.year}:W${ctx.week}:${player.id}`,
      title: 'Service outage: platform reliability failure',
      description: `${player.name} suffered a major outage this week. Subscribers are furious, and churn is spiking.`,
      type: 'crisis',
      triggerDate: triggerDateFromWeekYear(ctx.year, ctx.week),
      data: {
        kind: 'platform:outage',
        playerPlatformId: player.id,
        suggestedLoss,
      },
      choices: [
        {
          id: 'refunds',
          text: 'Issue refunds and credits',
          requirements: [
            {
              type: 'budget',
              threshold: 35_000_000,
              description: 'Requires $35M budget for refunds and customer credits',
            },
          ],
          consequences: [
            {
              type: 'budget',
              impact: -35_000_000,
              description: '-$35M refunds and credits',
            },
          ],
        },
        {
          id: 'apology',
          text: 'Public apology + fast fix',
          consequences: [
            {
              type: 'reputation',
              impact: -1,
              description: '-1 studio reputation (outage headlines)',
            },
          ],
        },
        {
          id: 'ignore',
          text: 'Downplay it',
          consequences: [
            {
              type: 'reputation',
              impact: -2,
              description: '-2 studio reputation (customer backlash)',
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
          lastOutageYear: ctx.year,
        },
      },
      eventQueue: [...(state.eventQueue || []), outageEvent],
    };
  },
};
