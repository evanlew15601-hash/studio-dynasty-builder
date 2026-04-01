import type { GameState, Project } from '@/types/game';
import type { TickSystem } from '../core/types';
import { StreamingFilmSystem } from '@/game/sim/streamingFilmSystem';
import { isPrimaryStreamingFilm } from '@/utils/projectMedium';

function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

export const StreamingPerformanceSystem: TickSystem = {
  id: 'streamingPerformance',
  label: 'Streaming performance',
  dependsOn: ['scheduledReleases'],
  onTick: (state, ctx) => {
    const currentAbs = absWeek(ctx.week, ctx.year);

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
    const unique = candidates.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const updatedById = new Map<string, Project>();

    for (const project0 of unique) {
      if (!project0 || project0.status !== 'released') continue;
      if (!isPrimaryStreamingFilm(project0)) continue;

      const w = typeof project0.releaseWeek === 'number' ? project0.releaseWeek : null;
      const y = typeof project0.releaseYear === 'number' ? project0.releaseYear : null;
      if (!w || !y) continue;

      const releaseAbs = absWeek(w, y);
      if (currentAbs < releaseAbs) continue;

      const expectedWeeksSinceRelease = Math.max(0, currentAbs - releaseAbs);

      const lastProcessed = typeof project0.metrics?.weeksSinceRelease === 'number' ? project0.metrics.weeksSinceRelease : null;

      // Ensure the release week is initialized if older saves produced streaming projects
      // without streaming metrics.
      let project = project0;
      if (!project.metrics?.streaming && expectedWeeksSinceRelease === 0) {
        const premierePlatformLabel =
          project.distributionStrategy?.primary?.type === 'streaming' ? project.distributionStrategy.primary.platform : undefined;
        project = StreamingFilmSystem.initializeRelease(project, w, y, premierePlatformLabel);
      }

      if (lastProcessed != null && lastProcessed >= expectedWeeksSinceRelease) {
        if (project !== project0) updatedById.set(project.id, project);
        continue;
      }

      const next = StreamingFilmSystem.processWeeklyPerformance(project, ctx.week, ctx.year);
      if (next !== project0) updatedById.set(project0.id, next);
    }

    if (updatedById.size === 0) return state;

    const patch = (value: any): any => {
      if (!isProjectLike(value)) return value;
      return updatedById.get(value.id) || value;
    };

    return {
      ...(state as GameState),
      projects: (state.projects || []).map(patch) as Project[],
      aiStudioProjects: ((state.aiStudioProjects as any) || []).map(patch) as Project[],
      allReleases: (state.allReleases || []).map(patch) as Array<Project | any>,
    };
  },
};
