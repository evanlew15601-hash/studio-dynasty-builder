import type { GameState } from '@/types/game';

function uniqStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const v of values) {
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }

  return out;
}

/**
 * Best-effort normalization for Marketplace franchise license ownership.
 *
 * This keeps `studio.licensedFranchiseIds` stable for UI + one-time fee logic.
 *
 * Rules:
 * - Never removes ids (license ownership is permanent).
 * - Backfills from any existing player scripts/projects that reference a franchise.
 */
export function normalizeStudioLicensesState(state: GameState): GameState {
  const studio = state.studio;
  if (!studio) return state;

  const existing = uniqStrings(studio.licensedFranchiseIds);
  const ownedStudioId = studio.id;

  const derived: string[] = [];
  const maybeAdd = (id: unknown) => {
    if (typeof id !== 'string') return;
    const trimmed = id.trim();
    if (!trimmed) return;

    const franchise = (state.franchises || []).find((f) => f.id === trimmed);

    // Player-owned franchises don't need "license" semantics.
    if (franchise?.creatorStudioId && franchise.creatorStudioId === ownedStudioId) return;

    derived.push(trimmed);
  };

  for (const p of state.projects || []) {
    maybeAdd((p as any)?.script?.franchiseId ?? (p as any)?.franchiseId);
  }

  for (const s of state.scripts || []) {
    maybeAdd((s as any)?.franchiseId);
  }

  const next = uniqStrings([...existing, ...derived]);

  const same =
    next.length === existing.length &&
    next.every((id, i) => id === existing[i]);

  if (same) return state;

  return {
    ...state,
    studio: {
      ...studio,
      licensedFranchiseIds: next,
    },
  };
}
