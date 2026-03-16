import type { Franchise, GameState, Project, Script } from '@/types/game';

function uniqStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const v of values) {
    if (typeof v !== 'string') continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }

  return out;
}

function normalizeTitle(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeParodySource(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

const STATUS_RANK: Record<Franchise['status'], number> = {
  retired: 0,
  dormant: 1,
  rebooted: 2,
  active: 3,
};

function pickBetterStatus(a: Franchise['status'] | undefined, b: Franchise['status'] | undefined): Franchise['status'] {
  if (!a) return b ?? 'active';
  if (!b) return a;
  return (STATUS_RANK[b] ?? 0) > (STATUS_RANK[a] ?? 0) ? b : a;
}

function pickEarlierIsoDate(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function mergeFranchise(existing: Franchise, incoming: Franchise): Franchise {
  const mergedEntries = uniqStrings([...(existing.entries || []), ...(incoming.entries || [])]);
  const mergedTags = uniqStrings([...(existing.franchiseTags || []), ...(incoming.franchiseTags || [])]);
  const mergedGenre = uniqStrings([...(existing.genre || []), ...(incoming.genre || [])]) as any;

  const title = existing.title?.trim() ? existing.title : incoming.title;
  const parodySource = existing.parodySource?.trim() ? existing.parodySource : incoming.parodySource;
  const inspirationLabel = existing.inspirationLabel?.trim() ? existing.inspirationLabel : incoming.inspirationLabel;

  return {
    ...existing,
    ...incoming,
    // Keep the canonical identity
    id: existing.id,
    creatorStudioId: existing.creatorStudioId,
    title,
    parodySource,
    inspirationLabel,
    originDate: pickEarlierIsoDate(existing.originDate, incoming.originDate) || existing.originDate || incoming.originDate || '2000-01-01',
    tone: (existing.tone ?? incoming.tone ?? 'light') as Franchise['tone'],
    status: pickBetterStatus(existing.status, incoming.status),
    culturalWeight: Math.max(existing.culturalWeight ?? 0, incoming.culturalWeight ?? 0),
    cost: Math.max(existing.cost ?? 0, incoming.cost ?? 0),
    genre: mergedGenre,
    franchiseTags: mergedTags,
    entries: mergedEntries,
  };
}

/**
 * Best-effort normalization for franchise arrays.
 *
 * - Removes duplicate franchise ids.
 * - Merges `entries` (union, stable order).
 */
export function normalizeFranchises(franchises: Franchise[] | null | undefined): Franchise[] {
  const input = Array.isArray(franchises) ? franchises : [];

  const order: string[] = [];
  const byId = new Map<string, Franchise>();

  for (const franchise of input) {
    if (!franchise || typeof franchise.id !== 'string' || !franchise.id.trim()) continue;

    const id = franchise.id;
    const existing = byId.get(id);

    if (!existing) {
      order.push(id);
      byId.set(id, {
        ...franchise,
        entries: uniqStrings(franchise.entries),
      });
      continue;
    }

    const mergedEntries = uniqStrings([...(existing.entries || []), ...(franchise.entries || [])]);

    byId.set(id, {
      ...existing,
      ...franchise,
      entries: mergedEntries,
    });
  }

  return order.map((id) => byId.get(id)!).filter(Boolean);
}

/**
 * Normalizes franchises and also rewrites any project/script references when a duplicate franchise
 * is merged (currently: same player-owned title with multiple ids).
 */
export function normalizeFranchisesState(state: GameState): GameState {
  const baseFranchises = normalizeFranchises(state.franchises);
  const playerStudioId = state.studio?.id;

  let mergedByTitle = false;

  const canonicalById = new Map<string, string>();
  const keyOrder: string[] = [];
  const byKey = new Map<string, Franchise>();

  for (const franchise of baseFranchises) {
    const ownedByPlayer = !!playerStudioId && franchise.creatorStudioId === playerStudioId;
    const isWorld = franchise.creatorStudioId === 'world';

    // Marketplace franchises should be stable per underlying property.
    // If we ever accumulate duplicates (e.g., from older saves/mods), merge them.
    const worldParodyKey = isWorld ? normalizeParodySource(franchise.parodySource) : '';
    const worldTitleKey = isWorld ? normalizeTitle(franchise.title) : '';

    const key = ownedByPlayer
      ? `${franchise.creatorStudioId}::${normalizeTitle(franchise.title)}`
      : isWorld && worldParodyKey
      ? `world::parody::${worldParodyKey}`
      : isWorld && worldTitleKey
      ? `world::title::${worldTitleKey}`
      : `id::${franchise.id}`;

    const existing = byKey.get(key);

    if (!existing) {
      keyOrder.push(key);
      byKey.set(key, franchise);
      canonicalById.set(franchise.id, franchise.id);
      continue;
    }

    mergedByTitle = true;
    canonicalById.set(franchise.id, existing.id);

    byKey.set(key, mergeFranchise(existing, franchise));
  }

  const mapId = (id: string | null | undefined): string | null | undefined => {
    if (!id) return id;
    return canonicalById.get(id) ?? id;
  };

  const nextFranchises = keyOrder.map((k) => byKey.get(k)!).filter(Boolean);

  let projectsTouched = false;
  const inputProjects = (state.projects || []) as Project[];
  let nextProjects: Project[] = inputProjects.map((p) => {
    const scriptFranchiseId = mapId((p as any)?.script?.franchiseId);
    const projectFranchiseId = mapId((p as any)?.franchiseId);

    let changed = false;
    let nextScript = (p as any).script as Script | undefined;

    if (nextScript && scriptFranchiseId !== nextScript.franchiseId) {
      nextScript = { ...nextScript, franchiseId: scriptFranchiseId as any };
      changed = true;
    }

    if (projectFranchiseId !== (p as any).franchiseId) {
      changed = true;
    }

    if (!changed) return p;

    projectsTouched = true;

    return {
      ...(p as any),
      franchiseId: projectFranchiseId as any,
      script: nextScript ?? (p as any).script,
    } as Project;
  });

  if (!projectsTouched) nextProjects = inputProjects;

  let scriptsTouched = false;
  const inputScripts = (state.scripts || []) as Script[];
  let nextScripts: Script[] = inputScripts.map((s) => {
    const nextFranchiseId = mapId((s as any).franchiseId);
    if (nextFranchiseId === (s as any).franchiseId) return s;
    scriptsTouched = true;
    return { ...(s as any), franchiseId: nextFranchiseId } as Script;
  });

  if (!scriptsTouched) nextScripts = inputScripts;

  // Ensure franchise entries reflect referenced projects (and remain deduped).
  const entriesFromProjects = new Map<string, string[]>();
  for (const p of nextProjects) {
    const fid = (p as any)?.script?.franchiseId || (p as any)?.franchiseId;
    if (!fid || typeof fid !== 'string') continue;

    const existing = entriesFromProjects.get(fid) || [];
    entriesFromProjects.set(fid, [...existing, p.id]);
  }

  let entriesTouched = false;
  const nextFranchisesWithEntries = nextFranchises.map((f) => {
    const fromProjects = entriesFromProjects.get(f.id) || [];
    const merged = uniqStrings([...(f.entries || []), ...fromProjects]);
    if (merged.length === (f.entries || []).length && merged.every((v, i) => v === (f.entries || [])[i])) {
      return f;
    }
    entriesTouched = true;
    return { ...f, entries: merged };
  });

  const inputFranchises = (state.franchises || []) as Franchise[];

  const dedupeChanged =
    baseFranchises.length !== inputFranchises.length ||
    baseFranchises.some((f, i) => inputFranchises[i]?.id !== f.id);

  const franchisesTouched = dedupeChanged || mergedByTitle || entriesTouched;

  if (!franchisesTouched && !projectsTouched && !scriptsTouched) return state;

  return {
    ...state,
    franchises: nextFranchisesWithEntries,
    projects: nextProjects,
    scripts: nextScripts,
  };
}
