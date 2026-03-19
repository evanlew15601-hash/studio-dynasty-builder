import type { GameState, Project } from '@/types/game';
import type { TickSystem } from '../core/types';

function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

function isTheatricalProject(project: Project): boolean {
  const kind = (project.type as any) as string;
  if (kind === 'series' || kind === 'limited-series') return false;

  const releaseType = project.releaseStrategy?.type;
  if (releaseType === 'streaming') return false;

  return true;
}

export const ScheduledReleaseSystem: TickSystem = {
  id: 'scheduledReleases',
  label: 'Scheduled releases',
  onTick: (state, ctx) => {
    const currentAbs = ctx.year * 52 + ctx.week;

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

    for (const project of unique) {
      if (!project || project.status !== 'scheduled-for-release') continue;
      if (!isTheatricalProject(project)) continue;

      const w = typeof project.scheduledReleaseWeek === 'number' ? project.scheduledReleaseWeek : null;
      const y = typeof project.scheduledReleaseYear === 'number' ? project.scheduledReleaseYear : null;
      if (!w || !y) continue;

      const releaseAbs = y * 52 + w;
      if (currentAbs < releaseAbs) continue;

      updatedById.set(project.id, {
        ...project,
        status: 'released',
        currentPhase: 'distribution' as any,
        phaseDuration: -1,
        releaseWeek: w,
        releaseYear: y,
        scheduledReleaseWeek: w,
        scheduledReleaseYear: y,
        readyForRelease: false,
      });
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
