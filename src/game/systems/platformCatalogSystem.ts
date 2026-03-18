import type { PlatformMarketState, PlayerPlatformState, RivalPlatformState } from '@/types/platformEconomy';
import type { Project } from '@/types/game';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function absWeek(year: number, week: number): number {
  return year * 52 + week;
}

function getReleaseAbs(project: Project): number | null {
  if (typeof project.releaseYear !== 'number' || typeof project.releaseWeek !== 'number') return null;
  return absWeek(project.releaseYear, project.releaseWeek);
}

function getPlatformStartAbs(project: Project, platformId: string, nowAbs: number): number | null {
  const releaseAbs = getReleaseAbs(project);

  const isDirect =
    project.streamingContract?.platformId === platformId ||
    project.releaseStrategy?.streamingPlatformId === platformId ||
    project.distributionStrategy?.primary?.platformId === platformId;

  if (isDirect) return releaseAbs;

  const windows = project.postTheatricalReleases ?? [];

  const candidates = windows
    .filter((w) => w && w.platformId === platformId && w.status !== 'ended')
    .map((w) => {
      if (typeof w.releaseYear === 'number' && typeof w.releaseWeek === 'number') {
        return absWeek(w.releaseYear, w.releaseWeek);
      }
      // Legacy fallback: if a release is active but not stamped, treat it as already on-platform.
      return w.status === 'active' || w.status === 'declining' ? releaseAbs ?? nowAbs : null;
    })
    .filter((n): n is number => typeof n === 'number');

  if (candidates.length === 0) return null;

  return Math.min(...candidates);
}

function computeCatalogFromTitles(params: {
  prevFreshness: number;
  prevCatalogValue: number;
  nowAbs: number;
  titles: Project[];
  platformId: string;
  rngJitter: () => number;
}): { freshness: number; catalogValue: number } {
  const { prevFreshness, prevCatalogValue, nowAbs, titles, platformId, rngJitter } = params;

  const starts = titles
    .map((p) => ({
      startAbs: getPlatformStartAbs(p, platformId, nowAbs),
      quality: typeof p.script?.quality === 'number' ? p.script.quality : 60,
    }))
    .filter((x): x is { startAbs: number; quality: number } => typeof x.startAbs === 'number');

  const totalTitles = starts.length;
  const recentTitles = starts.filter((t) => nowAbs - t.startAbs <= 26);
  const newThisWeek = starts.filter((t) => t.startAbs === nowAbs).length;

  const avgQuality = totalTitles > 0 ? starts.reduce((a, b) => a + b.quality, 0) / totalTitles : 60;

  const targetCatalogValue = clamp(totalTitles * 2 + (avgQuality - 55) * 0.4, 0, 100);
  const nextCatalogValue = clamp(prevCatalogValue * 0.9 + targetCatalogValue * 0.1 + rngJitter(), 0, 100);

  const support = recentTitles.length * 1.25 + newThisWeek * 6 + (avgQuality - 55) * 0.05;
  const decay = 1.2 + Math.max(0, (10 - Math.min(10, recentTitles.length))) * 0.2;

  const nextFreshness = clamp(prevFreshness * 0.9 + support - decay + rngJitter(), 0, 100);

  return { freshness: nextFreshness, catalogValue: nextCatalogValue };
}

function updateRival(rival: RivalPlatformState, titles: Project[], nowAbs: number, rngJitter: () => number): RivalPlatformState {
  const prevFreshness = typeof rival.freshness === 'number' ? rival.freshness : 55;
  const prevCatalog = typeof rival.catalogValue === 'number' ? rival.catalogValue : 50;

  const computed = computeCatalogFromTitles({
    prevFreshness,
    prevCatalogValue: prevCatalog,
    nowAbs,
    titles,
    platformId: rival.id,
    rngJitter,
  });

  return {
    ...rival,
    freshness: computed.freshness,
    catalogValue: computed.catalogValue,
  };
}

function updatePlayer(player: PlayerPlatformState, titles: Project[], nowAbs: number, rngJitter: () => number): PlayerPlatformState {
  const prevFreshness = typeof player.freshness === 'number' ? player.freshness : 55;
  const prevCatalog = typeof player.catalogValue === 'number' ? player.catalogValue : 50;

  const computed = computeCatalogFromTitles({
    prevFreshness,
    prevCatalogValue: prevCatalog,
    nowAbs,
    titles,
    platformId: player.id,
    rngJitter,
  });

  return {
    ...player,
    freshness: computed.freshness,
    catalogValue: computed.catalogValue,
  };
}

export const PlatformCatalogSystem: TickSystem = {
  id: 'platformCatalog',
  label: 'Platform catalog (Streaming Wars)',
  dependsOn: ['platformMarketBootstrap'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    if (!market || !Array.isArray(market.rivals)) return state;

    const nowAbs = absWeek(ctx.year, ctx.week);

    const titles = (state.projects ?? []).filter((p) => p && (p as any).status === 'released');

    const rngJitter = () => ctx.rng.nextFloat(-0.35, 0.35);

    const rivals = market.rivals.map((r) => {
      if (!r || r.status === 'collapsed') return r;
      return updateRival(r, titles, nowAbs, rngJitter);
    });

    const player = market.player && market.player.status === 'active' ? updatePlayer(market.player, titles, nowAbs, rngJitter) : market.player;

    return {
      ...state,
      platformMarket: {
        ...market,
        player,
        rivals,
        lastUpdatedWeek: ctx.week,
        lastUpdatedYear: ctx.year,
      },
    };
  },
};
