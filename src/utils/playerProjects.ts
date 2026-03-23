import type { GameState, Project } from '@/types/game';

export function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

export function getPlayerProjectIds(state: GameState | null | undefined): Set<string> {
  return new Set<string>((state?.projects || []).map((p) => p.id));
}

export function isPlayerOwnedProject(params: {
  project: Project;
  state: GameState;
  playerProjectIds?: Set<string>;
}): boolean {
  const { project, state } = params;
  const playerProjectIds = params.playerProjectIds ?? getPlayerProjectIds(state);

  if (playerProjectIds.has(project.id)) return true;

  const studioId = (project as any)?.studioId;
  if (studioId && (studioId === state.studio.id || studioId === 'player' || studioId === 'player-studio')) {
    return true;
  }

  const studioName = (project as any)?.studioName;
  if (typeof studioName === 'string' && studioName.trim().length > 0) {
    return studioName === state.studio.name;
  }

  return false;
}

export function getAllKnownProjects(state: GameState | null | undefined): Project[] {
  if (!state) return [];

  const sources: any[][] = [
    state.projects || [],
    ((state as any).aiStudioProjects as any[]) || [],
    state.allReleases || [],
  ];

  const out: Project[] = [];
  const seenIds = new Set<string>();

  for (const src of sources) {
    for (const raw of src) {
      if (!isProjectLike(raw)) continue;
      if (seenIds.has(raw.id)) continue;
      seenIds.add(raw.id);
      out.push(raw);
    }
  }

  return out;
}
