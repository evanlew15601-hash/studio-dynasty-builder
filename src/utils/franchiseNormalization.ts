import type { Franchise } from '@/types/game';

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
