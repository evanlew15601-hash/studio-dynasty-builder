import type { WorldHistoryEntry } from '@/types/game';

export function pushWorldHistory(
  entries: WorldHistoryEntry[] | undefined,
  entry: WorldHistoryEntry,
  options?: { max?: number }
): WorldHistoryEntry[] {
  const max = options?.max ?? 250;
  const current = entries || [];
  if (current.some((e) => e.id === entry.id)) return current;

  const next = [...current, entry];

  // Keep last N, but never drop importance 5 entries.
  const tail = next.slice(-max);
  const keepIds = new Set(tail.map((x) => x.id));

  for (const x of next) {
    if (x.importance === 5 && !keepIds.has(x.id)) {
      tail.push(x);
      keepIds.add(x.id);
    }
  }

  return tail;
}
