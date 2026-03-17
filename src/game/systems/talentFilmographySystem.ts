import type { GameState, Project } from '@/types/game';
import { TalentFilmographyManager } from '@/utils/talentFilmographyManager';
import type { TickSystem } from '../core/types';

function isReleasedThisWeek(p: Project, week: number, year: number): boolean {
  return p.status === 'released' && p.releaseWeek === week && p.releaseYear === year;
}

/**
 * Engine-owned filmography updates.
 *
 * This reuses the existing TalentFilmographyManager logic, but runs inside the deterministic tick.
 */
export const TalentFilmographySystem: TickSystem = {
  id: 'talentFilmography',
  label: 'Talent filmography',
  onTick: (state, ctx) => {
    if (state.mode === 'online') return state;

    const released = (state.projects || []).filter((p) => isReleasedThisWeek(p, ctx.week, ctx.year));
    if (released.length === 0) return state;

    let next: GameState = state;
    for (const p of released) {
      next = TalentFilmographyManager.updateFilmographyOnRelease(next, p);
    }

    return next;
  },
};
