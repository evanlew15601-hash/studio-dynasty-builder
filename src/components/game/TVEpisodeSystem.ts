import type { Project } from '@/types/game';
import type { EpisodeData, SeasonData } from '@/types/streamingTypes';
import { TVRatingsSystem } from './TVRatingsSystem';

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function pseudoRandom01(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

function inferEpisodeCount(project: Project): number {
  const explicit = project.episodeCount;
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }

  const seasonCount = project.seasons?.[0]?.totalEpisodes;
  if (typeof seasonCount === 'number' && Number.isFinite(seasonCount) && seasonCount > 0) {
    return Math.floor(seasonCount);
  }

  return project.type === 'limited-series' ? 8 : 13;
}

function createSeasonData(project: Project, seasonNumber: number): SeasonData {
  const numEpisodes = inferEpisodeCount(project);

  const episodes: EpisodeData[] = Array.from({ length: numEpisodes }, (_, i) => ({
    episodeNumber: i + 1,
    seasonNumber,
    title: `Episode ${i + 1}`,
    runtime: 45,
    viewers: 0,
    completionRate: 0,
    averageWatchTime: 0,
    replayViews: 0,
    weeklyViews: [],
    cumulativeViews: 0,
    viewerRetention: 100,
    productionCost: (project.budget.total || 0) / numEpisodes,
    socialMentions: 0,
  }));

  return {
    seasonNumber,
    totalEpisodes: numEpisodes,
    episodesAired: 0,
    releaseFormat: project.releaseFormat || 'weekly',
    averageViewers: 0,
    seasonCompletionRate: 0,
    seasonDropoffRate: 0,
    totalBudget: project.budget.total || 0,
    spentBudget: 0,
    productionStatus: 'complete',
    episodes,
  };
}

function isTvProject(project: Project): boolean {
  return project.type === 'series' || project.type === 'limited-series';
}

export class TVEpisodeSystem {
  static ensureSeason(project: Project, seasonNumber: number = project.currentSeason || 1): Project {
    if (!isTvProject(project)) return project;

    const seasonIndex = Math.max(0, seasonNumber - 1);

    if (!project.seasons || project.seasons.length === 0) {
      return {
        ...project,
        seasons: [createSeasonData(project, 1)],
        currentSeason: 1,
      };
    }

    if (project.seasons.length <= seasonIndex) {
      const seasons = [...project.seasons];
      for (let i = seasons.length; i <= seasonIndex; i += 1) {
        seasons.push(createSeasonData(project, i + 1));
      }
      return {
        ...project,
        seasons,
      };
    }

    return project;
  }

  static autoReleaseEpisodesIfDue(project: Project, currentWeek: number, currentYear: number): Project {
    if (!isTvProject(project)) return project;
    if (project.status !== 'released') return project;

    const premiereWeek = project.releaseWeek;
    const premiereYear = project.releaseYear;
    if (!premiereWeek || !premiereYear) return project;

    const seasonNumber = project.currentSeason || 1;
    const seasonIndex = Math.max(0, seasonNumber - 1);
    const withSeason = this.ensureSeason(project, seasonNumber);
    const season = withSeason.seasons?.[seasonIndex];
    if (!season) return withSeason;

    const currentAbs = absWeek(currentWeek, currentYear);
    const premiereAbs = absWeek(premiereWeek, premiereYear);
    if (currentAbs < premiereAbs) return withSeason;

    const weeksSincePremiere = currentAbs - premiereAbs;
    const remaining = season.totalEpisodes - season.episodesAired;
    if (remaining <= 0) return withSeason;

    let episodesToRelease = 0;

    if (weeksSincePremiere === 0) {
      if (season.releaseFormat === 'binge') {
        episodesToRelease = remaining;
      } else if (season.releaseFormat === 'batch') {
        episodesToRelease = Math.min(3, remaining);
      } else {
        episodesToRelease = 1;
      }
    } else {
      if (season.releaseFormat === 'weekly') {
        episodesToRelease = 1;
      } else if (season.releaseFormat === 'batch') {
        episodesToRelease = Math.min(3, remaining);
      }
    }

    if (episodesToRelease <= 0) return withSeason;

    let updatedProject = withSeason;

    // Ratings + streaming metrics should only start once the season actually begins airing
    // (i.e., once we drop the first episode).
    if (!updatedProject.metrics?.streaming) {
      updatedProject = TVRatingsSystem.initializeAiring(updatedProject, premiereWeek, premiereYear);
    }

    const baseViewers = updatedProject.metrics?.streaming?.viewsFirstWeek || 1_000_000;

    const seasons = [...(updatedProject.seasons || [])];
    const updatedSeason: SeasonData = {
      ...season,
      releaseFormat: season.releaseFormat || updatedProject.releaseFormat || 'weekly',
      episodes: [...season.episodes],
    };

    const startEpisode = updatedSeason.episodesAired;
    const endEpisode = Math.min(startEpisode + episodesToRelease, updatedSeason.totalEpisodes);

    for (let i = startEpisode; i < endEpisode; i += 1) {
      const episode = updatedSeason.episodes[i];

      const multiplier = i === 0 ? 1.0 : Math.max(0.6, 1 - i * 0.05);
      const variation = 0.8 + pseudoRandom01(`${updatedProject.id}:${seasonNumber}:${episode.episodeNumber}:${currentYear}:${currentWeek}`) * 0.4;
      const viewers = Math.floor(baseViewers * multiplier * variation);

      const completionRate = Math.min(95, Math.max(45, Math.floor(65 + (updatedProject.metrics?.audienceScore || 60) * 0.25)));
      const averageWatchTime = Math.floor(episode.runtime * (completionRate / 100));
      const replayViews = Math.floor(viewers * (0.03 + pseudoRandom01(`${updatedProject.id}:replay:${episode.episodeNumber}`) * 0.05));

      const previousEpisode = i > 0 ? updatedSeason.episodes[i - 1] : undefined;
      const viewerRetention = previousEpisode?.viewers
        ? Math.min(100, Math.max(40, Math.floor((viewers / previousEpisode.viewers) * 100)))
        : 100;

      const updatedEpisode: EpisodeData = {
        ...episode,
        airDate: { week: currentWeek, year: currentYear },
        viewers,
        completionRate,
        averageWatchTime,
        replayViews,
        weeklyViews: episode.weeklyViews && episode.weeklyViews.length > 0 ? episode.weeklyViews : [viewers],
        cumulativeViews: (episode.cumulativeViews || 0) > 0 ? episode.cumulativeViews : viewers + replayViews,
        viewerRetention,
        socialMentions: Math.floor(viewers / 1000),
      };

      updatedSeason.episodes[i] = updatedEpisode;
    }

    updatedSeason.episodesAired = endEpisode;

    if (!updatedSeason.premiereDate && endEpisode > 0) {
      updatedSeason.premiereDate = { week: currentWeek, year: currentYear };
    }

    if (updatedSeason.episodesAired >= updatedSeason.totalEpisodes && !updatedSeason.finaleDate) {
      updatedSeason.finaleDate = { week: currentWeek, year: currentYear };
    }

    const airedEpisodes = updatedSeason.episodes.slice(0, updatedSeason.episodesAired);
    if (airedEpisodes.length > 0) {
      updatedSeason.averageViewers = Math.floor(airedEpisodes.reduce((sum, e) => sum + (e.viewers || 0), 0) / airedEpisodes.length);
      updatedSeason.seasonCompletionRate = Math.floor(airedEpisodes.reduce((sum, e) => sum + (e.completionRate || 0), 0) / airedEpisodes.length);
    }

    seasons[seasonIndex] = updatedSeason;

    return {
      ...updatedProject,
      seasons,
      releaseFormat: updatedSeason.releaseFormat,
    };
  }

  static processWeeklyEpisodeDecay(project: Project, currentWeek: number, currentYear: number): Project {
    if (!isTvProject(project)) return project;
    if (!project.seasons || project.seasons.length === 0) return project;

    let hasUpdates = false;

    const seasons = project.seasons.map(season => {
      const episodes = season.episodes.map(episode => {
        if (!episode.airDate) return episode;

        const weeksSinceAir = absWeek(currentWeek, currentYear) - absWeek(episode.airDate.week, episode.airDate.year);
        if (weeksSinceAir <= 0) return episode;

        const desiredLen = Math.min(12, weeksSinceAir + 1);
        const weeklyViews = episode.weeklyViews ? [...episode.weeklyViews] : [];
        if (weeklyViews.length >= desiredLen) return episode;

        const initial = weeklyViews[0] ?? episode.viewers;
        const decayRate = episode.episodeNumber === 1 ? 0.15 : 0.20;

        let cumulativeViews = episode.cumulativeViews || initial;

        for (let idx = weeklyViews.length; idx < desiredLen; idx += 1) {
          const views = Math.floor(initial * Math.pow(1 - decayRate, idx));
          weeklyViews.push(views);
          cumulativeViews += views;
        }

        hasUpdates = true;

        return {
          ...episode,
          weeklyViews,
          cumulativeViews,
        };
      });

      return {
        ...season,
        episodes,
      };
    });

    if (!hasUpdates) return project;

    return {
      ...project,
      seasons,
    };
  }
}
