import type { GameState, Script, Studio, StudioGovernance } from '@/types/game';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export type GovernanceImpact = {
  boardConfidenceDelta?: number;
  internalPressureDelta?: Partial<StudioGovernance['internalPressure']>;
  externalPressureDelta?: Partial<StudioGovernance['externalPressure']>;
};

export function applyGovernanceImpact(gov: StudioGovernance | undefined, impact: GovernanceImpact): StudioGovernance {
  const current: StudioGovernance = gov ?? {
    boardConfidence: 60,
    internalPressure: { board: 30, finance: 30, investors: 30 },
    externalPressure: { competition: 30, talent: 30, market: 30 },
    capability: { maxActiveProjects: 2 },
  };

  const internalPressure: StudioGovernance['internalPressure'] = { ...current.internalPressure };
  for (const key of Object.keys(impact.internalPressureDelta ?? {}) as Array<keyof StudioGovernance['internalPressure']>) {
    const delta = impact.internalPressureDelta?.[key];
    if (typeof delta !== 'number') continue;
    internalPressure[key] = clamp((internalPressure[key] ?? 0) + delta, 0, 100);
  }

  const externalPressure: StudioGovernance['externalPressure'] = { ...current.externalPressure };
  for (const key of Object.keys(impact.externalPressureDelta ?? {}) as Array<keyof StudioGovernance['externalPressure']>) {
    const delta = impact.externalPressureDelta?.[key];
    if (typeof delta !== 'number') continue;
    externalPressure[key] = clamp((externalPressure[key] ?? 0) + delta, 0, 100);
  }

  return {
    ...current,
    boardConfidence: clamp((current.boardConfidence ?? 60) + (impact.boardConfidenceDelta ?? 0), 0, 100),
    internalPressure,
    externalPressure,
  };
}

export function computeMaxActiveProjects(studio: Studio): number {
  const rep = clamp(studio.reputation ?? 50, 0, 100);
  const budget = Math.max(0, studio.budget ?? 0);

  const repSlots = Math.floor(rep / 30); // 0-3
  const budgetSlots = Math.floor(budget / 50_000_000); // 0+ (very slow)

  return clamp(1 + repSlots + budgetSlots, 1, 7);
}

export function countActiveProjects(state: GameState): number {
  return (state.projects || []).filter((p) => p && p.status !== 'archived' && p.status !== 'released').length;
}

export type GreenlightGateSeverity = 'ok' | 'warn' | 'block';

export type GreenlightGateReport = {
  severity: GreenlightGateSeverity;
  canGreenlight: boolean;
  canOverride: boolean;
  reasons: string[];
  requiredBoardConfidence: number;
  currentBoardConfidence: number;
  maxActiveProjects: number;
  activeProjects: number;
  impactIfProceed?: GovernanceImpact;
  impactIfOverride?: GovernanceImpact;
};

export function estimateScriptRisk(script: Script, studio: Studio): number {
  const debt = Math.max(0, studio.debt ?? 0);
  const maxLoanCapacity = Math.max(0, 50_000_000 - debt);
  const accessibleCapital = Math.max(1, (studio.budget ?? 0) + maxLoanCapacity);

  const budgetFactor = clamp((script.budget / accessibleCapital) * 70, 0, 90);
  const commercial = clamp(script.characteristics?.commercialAppeal ?? 5, 1, 10);
  const commercialFactor = clamp((6 - commercial) * 12, 0, 60);

  return clamp(budgetFactor + commercialFactor, 0, 100);
}

export function getGreenlightGateReport(params: {
  state: GameState;
  script: Script;
  kind?: 'film' | 'tv';
  episodeCount?: number;
}): GreenlightGateReport {
  const { state, script } = params;

  const gov = state.governance;
  const boardConfidence = clamp(gov?.boardConfidence ?? 60, 0, 100);

  const maxActiveProjects = gov?.capability?.maxActiveProjects ?? computeMaxActiveProjects(state.studio);
  const active = countActiveProjects(state);
  const activeAfterGreenlight = active + 1;
  const overCapacityBy = Math.max(0, activeAfterGreenlight - maxActiveProjects);

  const risk = estimateScriptRisk(script, state.studio);
  const requiredBoardConfidence = clamp(30 + risk * 0.55, 20, 90);
  const confidenceGap = Math.max(0, requiredBoardConfidence - boardConfidence);

  // Philosophy: gating should be mostly "friction" (pushback) rather than a hard stop.
  // - Overbooking by 1 is allowed (warn) with governance impact.
  // - Low confidence within a small margin is allowed (warn) with governance impact.
  // - Large gaps or heavy overbooking becomes a block, but can often be overridden.

  const reasons: string[] = [];

  if (overCapacityBy > 0) {
    reasons.push(
      overCapacityBy === 1
        ? `Over capacity (${activeAfterGreenlight}/${maxActiveProjects}). Expect delays and board pushback.`
        : `Far over capacity (${activeAfterGreenlight}/${maxActiveProjects}).`
    );
  }

  if (confidenceGap > 0) {
    reasons.push(
      `Board confidence shortfall (${Math.round(boardConfidence)}/${Math.round(requiredBoardConfidence)} required).`
    );
  }

  let severity: GreenlightGateSeverity = 'ok';
  if (overCapacityBy >= 2 || confidenceGap >= 20) severity = 'block';
  else if (overCapacityBy === 1 || confidenceGap > 0) severity = 'warn';

  const impactIfProceed: GovernanceImpact | undefined =
    severity === 'warn'
      ? {
          boardConfidenceDelta: -Math.max(2, Math.round(confidenceGap * 0.2)),
          internalPressureDelta: {
            board: overCapacityBy > 0 ? 8 : 0,
            finance: overCapacityBy > 0 ? 3 : 0,
          },
        }
      : undefined;

  const impactIfOverride: GovernanceImpact | undefined =
    severity === 'block'
      ? {
          boardConfidenceDelta: -Math.max(8, Math.round(confidenceGap * 0.45)),
          internalPressureDelta: {
            board: 15 + overCapacityBy * 10,
            finance: 6 + overCapacityBy * 5,
            investors: 4,
          },
        }
      : undefined;

  const canGreenlight = severity !== 'block';

  // "Hard" stop: total collapse or extreme overload.
  const hardStop = boardConfidence < 8 || overCapacityBy >= 3;
  const canOverride = severity === 'block' && !hardStop;

  return {
    severity,
    canGreenlight,
    canOverride,
    reasons,
    requiredBoardConfidence,
    currentBoardConfidence: boardConfidence,
    maxActiveProjects,
    activeProjects: active,
    impactIfProceed,
    impactIfOverride,
  };
}
