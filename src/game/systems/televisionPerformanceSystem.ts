import type { GameState, Project } from '@/types/game';
import type { TickSystem } from '../core/types';
import { TVEpisodeSystem } from '@/game/sim/tvEpisodeSystem';
import { TVRatingsSystem } from '@/game/sim/tvRatingsSystem';

function isTvProject(project: Project): boolean {
  const kind = (project.type as any) as string;
  return kind === 'series' || kind === 'limited-series';
}

export const TelevisionPerformanceSystem: TickSystem = {
  id: 'televisionPerformance',
  label: 'Television performance',
  dependsOn: ['scheduledReleases'],
  onTick: (state, ctx) => {
    const projectsIn = (state.projects ?? []) as Project[];
    const aiIn = (state.aiStudioProjects ?? []) as Project[];
    const allIn = state.allReleases || [];

    const playerProjectIds = new Set(projectsIn.map((p) => p.id));

    let changed = false;

    const tickProject = (p: Project): Project => {
      if (!p || p.status !== 'released') return p;
      if (!isTvProject(p)) return p;

      let next = TVEpisodeSystem.ensureSeason(p);
      next = TVEpisodeSystem.autoReleaseEpisodesIfDue(next, ctx.week, ctx.year);
      next = TVEpisodeSystem.processWeeklyEpisodeDecay(next, ctx.week, ctx.year);
      next = TVRatingsSystem.processWeeklyRatings(next, ctx.week, ctx.year);

      if (next !== p) changed = true;
      return next;
    };

    const projectsOut = projectsIn.map(tickProject);
    const aiOut = aiIn.map(tickProject);

    const allOut = allIn.map((r) => {
      if (!r || typeof r !== 'object') return r;
      if (!('script' in (r as any))) return r;

      const p = r as Project;
      if (!playerProjectIds.has(p.id)) return r;

      return tickProject(p);
    });

    if (!changed) return state;

    return {
      ...(state as GameState),
      projects: projectsOut,
      aiStudioProjects: aiOut as any,
      allReleases: allOut as any,
    };
  },
};
