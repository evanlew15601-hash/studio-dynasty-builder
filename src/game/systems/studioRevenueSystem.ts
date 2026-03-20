import type { GameState, PostTheatricalRelease, Project } from '@/types/game';
import type { TickSystem } from '../core/types';

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function isTvProject(project: Project): boolean {
  return project.type === 'series' || project.type === 'limited-series';
}

function isPrimaryStreamingFilm(project: Project): boolean {
  return !isTvProject(project) && project.releaseStrategy?.type === 'streaming';
}

function isTheatricalFilm(project: Project): boolean {
  return !isTvProject(project) && !isPrimaryStreamingFilm(project);
}

function getReleaseWeekYear(project: Project): { week: number; year: number } | null {
  const w = typeof project.releaseWeek === 'number' ? project.releaseWeek : null;
  const y = typeof project.releaseYear === 'number' ? project.releaseYear : null;
  if (w && y) return { week: w, year: y };

  const sw = typeof project.scheduledReleaseWeek === 'number' ? project.scheduledReleaseWeek : null;
  const sy = typeof project.scheduledReleaseYear === 'number' ? project.scheduledReleaseYear : null;
  if (sw && sy) return { week: sw, year: sy };

  return null;
}

function earnedPostTheatricalThisWeek(params: {
  release: PostTheatricalRelease;
  week: number;
  year: number;
}): number {
  const { release, week, year } = params;

  if (release.lastProcessedWeek !== week || release.lastProcessedYear !== year) return 0;

  const currentAbs = absWeek(week, year);
  const scheduledAbs =
    release.status === 'planned' && typeof release.releaseWeek === 'number' && typeof release.releaseYear === 'number'
      ? absWeek(release.releaseWeek, release.releaseYear)
      : null;

  if (scheduledAbs != null && scheduledAbs > currentAbs) return 0;
  if (release.status === 'planned') return 0;

  const weeklyRevenue = Math.max(0, Math.round((release.weeklyRevenue as any) || 0));
  return weeklyRevenue;
}

export const StudioRevenueSystem: TickSystem = {
  id: 'studioRevenue',
  label: 'Studio revenue',
  dependsOn: ['studioEconomy'],
  onTick: (state, ctx) => {
    const currentAbs = absWeek(ctx.week, ctx.year);

    let budgetDelta = 0;

    for (const project of state.projects || []) {
      if (!project || project.status !== 'released') continue;

      if (isTheatricalFilm(project)) {
        const rel = getReleaseWeekYear(project);
        if (rel) {
          const releaseAbs = absWeek(rel.week, rel.year);
          if (currentAbs >= releaseAbs) {
            const expectedWeeksSinceRelease = Math.max(0, currentAbs - releaseAbs);
            const currentWeeksSinceRelease =
              typeof project.metrics?.weeksSinceRelease === 'number' ? project.metrics.weeksSinceRelease : expectedWeeksSinceRelease;

            if (project.metrics?.theatricalRunLocked !== true && currentWeeksSinceRelease === expectedWeeksSinceRelease) {
              const weeklyRevenue = Math.max(0, Math.round((project.metrics?.lastWeeklyRevenue as any) || 0));
              if (weeklyRevenue > 0) {
                budgetDelta += weeklyRevenue * 0.55;
              }
            }
          }
        }
      }

      const releases = project.postTheatricalReleases;
      if (!Array.isArray(releases) || releases.length === 0) continue;

      for (const r of releases) {
        if (!r) continue;
        budgetDelta += earnedPostTheatricalThisWeek({ release: r, week: ctx.week, year: ctx.year });
      }
    }

    if (budgetDelta === 0) return state;

    return {
      ...state,
      studio: {
        ...state.studio,
        budget: (state.studio.budget || 0) + budgetDelta,
      },
    } as GameState;
  },
};
