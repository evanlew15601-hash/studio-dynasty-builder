import type { BoxOfficeRelease, Project } from '@/types/game';

export type ReleasePoolItem = Project | BoxOfficeRelease;

export function getReleasePoolId(item: ReleasePoolItem): string | null {
  if (!item || typeof item !== 'object') return null;

  if ('script' in item) {
    return typeof (item as any).id === 'string' ? (item as any).id : null;
  }

  return typeof (item as any).projectId === 'string' ? (item as any).projectId : null;
}

// Dedupe a release pool where later entries should win.
// This matters when older copies of a project exist in `allReleases` (e.g. pre-release tracking),
// but the authoritative project is updated later in the tick (status -> released, metrics filled, etc.).
export function dedupeReleasePoolPreferLatest(items: ReleasePoolItem[]): ReleasePoolItem[] {
  const seen = new Set<string>();
  const out: ReleasePoolItem[] = [];

  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    const id = getReleasePoolId(item);

    if (!id) {
      out.push(item);
      continue;
    }

    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }

  return out.reverse();
}
