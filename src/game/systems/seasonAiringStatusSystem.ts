import type { GameState, Project } from '@/types/game';
import { isProjectLike } from '@/utils/playerProjects';
import type { SeasonData } from '@/types/streamingTypes';
import type { TickSystem } from '../core/types';

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(Math.max(min, Math.min(max, n)));
}

function seasonTotalEpisodes(project: Project, season: SeasonData, seasonIndex: number): number {
  const fallbackRaw = seasonIndex === 0 ? project.episodeCount : 10;
  const fallback = typeof fallbackRaw === 'number' && fallbackRaw > 0 ? fallbackRaw : 10;

  const nRaw = season.totalEpisodes ?? season.episodes?.length ?? fallback;
  const n = typeof nRaw === 'number' && nRaw > 0 ? nRaw : fallback;

  return clampInt(n, 1, 30);
}

function normalizeProductionStatus(status: unknown): SeasonData['productionStatus'] {
  if (status === 'planning' || status === 'filming' || status === 'post-production' || status === 'complete') {
    return status;
  }

  // Legacy value from older builds.
  if (status === 'airing') return 'complete';

  return 'planning';
}

export const SeasonAiringStatusSystem: TickSystem = {
  id: 'seasonAiringStatus',
  label: 'Season airing status normalization',
  dependsOn: ['platformOriginalsReleaseCadence'],
  onTick: (state, ctx) => {
    if (state.dlc?.streamingWars !== true) return state;

    const projectsIn = (state.projects ?? []) as Project[];
    if (projectsIn.length === 0) return state;

    const currentAbs = absWeek(ctx.week, ctx.year);

    let changed = false;

    const updatedById = new Map<string, Project>();

    const projectsOut = projectsIn.map((p) => {
      if (!p) return p;
      if (p.status !== 'released') return p;
      if (p.type !== 'series' && p.type !== 'limited-series') return p;

      const seasonsIn = Array.isArray(p.seasons) ? (p.seasons as SeasonData[]) : [];
      if (seasonsIn.length === 0) return p;

      let seasonsChanged = false;

      const seasonsOut = seasonsIn.map((s, idx) => {
        const total = seasonTotalEpisodes(p, s, idx);
        const aired = clampInt(s.episodesAired ?? 0, 0, total);

        const premiere = s.premiereDate;
        const premiereAbs = premiere ? absWeek(premiere.week, premiere.year) : null;
        const hasStarted = aired > 0 || (premiereAbs != null && premiereAbs <= currentAbs);

        const nextAiringStatus: SeasonData['airingStatus'] | undefined = !hasStarted
          ? s.airingStatus
          : aired >= total
            ? 'complete'
            : 'airing';

        const nextProductionStatus = normalizeProductionStatus((s as any).productionStatus);

        if (nextAiringStatus === s.airingStatus && nextProductionStatus === s.productionStatus) return s;

        seasonsChanged = true;

        return {
          ...s,
          productionStatus: nextProductionStatus,
          episodesAired: aired,
          ...(nextAiringStatus ? { airingStatus: nextAiringStatus } : {}),
        };
      });

      if (!seasonsChanged) return p;

      changed = true;

      const next = {
        ...p,
        seasons: seasonsOut,
      };

      updatedById.set(p.id, next);

      return next;
    });

    if (!changed) return state;

    const patch = (value: any): any => {
      if (!isProjectLike(value)) return value;
      return updatedById.get(value.id) || value;
    };

    return {
      ...(state as GameState),
      projects: projectsOut,
      aiStudioProjects: ((state.aiStudioProjects as any) || []).map(patch) as Project[],
      allReleases: (state.allReleases || []).map(patch) as Array<Project | any>,
    };
  },
};
