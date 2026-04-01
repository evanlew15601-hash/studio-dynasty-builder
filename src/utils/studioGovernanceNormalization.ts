import type { GameState, StudioGovernance } from '@/types/game';
import { computeMaxActiveProjects } from '@/utils/studioGovernance';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizePressureValue(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return clamp(Math.round(v), 0, 100);
}

export function normalizeStudioGovernanceState(state: GameState): GameState {
  const maxActive = computeMaxActiveProjects(state.studio);

  const existing = state.governance as StudioGovernance | undefined;

  const next: StudioGovernance = {
    boardConfidence: normalizePressureValue(existing?.boardConfidence ?? 60),
    internalPressure: {
      board: normalizePressureValue(existing?.internalPressure?.board),
      finance: normalizePressureValue(existing?.internalPressure?.finance),
      investors: normalizePressureValue(existing?.internalPressure?.investors),
    },
    externalPressure: {
      competition: normalizePressureValue(existing?.externalPressure?.competition),
      talent: normalizePressureValue(existing?.externalPressure?.talent),
      market: normalizePressureValue(existing?.externalPressure?.market),
    },
    capability: {
      maxActiveProjects: clamp(Math.round(existing?.capability?.maxActiveProjects ?? maxActive), 1, 7),
    },
    lastUpdatedWeekIndex: typeof existing?.lastUpdatedWeekIndex === 'number' ? existing.lastUpdatedWeekIndex : undefined,
  };

  // Avoid churn if nothing changes.
  const same =
    existing &&
    existing.boardConfidence === next.boardConfidence &&
    existing.capability?.maxActiveProjects === next.capability.maxActiveProjects &&
    existing.internalPressure?.board === next.internalPressure.board &&
    existing.internalPressure?.finance === next.internalPressure.finance &&
    existing.internalPressure?.investors === next.internalPressure.investors &&
    existing.externalPressure?.competition === next.externalPressure.competition &&
    existing.externalPressure?.talent === next.externalPressure.talent &&
    existing.externalPressure?.market === next.externalPressure.market &&
    existing.lastUpdatedWeekIndex === next.lastUpdatedWeekIndex;

  if (same) return state;

  return {
    ...state,
    governance: next,
  };
}
