import type { GameState, Project } from '@/types/game';
import { isProjectLike } from '@/utils/playerProjects';

export type ProjectRef = {
  id: string;
  __projectRef: true;
};

function isProjectRef(value: any): value is ProjectRef {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && (value as any).__projectRef === true;
}

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
      if (!isProjectLike(v) && !isProjectRef(v)) return v;
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

export function compactProjectCollectionsForSave(state: GameState): GameState {
  const synced = syncProjectCollections(state);

  const primaryProjectIds = new Set<string>([...(synced.projects || []).map((p) => p.id)]);
  const aiProjectIds = new Set<string>((synced.aiStudioProjects || []).map((p: any) => p?.id).filter(Boolean));
  const projectIds = new Set<string>([...primaryProjectIds, ...aiProjectIds]);

  const aiStudioProjects = (synced.aiStudioProjects || []).filter((p: any) => !primaryProjectIds.has(p.id));

  const seenReleaseProjectIds = new Set<string>();
  const allReleases = (synced.allReleases || []).reduce<any[]>((acc, raw) => {
    if (isProjectLike(raw)) {
      if (seenReleaseProjectIds.has(raw.id)) return acc;
      seenReleaseProjectIds.add(raw.id);

      if (projectIds.has(raw.id)) {
        acc.push({ id: raw.id, __projectRef: true } satisfies ProjectRef);
      } else {
        acc.push(raw);
      }
      return acc;
    }

    if (isProjectRef(raw)) {
      if (seenReleaseProjectIds.has(raw.id)) return acc;
      seenReleaseProjectIds.add(raw.id);
      acc.push(raw);
      return acc;
    }

    acc.push(raw);
    return acc;
  }, []);

  return {
    ...synced,
    aiStudioProjects: aiStudioProjects as any,
    allReleases: allReleases as any,
  } as GameState;
}
