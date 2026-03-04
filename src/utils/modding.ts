import type { ModBundle, ModInfo, ModPatch } from '@/types/modding';

export const MOD_BUNDLE_VERSION = 1 as const;

export function createEmptyModBundle(): ModBundle {
  return { version: MOD_BUNDLE_VERSION, mods: [], patches: [] };
}

export function normalizeModBundle(input: unknown): ModBundle {
  const empty = createEmptyModBundle();
  if (!input || typeof input !== 'object') return empty;

  const candidate = input as Partial<ModBundle>;
  if (candidate.version !== MOD_BUNDLE_VERSION) return empty;

  const mods = Array.isArray(candidate.mods) ? (candidate.mods as ModInfo[]).filter(Boolean) : [];
  const patches = Array.isArray(candidate.patches) ? (candidate.patches as ModPatch[]).filter(Boolean) : [];

  return { version: MOD_BUNDLE_VERSION, mods, patches };
}

export function getEnabledModsSorted(bundle: ModBundle): ModInfo[] {
  return (bundle.mods || [])
    .filter((m) => !!m && m.enabled)
    .slice()
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.id.localeCompare(b.id));
}

export function getPatchesForEntity(bundle: ModBundle, entityType: string): ModPatch[] {
  const enabledMods = getEnabledModsSorted(bundle);
  const enabledIds = new Set(enabledMods.map((m) => m.id));
  const modOrder = new Map<string, number>();
  enabledMods.forEach((m, idx) => modOrder.set(m.id, idx));

  return (bundle.patches || [])
    .filter((p) => !!p && p.entityType === entityType && enabledIds.has(p.modId))
    .slice()
    .sort((a, b) => {
      const ma = modOrder.get(a.modId) ?? 0;
      const mb = modOrder.get(b.modId) ?? 0;
      return ma - mb;
    });
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

  let next = base.slice();

  for (const patch of patches) {
    if (patch.op === 'delete') {
      if (!patch.target) continue;
      next = next.filter((item) => getKey(item) !== patch.target);
      continue;
    }

    if (patch.op === 'insert') {
      const incoming = patch.payload as T | undefined;
      if (!incoming) continue;

      const key = getKey(incoming);
      const idx = next.findIndex((item) => getKey(item) === key);
      if (idx === -1) {
        next = [...next, incoming];
      } else {
        const merged = deepMerge(next[idx], incoming);
        const copy = next.slice();
        copy[idx] = merged;
        next = copy;
      }
      continue;
    }

    if (patch.op === 'update') {
      if (!patch.target) continue;
      const idx = next.findIndex((item) => getKey(item) === patch.target);
      if (idx === -1) continue;

      const merged = deepMerge(next[idx], patch.payload);
      const copy = next.slice();
      copy[idx] = merged;
      next = copy;
      continue;
    }
  }

  return next;
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
      next = { ...next, [key]: value };
      continue;
    }
  }

  return next;
}
