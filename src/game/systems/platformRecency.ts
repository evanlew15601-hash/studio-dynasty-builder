import type { Project } from '@/types/game';

export type ReleaseFormat = 'weekly' | 'binge' | 'batch';

export function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(Math.max(min, Math.min(max, n)));
}

function normalizeReleaseFormatValue(value: unknown): ReleaseFormat {
  return value === 'binge' || value === 'batch' || value === 'weekly' ? value : 'weekly';
}

function normalizeReleaseFormat(project: Project, season?: { releaseFormat?: unknown }): ReleaseFormat {
  return normalizeReleaseFormatValue(season?.releaseFormat ?? project.releaseFormat);
}

function seasonTotalEpisodes(project: Project, season: any, seasonIndex: number): number {
  const fallbackRaw = seasonIndex === 0 ? project.episodeCount : 10;
  const fallback = typeof fallbackRaw === 'number' && fallbackRaw > 0 ? fallbackRaw : 10;

  const nRaw = season?.totalEpisodes;
  const n = typeof nRaw === 'number' && nRaw > 0 ? nRaw : fallback;

  return clampInt(n, 1, 30);
}

function seasonEpisodesAired(params: {
  season: any;
  currentAbs: number;
  premiereAbs: number;
  format: ReleaseFormat;
  totalEpisodes: number;
}): number {
  const { season, currentAbs, premiereAbs, format, totalEpisodes } = params;

  const recorded = typeof season?.episodesAired === 'number' ? clampInt(season.episodesAired, 0, totalEpisodes) : 0;

  if (currentAbs < premiereAbs) return recorded;

  if (format === 'binge') return Math.max(recorded, totalEpisodes);

  const weeksSincePremiere = Math.max(0, currentAbs - premiereAbs);
  const batchSize = format === 'batch' ? 3 : 1;
  const derived = clampInt(Math.min(totalEpisodes, (weeksSincePremiere + 1) * batchSize), 0, totalEpisodes);

  return Math.max(recorded, derived);
}

function inferPremiereAbsFromAired(params: {
  season: any;
  seasonIndex: number;
  releaseAbs: number;
  currentAbs: number;
  format: ReleaseFormat;
  totalEpisodes: number;
}): number | null {
  const { season, seasonIndex, releaseAbs, currentAbs, format, totalEpisodes } = params;

  if ((season?.seasonNumber ?? seasonIndex + 1) === 1) return releaseAbs;

  const airedRaw = typeof season?.episodesAired === 'number' ? season.episodesAired : 0;
  const aired = clampInt(airedRaw, 0, totalEpisodes);

  if (aired <= 0) return null;

  if (format === 'binge') return currentAbs;

  const batchSize = format === 'batch' ? 3 : 1;
  const dropsAired = Math.max(1, Math.ceil(aired / batchSize));

  return Math.max(releaseAbs, currentAbs - (dropsAired - 1));
}

function seasonPremiereAbs(params: {
  project: Project;
  season: any;
  seasonIndex: number;
  releaseAbs: number;
  currentAbs: number;
}): number | null {
  const { project, season, seasonIndex, releaseAbs, currentAbs } = params;

  if (season?.premiereDate && typeof season.premiereDate.week === 'number' && typeof season.premiereDate.year === 'number') {
    return absWeek(season.premiereDate.week, season.premiereDate.year);
  }

  const episode1 = Array.isArray(season?.episodes) ? season.episodes.find((ep: any) => ep && ep.episodeNumber === 1) : null;
  if (episode1?.airDate && typeof episode1.airDate.week === 'number' && typeof episode1.airDate.year === 'number') {
    return absWeek(episode1.airDate.week, episode1.airDate.year);
  }

  const format = normalizeReleaseFormat(project, season);
  const total = seasonTotalEpisodes(project, season, seasonIndex);

  return inferPremiereAbsFromAired({ season, seasonIndex, releaseAbs, currentAbs, format, totalEpisodes: total });
}

export function effectiveArrivalAbs(project: Project, releaseAbs: number, currentAbs: number): number {
  const baseFormat = normalizeReleaseFormat(project);

  // Only series-like titles get episode cadence behavior.
  if (project.type !== 'series' && project.type !== 'limited-series') return releaseAbs;

  const seasons = Array.isArray(project.seasons) ? project.seasons : [];

  if (seasons.length === 0) {
    if (baseFormat === 'binge') return releaseAbs;

    const total = typeof project.episodeCount === 'number' && project.episodeCount > 0 ? clampInt(project.episodeCount, 1, 30) : 0;
    if (total <= 0) return releaseAbs;

    const batchSize = baseFormat === 'batch' ? 3 : 1;
    const weeksSincePremiere = Math.max(0, currentAbs - releaseAbs);
    const derivedAired = clampInt(Math.min(total, (weeksSincePremiere + 1) * batchSize), 0, total);

    const dropsAired = derivedAired > 0 ? Math.ceil(derivedAired / batchSize) : 0;
    const totalDrops = Math.max(1, Math.ceil(total / batchSize));

    const lastDropIndex = clampInt(dropsAired - 1, 0, totalDrops - 1);
    return releaseAbs + lastDropIndex;
  }

  let bestAbs = releaseAbs;

  for (let i = 0; i < seasons.length; i += 1) {
    const season = seasons[i];
    const premiereAbs = seasonPremiereAbs({ project, season, seasonIndex: i, releaseAbs, currentAbs });
    if (premiereAbs == null) continue;
    if (premiereAbs > currentAbs) continue;

    const total = seasonTotalEpisodes(project, season, i);
    if (total <= 0) continue;

    const format = normalizeReleaseFormat(project, season);

    const aired = seasonEpisodesAired({
      season,
      currentAbs,
      premiereAbs,
      format,
      totalEpisodes: total,
    });

    if (aired <= 0) continue;

    const batchSize = format === 'batch' ? 3 : 1;

    const dropsAired = format === 'binge' ? 1 : Math.ceil(aired / batchSize);
    const totalDrops = Math.max(1, Math.ceil(total / batchSize));
    const lastDropIndex = clampInt(dropsAired - 1, 0, totalDrops - 1);

    const candidate = Math.min(currentAbs, premiereAbs + lastDropIndex);
    if (candidate > bestAbs) bestAbs = candidate;
  }

  return bestAbs;
}
