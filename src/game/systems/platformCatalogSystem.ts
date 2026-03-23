import type { PlatformMarketState } from '@/types/platformEconomy';
import type { PostTheatricalRelease, Project } from '@/types/game';
import {
  getContractPlatformId,
  getDistributionChannelPlatformId,
  getPostTheatricalPlatformId,
  getReleaseStrategyPlatformId,
  getReleaseWindowPlatformId,
  isPlayerPlatformId,
} from '@/utils/platformIds';
import type { TickSystem } from '../core/types';
import { absWeek, effectiveArrivalAbs } from './platformRecency';
import { getTheatricalEndAbs } from '@/utils/postTheatrical';

function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(Math.max(min, Math.min(max, n)));
}

type PlatformContentPresence = {
  arrivalAbs: number;
  quality: number;
  kindFactor: number;
};

function directPlatformId(project: Project): string | null {
  return (
    getContractPlatformId(project.streamingContract) ||
    project.streamingPremiereDeal?.providerId ||
    getReleaseStrategyPlatformId(project.releaseStrategy) ||
    getDistributionChannelPlatformId(project.distributionStrategy?.primary) ||
    getReleaseWindowPlatformId(project.distributionStrategy?.windows?.[0]) ||
    null
  );
}

function pickPostTheatricalArrivalAbs(params: {
  project: Project;
  release: PostTheatricalRelease;
  currentAbs: number;
}): number {
  const { project, release, currentAbs } = params;

  const platformId = getPostTheatricalPlatformId(release);
  const endAbs = isPlayerPlatformId(platformId) ? getTheatricalEndAbs(project, currentAbs) : null;

  if (typeof release.releaseWeek === 'number' && typeof release.releaseYear === 'number') {
    const explicit = absWeek(release.releaseWeek, release.releaseYear);
    return endAbs != null ? Math.max(explicit, endAbs) : explicit;
  }

  if (typeof release.delayWeeks === 'number') {
    const delay = Math.max(0, Math.floor(release.delayWeeks));

    if (endAbs != null) {
      return endAbs + delay;
    }

    if (typeof project.releaseWeek === 'number' && typeof project.releaseYear === 'number') {
      return absWeek(project.releaseWeek, project.releaseYear) + delay;
    }
  }

  return currentAbs;
}

function getPlatformPresence(params: {
  project: Project;
  platformId: string;
  week: number;
  year: number;
}): PlatformContentPresence | null {
  const { project, platformId, week, year } = params;

  if (project.status !== 'released') return null;

  const currentAbs = absWeek(week, year);

  if (typeof project.releaseWeek === 'number' && typeof project.releaseYear === 'number') {
    if (absWeek(project.releaseWeek, project.releaseYear) > currentAbs) return null;
  }

  const directId = directPlatformId(project);

  if (directId === platformId) {
    const releaseAbs =
      typeof project.releaseWeek === 'number' && typeof project.releaseYear === 'number'
        ? absWeek(project.releaseWeek, project.releaseYear)
        : currentAbs;

    const arrivalAbs = effectiveArrivalAbs(project, releaseAbs, currentAbs);

    const exclusiveFlag = project.releaseStrategy?.streamingExclusive;
    const contractExclusive = (project as any)?.streamingContract?.exclusivityClause;
    const isExclusive = exclusiveFlag !== false && contractExclusive !== false;

    return {
      arrivalAbs,
      quality: project.script?.quality ?? 60,
      kindFactor: isExclusive ? 1.0 : 0.6,
    };
  }

  const release = (project.postTheatricalReleases ?? [])
    .filter((r) => r && r.platform === 'streaming')
    .filter((r) => (r.platformId || r.providerId) === platformId)
    .filter((r) => {
      if (typeof r.releaseWeek === 'number' && typeof r.releaseYear === 'number') {
        return absWeek(r.releaseWeek, r.releaseYear) <= currentAbs;
      }

      // Fallback: consider "active" releases always on-platform. For player-platform destinations,
      // keep the title in the library even if the revenue window ended.
      return r.status === 'active' || r.status === 'declining' || (r.status === 'ended' && isPlayerPlatformId(platformId));
    })
    .sort(
      (a, b) =>
        pickPostTheatricalArrivalAbs({ project, release: b, currentAbs }) -
        pickPostTheatricalArrivalAbs({ project, release: a, currentAbs })
    )[0];

  if (!release) return null;

  return {
    arrivalAbs: pickPostTheatricalArrivalAbs({ project, release, currentAbs }),
    quality: project.script?.quality ?? 60,
    kindFactor: 0.35,
  };
}

function gatherStreamingTitlesByPlatform(params: {
  projects: Project[];
  week: number;
  year: number;
}): Map<string, PlatformContentPresence[]> {
  const { projects, week, year } = params;

  const out = new Map<string, PlatformContentPresence[]>();

  for (const project of projects) {
    const directId = directPlatformId(project);

    if (directId) {
      const presence = getPlatformPresence({ project, platformId: directId, week, year });
      if (presence) {
        const list = out.get(directId) ?? [];
        list.push(presence);
        out.set(directId, list);
      }
    }

    const post = project.postTheatricalReleases ?? [];

    const postPlatforms = new Set<string>();

    for (const release of post) {
      if (!release || release.platform !== 'streaming') continue;
      const platformId = release.platformId || release.providerId;
      if (!platformId) continue;
      postPlatforms.add(platformId);
    }

    for (const platformId of postPlatforms) {
      const presence = getPlatformPresence({ project, platformId, week, year });
      if (!presence) continue;

      const list = out.get(platformId) ?? [];
      list.push(presence);
      out.set(platformId, list);
    }
  }

  return out;
}

function stepRivalFreshnessCatalog(params: {
  prevFreshness: number;
  prevCatalog: number;
  titles: PlatformContentPresence[];
  currentAbs: number;
  jitter: number;
}): { freshness: number; catalogValue: number } {
  const { prevFreshness, prevCatalog, titles, currentAbs, jitter } = params;

  // Baseline decay/drift.
  const decay = 1 + jitter * 0.5;

  const count = titles.length;
  const avgQuality = count > 0 ? titles.reduce((a, t) => a + t.quality, 0) / count : 55;
  const avgKindFactor = count > 0 ? titles.reduce((a, t) => a + t.kindFactor, 0) / count : 0.75;

  const recentImpulse = titles
    .map((t) => ({ ...t, weeksSince: Math.max(0, currentAbs - t.arrivalAbs) }))
    .filter((t) => t.weeksSince <= 8)
    .reduce((sum, t) => {
      const recency = 1 - t.weeksSince / 8;
      const qualityFactor = clamp((t.quality - 40) / 60, 0, 1);
      return sum + recency * qualityFactor * t.kindFactor;
    }, 0);

  const lastArrivalAbs = titles.reduce((max, t) => Math.max(max, t.arrivalAbs), 0);
  const weeksSinceLastArrival = lastArrivalAbs > 0 ? Math.max(0, currentAbs - lastArrivalAbs) : 99;
  const gapPenalty = weeksSinceLastArrival > 14 ? Math.min(6, (weeksSinceLastArrival - 14) * 0.22) : 0;

  const targetCatalog = clamp(
    14 + Math.log10(1 + count) * 22 + avgQuality * 0.45 + avgKindFactor * 8,
    0,
    100
  );

  const catalogValue = clamp(prevCatalog * 0.92 + targetCatalog * 0.08 + (jitter - 0.5), 0, 100);

  const support = catalogValue * 0.02;
  const baseFreshness = clamp(prevFreshness - decay + support, 0, 100);

  const recentBoost = clamp(recentImpulse * 26, 0, 28);
  const moatPenalty = clamp((1 - avgKindFactor) * 4, 0, 4);

  const freshness = clamp(baseFreshness + recentBoost - gapPenalty - moatPenalty, 0, 100);

  return { freshness, catalogValue };
}

function stepPlayerFreshnessCatalog(params: {
  prevFreshness: number;
  prevCatalog: number;
  titles: PlatformContentPresence[];
  currentAbs: number;
  jitter: number;
}): { freshness: number; catalogValue: number } {
  const { prevFreshness, prevCatalog, titles, currentAbs, jitter } = params;

  const count = titles.length;
  const avgQuality = count > 0 ? titles.reduce((a, t) => a + t.quality, 0) / count : 55;
  const avgKindFactor = count > 0 ? titles.reduce((a, t) => a + t.kindFactor, 0) / count : 0.75;

  const recentImpulse = titles
    .map((t) => ({ ...t, weeksSince: Math.max(0, currentAbs - t.arrivalAbs) }))
    .filter((t) => t.weeksSince <= 8)
    .reduce((sum, t) => {
      const recency = 1 - t.weeksSince / 8;
      const qualityFactor = clamp((t.quality - 40) / 60, 0, 1);
      return sum + recency * qualityFactor * t.kindFactor;
    }, 0);

  const lastArrivalAbs = titles.reduce((max, t) => Math.max(max, t.arrivalAbs), 0);
  const weeksSinceLastArrival = lastArrivalAbs > 0 ? Math.max(0, currentAbs - lastArrivalAbs) : 99;
  const gapPenalty = weeksSinceLastArrival > 12 ? Math.min(8, (weeksSinceLastArrival - 12) * 0.25) : 0;

  const targetCatalog = clamp(
    10 + Math.log10(1 + count) * 28 + avgQuality * 0.55 + avgKindFactor * 10,
    0,
    100
  );

  const catalogValue = clamp(prevCatalog * 0.9 + targetCatalog * 0.1 + (jitter - 0.5), 0, 100);

  const decay = 1 + jitter * 0.5;
  const support = catalogValue * 0.02;
  const baseFreshness = clamp(prevFreshness - decay + support, 0, 100);

  const recentBoost = clamp(recentImpulse * 38, 0, 45);
  const moatPenalty = clamp((1 - avgKindFactor) * 6, 0, 6);

  const freshness = clamp(baseFreshness + recentBoost - gapPenalty - moatPenalty, 0, 100);

  return { freshness, catalogValue };
}

export const PlatformCatalogSystem: TickSystem = {
  id: 'platformCatalog',
  label: 'Platform catalog (Streaming Wars)',
  dependsOn: ['platformMarketBootstrap', 'platformAutoStreamingWindows', 'platformOriginalsReleaseCadence', 'seasonAiringStatus'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    if (!market || !Array.isArray(market.rivals)) return state;

    const candidates: Project[] = [];

    for (const p of state.projects || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    for (const p of (state.aiStudioProjects as any) || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    for (const p of state.allReleases || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    const seen = new Set<string>();
    const projects = candidates.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const titlesByPlatform = gatherStreamingTitlesByPlatform({
      projects,
      week: ctx.week,
      year: ctx.year,
    });

    const currentAbs = absWeek(ctx.week, ctx.year);

    const rivals = market.rivals.map((r) => {
      if (!r || r.status === 'collapsed') return r;

      const prevFreshness = typeof r.freshness === 'number' ? r.freshness : 55;
      const prevCatalog = typeof r.catalogValue === 'number' ? r.catalogValue : 50;
      const jitter = ctx.rng.nextFloat(0, 1);

      const titles = titlesByPlatform.get(r.id) ?? [];

      const next = stepRivalFreshnessCatalog({ prevFreshness, prevCatalog, titles, currentAbs, jitter });

      return {
        ...r,
        freshness: next.freshness,
        catalogValue: next.catalogValue,
      };
    });

    const player = market.player
      ? market.player.status === 'active'
        ? (() => {
            const platformId = market.player!.id;

            const titles = titlesByPlatform.get(platformId) ?? [];

            const prevFreshness = typeof market.player!.freshness === 'number' ? market.player!.freshness : 50;
            const prevCatalog = typeof market.player!.catalogValue === 'number' ? market.player!.catalogValue : 35;

            const next = stepPlayerFreshnessCatalog({
              prevFreshness,
              prevCatalog,
              titles,
              currentAbs,
              jitter: ctx.rng.nextFloat(0, 1),
            });

            return {
              ...market.player,
              freshness: next.freshness,
              catalogValue: next.catalogValue,
            };
          })()
        : market.player
      : undefined;

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
