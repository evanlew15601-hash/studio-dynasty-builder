import type { PlatformMarketState } from '@/types/platformEconomy';
import type { Project } from '@/types/game';
import type { EpisodeData, SeasonData } from '@/types/streamingTypes';
import type { TickSystem } from '../core/types';

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function fromAbs(abs: number): { week: number; year: number } {
  let year = Math.floor(abs / 52);
  let week = abs % 52;

  if (week === 0) {
    week = 52;
    year -= 1;
  }

  return { week, year };
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(Math.max(min, Math.min(max, n)));
}

type ReleaseFormat = 'weekly' | 'binge' | 'batch';

function isStreamingWarsOriginal(project: Project, playerPlatformId: string): boolean {
  if (!project?.id?.startsWith('project:original:')) return false;
  const pid = project.streamingContract?.platformId || (project.streamingContract as any)?.platform;
  return pid === playerPlatformId;
}

function normalizeReleaseFormat(project: Project): ReleaseFormat {
  const f = project.releaseFormat;
  return f === 'binge' || f === 'batch' || f === 'weekly' ? f : 'weekly';
}

function ensureSeason(project: Project): { season: SeasonData; changed: boolean } {
  const totalEpisodes = Math.max(
    1,
    clampInt(
      (project.episodeCount ?? project.seasons?.[0]?.totalEpisodes ?? 10) as number,
      1,
      30
    )
  );

  const releaseFormat = normalizeReleaseFormat(project);

  const existing = project.seasons?.[0];
  if (existing) {
    const coercedEpisodes = Array.isArray(existing.episodes) ? existing.episodes : [];
    const paddedEpisodes: EpisodeData[] = coercedEpisodes.length >= totalEpisodes
      ? coercedEpisodes.slice(0, totalEpisodes)
      : coercedEpisodes.concat(
          Array.from({ length: totalEpisodes - coercedEpisodes.length }).map((_, idx) => {
            const n = coercedEpisodes.length + idx + 1;
            return {
              episodeNumber: n,
              seasonNumber: 1,
              title: `Episode ${n}`,
              runtime: 50,
              viewers: 0,
              completionRate: 0,
              averageWatchTime: 0,
              replayViews: 0,
              productionCost: 0,
              weeklyViews: [],
              cumulativeViews: 0,
              viewerRetention: 0,
            };
          })
        );

    const seasonOut: SeasonData = {
      ...existing,
      seasonNumber: 1,
      totalEpisodes,
      releaseFormat,
      episodes: paddedEpisodes,
      episodesAired: clampInt(existing.episodesAired ?? 0, 0, totalEpisodes),
    };

    const changed =
      (existing.totalEpisodes ?? 0) !== totalEpisodes ||
      existing.releaseFormat !== releaseFormat ||
      paddedEpisodes.length !== (existing.episodes?.length ?? 0) ||
      seasonOut.episodesAired !== (existing.episodesAired ?? 0);

    return { season: seasonOut, changed };
  }

  const episodes: EpisodeData[] = Array.from({ length: totalEpisodes }).map((_, idx) => {
    const n = idx + 1;
    return {
      episodeNumber: n,
      seasonNumber: 1,
      title: `Episode ${n}`,
      runtime: 50,
      viewers: 0,
      completionRate: 0,
      averageWatchTime: 0,
      replayViews: 0,
      productionCost: 0,
      weeklyViews: [],
      cumulativeViews: 0,
      viewerRetention: 0,
    };
  });

  return {
    season: {
      seasonNumber: 1,
      totalEpisodes,
      episodesAired: 0,
      releaseFormat,
      averageViewers: 0,
      seasonCompletionRate: 0,
      seasonDropoffRate: 0,
      totalBudget: project.budget?.total ?? 0,
      spentBudget: 0,
      productionStatus: 'complete',
      episodes,
    },
    changed: true,
  };
}

export const PlatformOriginalsReleaseCadenceSystem: TickSystem = {
  id: 'platformOriginalsReleaseCadence',
  label: 'Platform Originals release cadence (Streaming Wars)',
  dependsOn: ['platformOriginalsPipeline'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const market = state.platformMarket as PlatformMarketState | undefined;
    const playerPlatformId = market?.player?.id;
    if (!playerPlatformId) return state;

    const projectsIn = (state.projects ?? []) as Project[];
    if (projectsIn.length === 0) return state;

    const currentAbs = absWeek(ctx.week, ctx.year);

    let changed = false;

    const projectsOut = projectsIn.map((p) => {
      if (!p) return p;
      if (!isStreamingWarsOriginal(p, playerPlatformId)) return p;
      if (p.status !== 'released') return p;

      if (typeof p.releaseWeek !== 'number' || typeof p.releaseYear !== 'number') return p;

      const releaseAbs = absWeek(p.releaseWeek, p.releaseYear);
      if (releaseAbs > currentAbs) return p;

      const releaseFormat = normalizeReleaseFormat(p);
      const { season, changed: seasonChanged } = ensureSeason(p);

      const batchSize = releaseFormat === 'batch' ? 3 : 1;
      const weeksSincePremiere = Math.max(0, currentAbs - releaseAbs);

      let expectedAired = 0;
      if (releaseFormat === 'binge') {
        expectedAired = season.totalEpisodes;
      } else {
        expectedAired = Math.min(season.totalEpisodes, (weeksSincePremiere + 1) * batchSize);
      }

      expectedAired = clampInt(expectedAired, 0, season.totalEpisodes);

      const prevAired = clampInt(season.episodesAired ?? 0, 0, season.totalEpisodes);
      const nextAired = Math.max(prevAired, expectedAired);

      let episodesOut = season.episodes;

      if (nextAired > prevAired) {
        episodesOut = season.episodes.map((ep) => {
          if (!ep) return ep;
          if (ep.airDate) return ep;
          if (ep.episodeNumber > nextAired) return ep;

          const abs = releaseAbs + (releaseFormat === 'binge' ? 0 : Math.floor((ep.episodeNumber - 1) / batchSize));
          const { week, year } = fromAbs(abs);
          return {
            ...ep,
            airDate: { week, year },
          };
        });
      }

      const premiereDate = season.premiereDate ?? { week: p.releaseWeek, year: p.releaseYear };

      const dropsTotal = releaseFormat === 'binge' ? 1 : Math.ceil(season.totalEpisodes / batchSize);
      const finaleAbs = releaseAbs + (dropsTotal - 1);
      const finaleDate = nextAired >= season.totalEpisodes ? (season.finaleDate ?? fromAbs(finaleAbs)) : season.finaleDate;

      const productionStatus = 'complete';

      if (nextAired >= season.totalEpisodes && !season.finaleDate) {
        ctx.recap.push({
          type: 'release',
          title: 'Season finale',
          body: `Season 1 of "${p.title}" finished airing.`,
          severity: 'good',
          relatedIds: {
            projectId: p.id,
          },
        });
      }

      const seasonOut: SeasonData = {
        ...season,
        releaseFormat,
        episodesAired: nextAired,
        premiereDate,
        finaleDate,
        productionStatus,
        episodes: episodesOut,
      };

      const changedThis =
        seasonChanged ||
        nextAired !== prevAired ||
        !season.premiereDate ||
        (nextAired >= season.totalEpisodes && !season.finaleDate) ||
        episodesOut !== season.episodes;

      if (!changedThis) return p;

      changed = true;

      return {
        ...p,
        seasons: [seasonOut, ...(p.seasons ?? []).slice(1)],
        currentSeason: p.currentSeason ?? 1,
        totalOrderedSeasons: p.totalOrderedSeasons ?? 1,
        episodeCount: p.episodeCount ?? seasonOut.totalEpisodes,
        releaseFormat,
      };
    });

    if (!changed) return state;

    return {
      ...state,
      projects: projectsOut,
    };
  },
};
