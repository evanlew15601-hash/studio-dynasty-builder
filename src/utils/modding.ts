import type { ModBundle, ModInfo, ModPatch } from '@/types/modding';

export const MOD_BUNDLE_VERSION = 1 as const;

export function createEmptyModBundle(): ModBundle {
  return { version: MOD_BUNDLE_VERSION, mods: [], patches: [] };
}

function normalizeModInfo(input: unknown): ModInfo | null {
  if (!input || typeof input !== 'object') return null;

  const m = input as Partial<ModInfo>;
  if (!m.id || typeof m.id !== 'string') return null;

  const id = m.id;

  return {
    id,
    name: typeof m.name === 'string' && m.name.trim() ? m.name : id,
    version: typeof m.version === 'string' && m.version.trim() ? m.version : '1.0.0',
    author: typeof m.author === 'string' && m.author.trim() ? m.author : undefined,
    enabled: typeof m.enabled === 'boolean' ? m.enabled : true,
    priority: typeof m.priority === 'number' ? m.priority : undefined,
  };
}

function normalizePatch(input: unknown): Omit<ModPatch, 'id'> & { id?: string } | null {
  if (!input || typeof input !== 'object') return null;

  const p = input as Partial<ModPatch>;
  if (!p.modId || typeof p.modId !== 'string') return null;
  if (!p.entityType || typeof p.entityType !== 'string') return null;
  if (!p.op || !['insert', 'update', 'delete'].includes(p.op)) return null;

  const target = typeof p.target === 'string' && p.target.trim() ? p.target : undefined;
  if ((p.op === 'update' || p.op === 'delete') && !target) return null;

  return {
    id: typeof p.id === 'string' && p.id.trim() ? p.id : undefined,
    modId: p.modId,
    entityType: p.entityType,
    op: p.op,
    target,
    payload: p.payload,
  };
}

export function normalizeModBundle(input: unknown): ModBundle {
  const empty = createEmptyModBundle();
  if (!input || typeof input !== 'object') return empty;

  const candidate = input as Partial<ModBundle>;

  // Treat missing version as v1 to reduce friction for hand-written mods.
  if (candidate.version !== MOD_BUNDLE_VERSION && candidate.version != null) return empty;

  const modsInput = Array.isArray(candidate.mods) ? candidate.mods : [];
  const patchesInput = Array.isArray(candidate.patches) ? candidate.patches : [];

  const mods = modsInput.map(normalizeModInfo).filter((m): m is ModInfo => !!m);

  const usedPatchIds = new Set<string>();
  const patches = patchesInput
    .map(normalizePatch)
    .filter((p): p is Omit<ModPatch, 'id'> & { id?: string } => !!p)
    .map((p, idx) => {
      let id = p.id;
      if (id && usedPatchIds.has(id)) id = undefined;

      if (!id) {
        let suffix = 1;
        do {
          id = `p-${idx + 1}-${suffix}`;
          suffix++;
        } while (usedPatchIds.has(id));
      }

      usedPatchIds.add(id);
      const { id: _id, ...rest } = p;
      return { id, ...rest };
    });

  // If no valid mods were provided, infer a mod list from patches so the bundle still works.
  if (mods.length === 0 && patches.length > 0) {
    const inferredMods: ModInfo[] = [];
    const seen = new Set<string>();

    for (const patch of patches) {
      if (seen.has(patch.modId)) continue;
      seen.add(patch.modId);
      inferredMods.push({ id: patch.modId, name: patch.modId, version: '1.0.0', enabled: true, priority: 0 });
    }

    return { version: MOD_BUNDLE_VERSION, mods: inferredMods, patches };
  }

  return { version: MOD_BUNDLE_VERSION, mods, patches };
}

export function getEnabledModsSorted(bundle: ModBundle): ModInfo[] {
  return (bundle.mods || [])
    .filter((m) => !!m && m.enabled)
    .slice()
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.id.localeCompare(b.id));
}

type PatchIndexCache = {
  modsRef: ModBundle['mods'];
  patchesRef: ModBundle['patches'];
  patchesByEntity: Map<string, ModPatch[]>;
};

const patchIndexCache = new WeakMap<ModBundle, PatchIndexCache>();

function getPatchIndex(bundle: ModBundle): PatchIndexCache {
  const modsRef = bundle.mods || [];
  const patchesRef = bundle.patches || [];

  const cached = patchIndexCache.get(bundle);
  if (cached && cached.modsRef === modsRef && cached.patchesRef === patchesRef) return cached;

  const enabledMods = getEnabledModsSorted(bundle);
  const enabledIds = new Set(enabledMods.map((m) => m.id));
  const modOrder = new Map<string, number>();
  enabledMods.forEach((m, idx) => modOrder.set(m.id, idx));

  const patchesByEntity = new Map<string, ModPatch[]>();

  for (const p of patchesRef) {
    if (!p) continue;
    if (!enabledIds.has(p.modId)) continue;

    const list = patchesByEntity.get(p.entityType) || [];
    list.push(p);
    patchesByEntity.set(p.entityType, list);
  }

  for (const list of patchesByEntity.values()) {
    list.sort((a, b) => {
      const ma = modOrder.get(a.modId) ?? 0;
      const mb = modOrder.get(b.modId) ?? 0;
      return ma - mb;
    });
  }

  const next: PatchIndexCache = { modsRef, patchesRef, patchesByEntity };
  patchIndexCache.set(bundle, next);
  return next;
}

export function getPatchesForEntity(bundle: ModBundle, entityType: string): ModPatch[] {
  const idx = getPatchIndex(bundle);
  const list = idx.patchesByEntity.get(entityType) || [];
  // Return a copy to preserve the previous semantics (callers could mutate the array).
  return list.slice();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined) return base;
  if (Array.isArray(patch)) return patch as T;

  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch as T;
  }

  const result: Record<string, unknown> = { ...(base as any) };
  for (const [k, v] of Object.entries(patch)) {
    // Treat null as an explicit deletion marker in patch payloads.
    if (v === null) {
      if (k in result) delete (result as any)[k];
      continue;
    }

    const prev = (result as any)[k];
    if (Array.isArray(v)) {
      (result as any)[k] = v;
    } else if (isPlainObject(v) && isPlainObject(prev)) {
      (result as any)[k] = deepMerge(prev, v);
    } else {
      (result as any)[k] = v;
    }
  }

  return result as T;
}

export function applyPatchesByKey<T>(
  base: T[],
  patches: ModPatch[],
  getKey: (item: T) => string
): T[] {
  if (!patches.length) return base;

  // Linear-time patch application.
  // Important for large mod bundles (startup & save-load).
  const next = base.slice();
  const indicesByKey = new Map<string, number[]>();
  const deleted = new Set<number>();

  for (let i = 0; i < next.length; i++) {
    const k = getKey(next[i]);
    const list = indicesByKey.get(k);
    if (list) {
      list.push(i);
    } else {
      indicesByKey.set(k, [i]);
    }
  }

  const findIndexForKey = (key: string): number | undefined => {
    const list = indicesByKey.get(key);
    if (!list) return undefined;
    for (let i = 0; i < list.length; i++) {
      const idx = list[i];
      if (!deleted.has(idx)) return idx;
    }
    return undefined;
  };

  for (const patch of patches) {
    if (patch.op === 'delete') {
      if (!patch.target) continue;
      const list = indicesByKey.get(patch.target);
      if (!list) continue;
      for (const idx of list) deleted.add(idx);
      indicesByKey.delete(patch.target);
      continue;
    }

    if (patch.op === 'insert') {
      const incoming = patch.payload as T | undefined;
      if (!incoming) continue;

      const key = getKey(incoming);
      const existingIdx = findIndexForKey(key);

      if (existingIdx === undefined) {
        next.push(incoming);
        indicesByKey.set(key, [next.length - 1]);
      } else {
        next[existingIdx] = deepMerge(next[existingIdx], incoming);
      }

      continue;
    }

    if (patch.op === 'update') {
      if (!patch.target) continue;
      const existingIdx = findIndexForKey(patch.target);
      if (existingIdx === undefined) continue;
      next[existingIdx] = deepMerge(next[existingIdx], patch.payload);
      continue;
    }
  }

  if (!deleted.size) return next;
  return next.filter((_, idx) => !deleted.has(idx));
}

export function applyPatchesToRecord<T>(base: Record<string, T>, patches: ModPatch[]): Record<string, T> {
  if (!patches.length) return base;

  let next: Record<string, T> = { ...base };

  for (const patch of patches) {
    const key = patch.target;
    if (!key) continue;

    if (patch.op === 'delete') {
      if (key in next) {
        next = { ...next };
        delete next[key];
      }
      continue;
    }

    if (patch.op === 'insert' || patch.op === 'update') {
      const value = patch.payload as T | undefined;
      if (value === undefined) continue;

      if (key in next) {
        next = { ...next, [key]: deepMerge(next[key], value) };
      } else {
        next = { ...next, [key]: value };
      }
      continue;
    }
  }

  return next;
}
