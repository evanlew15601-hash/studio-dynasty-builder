import type { GameState, Project, ProductionRole, ContractedTalent } from '@/types/game';
import { isProjectLike } from '@/utils/playerProjects';

function uniqBy<T>(items: T[], key: (v: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function normalizeCreditsForProject(project: Project, talentTypeById: Map<string, string>): Project {
  const cast0 = (project.cast || []) as ProductionRole[];
  const crew0 = (project.crew || []) as ProductionRole[];

  let moved = false;

  const cast: ProductionRole[] = [];
  const crew: ProductionRole[] = [];

  for (const c of cast0) {
    const tid = (c as any)?.talentId as string | undefined;
    const tType = tid ? talentTypeById.get(tid) : undefined;

    if (tType === 'director') {
      crew.push(c);
      moved = true;
    } else {
      cast.push(c);
    }
  }

  for (const c of crew0) {
    const tid = (c as any)?.talentId as string | undefined;
    const tType = tid ? talentTypeById.get(tid) : undefined;

    if (tType === 'actor') {
      cast.push(c);
      moved = true;
    } else {
      crew.push(c);
    }
  }

  if (!moved) return project;

  const key = (r: ProductionRole) => `${(r as any).talentId || ''}|${(r as any).role || ''}`;

  const normalizedCast = uniqBy(cast, key);
  const normalizedCrew = uniqBy(crew, key);

  // contractedTalent isn't split into cast/crew, but we can at least dedupe it after moves.
  const contracted = (project.contractedTalent || []) as ContractedTalent[];
  const normalizedContracted = uniqBy(contracted, (ct) => `${ct.talentId}|${ct.role}`);

  return {
    ...project,
    cast: normalizedCast,
    crew: normalizedCrew,
    contractedTalent: normalizedContracted,
  } as any;
}

export function normalizeProjectCreditsState(state: GameState): GameState {
  const talentTypeById = new Map((state.talent || []).map((t: any) => [t.id, t.type]));

  let changed = false;

  const projects = (state.projects || []).map((p) => {
    const next = normalizeCreditsForProject(p as any, talentTypeById);
    if (next !== p) changed = true;
    return next;
  }) as any;

  const allReleases = (state.allReleases || []).map((p) => {
    if (!isProjectLike(p)) return p;
    const next = normalizeCreditsForProject(p as any, talentTypeById);
    if (next !== p) changed = true;
    return next;
  }) as any;

  if (!changed) return state;

  return {
    ...state,
    projects,
    allReleases,
  } as any;
}
