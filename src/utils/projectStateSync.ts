import type { GameState, Project } from '@/types/game';
import { isProjectLike } from '@/utils/playerProjects';

export function syncProjectCollections(state: GameState): GameState {
  const projectsIn = state.projects || [];
  const aiIn = (state.aiStudioProjects || []) as any[];
  const allIn = (state.allReleases || []) as any[];

  const canonicalById = new Map<string, Project>();

  // Lowest precedence first.
  for (const r of allIn) {
    if (!isProjectLike(r)) continue;
    if (!canonicalById.has(r.id)) canonicalById.set(r.id, r);
  }

  for (const r of aiIn) {
    if (!isProjectLike(r)) continue;
    canonicalById.set(r.id, r);
  }

  for (const r of projectsIn) {
    if (!isProjectLike(r)) continue;
    canonicalById.set(r.id, r);
  }

  const patchArray = <T,>(arr: T[]): { next: T[]; changed: boolean } => {
    let changed = false;

    const next = arr.map((v: any) => {
      if (!isProjectLike(v)) return v;
      const c = canonicalById.get(v.id);
      if (!c) return v;
      if (c === v) return v;
      changed = true;
      return c as any;
    });

    return { next, changed };
  };

  const projectsPatched = patchArray(projectsIn);
  const aiPatched = patchArray(aiIn);
  const allPatched = patchArray(allIn as any);

  if (!projectsPatched.changed && !aiPatched.changed && !allPatched.changed) return state;

  return {
    ...state,
    projects: projectsPatched.next as any,
    aiStudioProjects: aiPatched.next as any,
    allReleases: allPatched.next as any,
  } as GameState;
}
