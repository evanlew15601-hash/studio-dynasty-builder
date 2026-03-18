import type { PlatformMarketState } from '@/types/platformEconomy';
import type { GameEvent, Project } from '@/types/game';
import { getPlatformIdForProject } from '@/utils/platformIds';
import type { TickSystem } from '../core/types';

function triggerDateFromWeekYear(year: number, week: number): Date {
  return new Date(year, 0, 1 + Math.max(0, week - 1) * 7);
}

function pickHighestQuality(projects: Project[]): Project | null {
  if (projects.length === 0) return null;
  return projects
    .slice()
    .sort((a, b) => (b.script?.quality ?? 60) - (a.script?.quality ?? 60))[0];
}

export const PlatformOpportunitiesSystem: TickSystem = {
  id: 'platformOpportunities',
  label: 'Platform opportunities (Streaming Wars)',
  dependsOn: ['platformCrisis'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;
    if ((state.eventQueue || []).length > 0) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    const player = market?.player;

    if (!market || !player || player.status !== 'active') return state;

    // A single predictable “licensing offer season” keeps the system deterministic and prevents spam.
    if (ctx.week !== 13) return state;
    if (player.lastOfferYear === ctx.year) return state;

    const playerPlatformId = player.id;
    const releasedOnPlatform = (state.projects || []).filter(
      (p) => p.status === 'released' && getPlatformIdForProject(p) === playerPlatformId
    );

    const targetTitle = pickHighestQuality(releasedOnPlatform);
    if (!targetTitle) return state;

    const quality = targetTitle.script?.quality ?? 60;
    const offer = Math.floor(35_000_000 + quality * 900_000);

    const rival = (market.rivals || []).find((r) => r.status !== 'collapsed');
    const rivalName = rival?.name ?? 'a rival platform';

    const event: GameEvent = {
      id: `platform:license-offer:${ctx.year}:W${ctx.week}:${player.id}:${targetTitle.id}`,
      title: 'Licensing offer: global window',
      description: `${rivalName} wants a non-exclusive global window for ${targetTitle.title}.\n\nOffer: $${Math.round(
        offer / 1_000_000
      )}M.\n\nAccepting brings cash now, but weakens your platform differentiation.`,
      type: 'opportunity',
      triggerDate: triggerDateFromWeekYear(ctx.year, ctx.week),
      data: {
        kind: 'platform:license-offer',
        titleProjectId: targetTitle.id,
        titleName: targetTitle.title,
        offer,
        rivalId: rival?.id,
        rivalName,
        playerPlatformId,
      },
      choices: [
        {
          id: 'accept',
          text: `Accept (${Math.round(offer / 1_000_000)}M)`,
          consequences: [
            {
              type: 'budget',
              impact: offer,
              description: `+${Math.round(offer / 1_000_000)}M licensing fee`,
            },
          ],
        },
        {
          id: 'decline',
          text: 'Decline (keep it exclusive)',
          consequences: [
            {
              type: 'reputation',
              impact: 1,
              description: '+1 studio reputation (platform-first stance)',
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
          lastOfferYear: ctx.year,
        },
      },
      eventQueue: [...(state.eventQueue || []), event],
    };
  },
};
