import type { GameState, Project } from '@/types/game';
import { TalentFilmographyManager } from '@/utils/talentFilmographyManager';
import type { TickSystem } from '../core/types';

function isReleasedThisWeek(p: Project, week: number, year: number): boolean {
  return p.status === 'released' && p.releaseWeek === week && p.releaseYear === year;
}

function projectsReleasedThisWeek(state: GameState, week: number, year: number): Project[] {
  const byId = new Map<string, Project>();

  for (const p of state.projects || []) {
    if (!isReleasedThisWeek(p, week, year)) continue;
    byId.set(p.id, p);
  }

  for (const r of state.allReleases || []) {
    if (!r) continue;
    if (!('script' in (r as any))) continue;

    const p = r as Project;
    if (!isReleasedThisWeek(p, week, year)) continue;
    byId.set(p.id, p);
  }

  return [...byId.values()];
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

    const released = projectsReleasedThisWeek(state, ctx.week, ctx.year);
    if (released.length === 0) return state;

    let next: GameState = state;
    for (const p of released) {
      next = TalentFilmographyManager.updateFilmographyOnRelease(next, p);
    }

    return next;
  },
};
