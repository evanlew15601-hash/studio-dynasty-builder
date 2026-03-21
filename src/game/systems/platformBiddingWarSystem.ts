import type { PlatformMarketState } from '@/types/platformEconomy';
import type { GameEvent, Project } from '@/types/game';
import { getContractPlatformId, getPlatformIdForProjectAtTime } from '@/utils/platformIds';
import { stableInt } from '@/utils/stableRandom';
import { triggerDateFromWeekYear } from '@/utils/gameTime';
import type { TickSystem } from '../core/types';



function clampInt(n: number, min: number, max: number): number {
  return Math.floor(Math.max(min, Math.min(max, n)));
}

function isDirectExclusiveStreamingPremiere(project: Project, platformId: string): boolean {
  const rs = project.releaseStrategy;
  if (rs && rs.type === 'streaming') {
    const streamId = rs.streamingPlatformId || rs.streamingProviderId;
    if (streamId === platformId) return rs.streamingExclusive !== false;
  }

  const contractId = getContractPlatformId(project.streamingContract);
  const contractExclusive = (project.streamingContract as any)?.exclusivityClause;
  return contractId === platformId && contractExclusive !== false;
}

function pickHighestQualityExclusive(params: { projects: Project[]; platformId: string; week: number; year: number }): Project | null {
  const { projects, platformId, week, year } = params;

  const eligible = projects
    .filter((p) => p && p.status === 'released')
    .filter((p) => getPlatformIdForProjectAtTime(p, week, year) === platformId)
    .filter((p) => isDirectExclusiveStreamingPremiere(p, platformId));

  if (eligible.length === 0) return null;

  return eligible
    .slice()
    .sort((a, b) => {
      const qa = a.script?.quality ?? 60;
      const qb = b.script?.quality ?? 60;
      if (qb !== qa) return qb - qa;
      return String(a.id).localeCompare(String(b.id));
    })[0];
}

export const PlatformBiddingWarSystem: TickSystem = {
  id: 'platformBiddingWar',
  label: 'Platform bidding wars (Streaming Wars)',
  dependsOn: ['platformCrisis'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;
    if ((state.eventQueue || []).length > 0) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    const player = market?.player;

    if (!market || !player || player.status !== 'active') return state;

    const offerWeek = stableInt(`${state.universeSeed || 'seed'}|platform:bidding-war-week|${ctx.year}|${player.id}`, 26, 34);
    if (ctx.week !== offerWeek) return state;
    if (player.lastBiddingWarYear === ctx.year) return state;

    const rivals = (market.rivals || []).filter((r) => r && r.status !== 'collapsed');
    if (rivals.length === 0) return state;

    const target = pickHighestQualityExclusive({
      projects: (state.projects || []) as Project[],
      platformId: player.id,
      week: ctx.week,
      year: ctx.year,
    });

    if (!target) return state;

    const rival = rivals.slice().sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0))[0];

    const quality = target.script?.quality ?? 60;
    const rivalScale = clampInt((rival.subscribers ?? 0) / 1_000_000, 0, 120);

    const windowWeeks = 52;
    const offer = clampInt(55_000_000 + quality * 1_050_000 + rivalScale * 380_000, 45_000_000, 420_000_000);
    const keepCost = clampInt(20_000_000 + offer * 0.25, 20_000_000, 160_000_000);

    const event: GameEvent = {
      id: `platform:bidding-war:${ctx.year}:W${ctx.week}:${player.id}:${target.id}:${rival.id}`,
      title: 'Bidding war: exclusive window',
      description: `${rival.name} is trying to buy an exclusive global window for ${target.title}.

Offer: ${Math.round(
        offer / 1_000_000
      )}M USD for a ${windowWeeks}-week window.

If you sell the window, you get cash now but lose platform differentiation. If you match the bid, you keep it exclusive — at a cost.`,
      type: 'opportunity',
      triggerDate: triggerDateFromWeekYear(ctx.year, ctx.week),
      data: {
        kind: 'platform:bidding-war',
        playerPlatformId: player.id,
        rivalId: rival.id,
        rivalName: rival.name,
        titleProjectId: target.id,
        titleName: target.title,
        offer,
        keepCost,
        windowWeeks,
      },
      choices: [
        {
          id: 'sell',
          text: `Sell window (${Math.round(offer / 1_000_000)}M)`,
          consequences: [
            {
              type: 'budget',
              impact: offer,
              description: `+${Math.round(offer / 1_000_000)}M exclusive window fee`,
            },
            {
              type: 'reputation',
              impact: -1,
              description: '-1 studio reputation (you got outbid)',
            },
          ],
        },
        {
          id: 'match',
          text: `Match bid (${Math.round(keepCost / 1_000_000)}M)`,
          requirements: [
            {
              type: 'budget',
              threshold: keepCost,
              description: `Requires ${Math.round(keepCost / 1_000_000)}M budget to keep the window exclusive`,
            },
          ],
          consequences: [
            {
              type: 'budget',
              impact: -keepCost,
              description: `-${Math.round(keepCost / 1_000_000)}M defensive spend`,
            },
            {
              type: 'reputation',
              impact: 1,
              description: '+1 studio reputation (platform-first stance)',
            },
          ],
        },
        {
          id: 'decline',
          text: 'Decline (hold the line)',
          consequences: [
            {
              type: 'reputation',
              impact: 1,
              description: '+1 studio reputation (you refuse to license away exclusives)',
            },
          ],
        },
      ],
    };

    ctx.recap.push({
      type: 'market',
      title: 'Bidding war',
      body: `${rival.name} is bidding for an exclusive window on ${target.title}. Sell for cash now, or pay to defend exclusivity.`,
      severity: 'info',
    });

    return {
      ...state,
      platformMarket: {
        ...market,
        player: {
          ...player,
          lastBiddingWarYear: ctx.year,
        },
      },
      eventQueue: [...(state.eventQueue || []), event],
    };
  },
};
