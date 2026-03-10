import type { GameState, Project } from '@/types/game';
import type { TickSystem } from '../core/types';
import { TVEpisodeSystem } from '@/components/game/TVEpisodeSystem';
import { TVRatingsSystem } from '@/components/game/TVRatingsSystem';

function isTvProject(p: Project): boolean {
  return p.type === 'series' || p.type === 'limited-series';
}

export const AiTelevisionSystem: TickSystem = {
  id: 'aiTelevision',
  label: 'AI television',
  onTick: (state, ctx) => {
    const allReleases = state.allReleases || [];
    if (allReleases.length === 0) return state;

    const playerProjectIds = new Set((state.projects || []).map((p) => p.id));

    let changed = false;

    const nextAllReleases = allReleases.map((r) => {
      if (!('script' in r)) return r;

      const p = r as Project;
      if (playerProjectIds.has(p.id)) return r;
      if (!isTvProject(p)) return r;
      if (!p.releaseWeek || !p.releaseYear) return r;

      let next = TVEpisodeSystem.ensureSeason(p);
      next = TVEpisodeSystem.autoReleaseEpisodesIfDue(next, ctx.week, ctx.year);
      next = TVEpisodeSystem.processWeeklyEpisodeDecay(next, ctx.week, ctx.year);
      next = TVRatingsSystem.processWeeklyRatings(next, ctx.week, ctx.year);

      if (next !== p) changed = true;
      return next;
    });

    if (!changed) return state;

    const nextState: GameState = {
      ...state,
      allReleases: nextAllReleases as any,
    };

    return nextState;
  },
};
