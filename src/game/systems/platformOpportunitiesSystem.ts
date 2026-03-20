import type { PlatformMarketState } from '@/types/platformEconomy';
import type { GameEvent, Project } from '@/types/game';
import { getContractPlatformId, getPlatformIdForProjectAtTime } from '@/utils/platformIds';
import { stableInt } from '@/utils/stableRandom';
import type { TickSystem } from '../core/types';

function triggerDateFromWeekYear(year: number, week: number): Date {
  return new Date(Date.UTC(year, 0, 1 + Math.max(0, week - 1) * 7));
}

function pickHighestQuality(projects: Project[]): Project | null {
  if (projects.length === 0) return null;
  return projects
    .slice()
    .sort((a, b) => (b.script?.quality ?? 60) - (a.script?.quality ?? 60))[0];
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

    const offerWeek = stableInt(`${state.universeSeed || 'seed'}|platform:license-offer-week|${ctx.year}|${player.id}`, 10, 18);
    if (ctx.week !== offerWeek) return state;

    const lastLicenseOfferYear =
      typeof player.lastLicenseOfferYear === 'number'
        ? player.lastLicenseOfferYear
        : typeof player.lastOfferYear === 'number'
          ? player.lastOfferYear
          : undefined;

    if (lastLicenseOfferYear === ctx.year) return state;

    const playerPlatformId = player.id;
    const releasedOnPlatform = (state.projects || []).filter((p) => {
      if (getPlatformIdForProjectAtTime(p, ctx.week, ctx.year) !== playerPlatformId) return false;

      // Licensing offers are meant to pressure exclusivity on DIRECT platform premieres,
      // not post-theatrical arrivals.
      return isDirectExclusiveStreamingPremiere(p, playerPlatformId);
    });

    const targetTitle = pickHighestQuality(releasedOnPlatform);
    if (!targetTitle) return state;

    const quality = targetTitle.script?.quality ?? 60;
    const offer = Math.floor(35_000_000 + quality * 900_000);

    const rival = (market.rivals || []).find((r) => r.status !== 'collapsed');
    const rivalName = rival?.name ?? 'a rival platform';

    ctx.recap.push({
      type: 'market',
      title: 'Licensing offer',
      body: `${rivalName} wants to license ${targetTitle.title}. Cash now vs platform moat later.`,
      severity: 'info',
    });

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
          lastLicenseOfferYear: ctx.year,
        },
      },
      eventQueue: [...(state.eventQueue || []), event],
    };
  },
};
