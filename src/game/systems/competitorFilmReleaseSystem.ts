import type { GameState, Project } from '@/types/game';
import type { TickSystem } from '../core/types';
import { StudioGenerator } from '@/data/StudioGenerator';
import { attachBasicCastForAI } from '@/utils/attachBasicCastForAI';

function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

export const CompetitorFilmReleaseSystem: TickSystem = {
  id: 'competitorReleases',
  label: 'Competitor theatrical releases',
  dependsOn: ['scheduledReleases'],
  onTick: (state, ctx) => {
    if (state.mode === 'online') return state;

    const studios = state.competitorStudios || [];
    if (studios.length === 0) return state;

    const sg = new StudioGenerator();
    const universeSeed = state.universeSeed ?? 0;

    const fallback = sg.getStudioProfile(studios[0].name);
    if (!fallback) return state;

    const existing = new Set<string>();
    for (const r of state.allReleases || []) {
      if (isProjectLike(r)) existing.add(r.id);
    }

    const newReleases: Project[] = [];

    for (const s of studios) {
      const profile = sg.getStudioProfile(s.name) || fallback;
      const p0 = sg.generateDeterministicStudioFilmReleaseOnly(profile, ctx.week, ctx.year, universeSeed);
      if (!p0) continue;

      if (existing.has(p0.id)) continue;
      existing.add(p0.id);

      // Attach credited cast so awards/filmography have real people.
      const p = attachBasicCastForAI(p0, state.talent || []);
      newReleases.push(p);
    }

    if (newReleases.length === 0) return state;

    return {
      ...state,
      allReleases: [...(state.allReleases || []), ...newReleases],
      aiStudioProjects: [...(state.aiStudioProjects || []), ...newReleases],
    } as GameState;
  },
};
