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

function normalizeReleaseFormatValue(value: unknown): ReleaseFormat {
  return value === 'binge' || value === 'batch' || value === 'weekly' ? value : 'weekly';
}

function normalizeReleaseFormat(project: Project, season?: SeasonData): ReleaseFormat {
  return normalizeReleaseFormatValue(season?.releaseFormat ?? project.releaseFormat);
}

function seasonPremiereAbs(params: {
  project: Project;
  season: SeasonData;
  seasonIndex: number;
  releaseAbs: number;
  currentAbs: number;
}): number | null {
  const { project, season, seasonIndex, releaseAbs, currentAbs } = params;

  if (season?.premiereDate && typeof season.premiereDate.week === 'number' && typeof season.premiereDate.year === 'number') {
    return absWeek(season.premiereDate.week, season.premiereDate.year);
  }

  const episode1 = Array.isArray(season?.episodes) ? season.episodes.find((ep) => ep && ep.episodeNumber === 1) : null;
  if (episode1?.airDate && typeof episode1.airDate.week === 'number' && typeof episode1.airDate.year === 'number') {
    return absWeek(episode1.airDate.week, episode1.airDate.year);
  }

  // Fallback: season 1 premieres on project release.
  if ((season.seasonNumber ?? seasonIndex + 1) === 1) return releaseAbs;

  const format = normalizeReleaseFormat(project, season);
  const total = seasonTotalEpisodes(project, season, seasonIndex);
  const airedRaw = typeof season.episodesAired === 'number' ? season.episodesAired : 0;
  const aired = clampInt(airedRaw, 0, total);

  // Legacy-save inference: if episodes are marked as aired but premiereDate is missing,
  // infer a premiere week consistent with the current abs week.
  if (aired <= 0) return null;

  if (format === 'binge') return currentAbs;

  const batchSize = format === 'batch' ? 3 : 1;
  const dropsAired = Math.max(1, Math.ceil(aired / batchSize));

  return Math.max(releaseAbs, currentAbs - (dropsAired - 1));
}

function seasonTotalEpisodes(project: Project, season: SeasonData, seasonIndex: number): number {
  const fallback = (seasonIndex === 0 ? project.episodeCount : undefined) ?? 10;
  const n = (season.totalEpisodes ?? fallback) as number;
  return Math.max(1, clampInt(n, 1, 30));
}

function ensureSeasonEpisodes(params: {
  project: Project;
  season: SeasonData;
  seasonIndex: number;
}): { season: SeasonData; changed: boolean } {
  const { project, season, seasonIndex } = params;

  const totalEpisodes = seasonTotalEpisodes(project, season, seasonIndex);
  const releaseFormat = normalizeReleaseFormat(project, season);

  const coercedEpisodes = Array.isArray(season.episodes) ? season.episodes : [];

  const paddedEpisodes: EpisodeData[] = coercedEpisodes.length >= totalEpisodes
    ? coercedEpisodes.slice(0, totalEpisodes)
    : coercedEpisodes.concat(
        Array.from({ length: totalEpisodes - coercedEpisodes.length }).map((_, idx) => {
          const n = coercedEpisodes.length + idx + 1;
          return {
            episodeNumber: n,
            seasonNumber: season.seasonNumber ?? seasonIndex + 1,
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

  const existingStatus = season.productionStatus;
  const validExistingStatus =
    existingStatus === 'planning' ||
    existingStatus === 'filming' ||
    existingStatus === 'post-production' ||
    existingStatus === 'airing' ||
    existingStatus === 'complete';

  const productionStatus: SeasonData['productionStatus'] = validExistingStatus ? existingStatus : 'planning';

  const seasonOut: SeasonData = {
    ...season,
    seasonNumber: season.seasonNumber ?? seasonIndex + 1,
    totalEpisodes,
    releaseFormat,
    productionStatus,
    episodesAired: clampInt(season.episodesAired ?? 0, 0, totalEpisodes),
    episodes: paddedEpisodes,
  };

  const changed =
    (season.totalEpisodes ?? 0) !== totalEpisodes ||
    season.releaseFormat !== releaseFormat ||
    paddedEpisodes.length !== (season.episodes?.length ?? 0) ||
    seasonOut.episodesAired !== (season.episodesAired ?? 0) ||
    seasonOut.productionStatus !== season.productionStatus;

  return { season: seasonOut, changed };
}

function ensureSeasonOne(project: Project): { seasons: SeasonData[]; changed: boolean } {
  const seasonsIn = Array.isArray(project.seasons) ? project.seasons : [];

  if (seasonsIn.length === 0) {
    const totalEpisodes = Math.max(1, clampInt((project.episodeCount ?? 10) as number, 1, 30));
    const releaseFormat = normalizeReleaseFormat(project);

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
      seasons: [
        {
          seasonNumber: 1,
          totalEpisodes,
          episodesAired: 0,
          releaseFormat,
          averageViewers: 0,
          seasonCompletionRate: 0,
          seasonDropoffRate: 0,
          totalBudget: project.budget?.total ?? 0,
          spentBudget: 0,
          productionStatus: 'airing',
          episodes,
        },
      ],
      changed: true,
    };
  }

  const first = ensureSeasonEpisodes({ project, season: seasonsIn[0], seasonIndex: 0 });

  let restChanged = false;
  const rest = seasonsIn.slice(1).map((s, idx) => {
    const out = ensureSeasonEpisodes({ project, season: s, seasonIndex: idx + 1 });
    if (out.changed) restChanged = true;
    return out.season;
  });

  return {
    seasons: [first.season, ...rest],
    changed: first.changed || restChanged,
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
      if (p.type !== 'series' && p.type !== 'limited-series') return p;

      if (typeof p.releaseWeek !== 'number' || typeof p.releaseYear !== 'number') return p;

      const releaseAbs = absWeek(p.releaseWeek, p.releaseYear);
      if (releaseAbs > currentAbs) return p;

      const ensured = ensureSeasonOne(p);
      const seasonsIn = ensured.seasons;

      type SeasonCandidate = {
        season: SeasonData;
        seasonIndex: number;
        premiereAbs: number;
        total: number;
        isComplete: boolean;
      };

      const candidates: SeasonCandidate[] = seasonsIn
        .map((season, seasonIndex) => {
          const premiereAbs = seasonPremiereAbs({ project: p, season, seasonIndex, releaseAbs, currentAbs });
          if (premiereAbs == null) return null;
          if (premiereAbs > currentAbs) return null;

          const total = seasonTotalEpisodes(p, season, seasonIndex);
          const aired = clampInt(season.episodesAired ?? 0, 0, total);

          return {
            season,
            seasonIndex,
            premiereAbs,
            total,
            isComplete: aired >= total,
          };
        })
        .filter((c): c is SeasonCandidate => c !== null);

      // Choose the most recently premiered season that isn't complete.
      const active =
        candidates
          .filter((c) => !c.isComplete)
          .sort((a, b) => b.premiereAbs - a.premiereAbs)[0] ??
        candidates.sort((a, b) => b.premiereAbs - a.premiereAbs)[0] ??
        null;

      if (!active) {
        if (!ensured.changed) return p;
        changed = true;
        return {
          ...p,
          seasons: seasonsIn,
        };
      }

      const releaseFormat = normalizeReleaseFormat(p, active.season);
      const batchSize = releaseFormat === 'batch' ? 3 : 1;
      const weeksSincePremiere = Math.max(0, currentAbs - active.premiereAbs);

      let expectedAired = 0;
      if (releaseFormat === 'binge') {
        expectedAired = active.total;
      } else {
        expectedAired = Math.min(active.total, (weeksSincePremiere + 1) * batchSize);
      }

      expectedAired = clampInt(expectedAired, 0, active.total);

      const prevAired = clampInt(active.season.episodesAired ?? 0, 0, active.total);
      const nextAired = Math.max(prevAired, expectedAired);

      let episodesOut = active.season.episodes;

      const needsAirDates =
        nextAired > 0 &&
        active.season.episodes
          .slice(0, nextAired)
          .some((ep) => ep && !ep.airDate);

      if (needsAirDates) {
        episodesOut = active.season.episodes.map((ep) => {
          if (!ep) return ep;
          if (ep.airDate) return ep;
          if (ep.episodeNumber > nextAired) return ep;

          const abs = active.premiereAbs + (releaseFormat === 'binge' ? 0 : Math.floor((ep.episodeNumber - 1) / batchSize));
          const { week, year } = fromAbs(abs);
          return {
            ...ep,
            airDate: { week, year },
          };
        });
      }

      const premiereDate = active.season.premiereDate ?? fromAbs(active.premiereAbs);

      const dropsTotal = releaseFormat === 'binge' ? 1 : Math.ceil(active.total / batchSize);
      const finaleAbs = active.premiereAbs + (dropsTotal - 1);
      const finaleDate = nextAired >= active.total ? (active.season.finaleDate ?? fromAbs(finaleAbs)) : active.season.finaleDate;

      if (nextAired >= active.total && !active.season.finaleDate) {
        ctx.recap.push({
          type: 'release',
          title: 'Season finale',
          body: `Season ${active.season.seasonNumber ?? active.seasonIndex + 1} of "${p.title}" finished airing.`,
          severity: 'good',
          relatedIds: {
            projectId: p.id,
          },
        });
      }

      const productionStatus: SeasonData['productionStatus'] = nextAired >= active.total ? 'complete' : 'airing';

      const seasonOut: SeasonData = {
        ...active.season,
        releaseFormat,
        episodesAired: nextAired,
        premiereDate,
        finaleDate,
        productionStatus,
        episodes: episodesOut,
      };

      const seasonsOut = seasonsIn.map((s, idx) => (idx === active.seasonIndex ? seasonOut : s));

      let scheduledNextSeason = false;

      // Auto-schedule the next season premiere if a later season exists but has no date.
      if (nextAired >= active.total) {
        const nextSeasonIndex = active.seasonIndex + 1;
        const nextSeason = seasonsOut[nextSeasonIndex];
        if (nextSeason && !nextSeason.premiereDate) {
          const hiatusWeeks = 26;
          const nextPremiereAbs = finaleAbs + hiatusWeeks;
          seasonsOut[nextSeasonIndex] = {
            ...nextSeason,
            premiereDate: fromAbs(nextPremiereAbs),
          };
          scheduledNextSeason = true;
        }
      }

      const changedThis =
        ensured.changed ||
        scheduledNextSeason ||
        nextAired !== prevAired ||
        productionStatus !== active.season.productionStatus ||
        !active.season.premiereDate ||
        (nextAired >= active.total && !active.season.finaleDate) ||
        episodesOut !== active.season.episodes;

      if (!changedThis) return p;

      changed = true;

      return {
        ...p,
        seasons: seasonsOut,
        currentSeason: active.season.seasonNumber ?? active.seasonIndex + 1,
        totalOrderedSeasons: p.totalOrderedSeasons ?? seasonsOut.length,
        episodeCount: p.episodeCount ?? seasonsOut[0]?.totalEpisodes,
        releaseFormat: normalizeReleaseFormat(p, seasonsOut[0]),
      };
    });

    if (!changed) return state;

    return {
      ...state,
      projects: projectsOut,
    };
  },
};
