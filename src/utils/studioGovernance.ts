import type { GameState, Script, Studio } from '@/types/game';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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

export type GreenlightGateReport = {
  canGreenlight: boolean;
  reasons: string[];
  requiredBoardConfidence: number;
  currentBoardConfidence: number;
  maxActiveProjects: number;
  activeProjects: number;
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

  const risk = estimateScriptRisk(script, state.studio);
  const requiredBoardConfidence = clamp(30 + risk * 0.55, 20, 90);

  const reasons: string[] = [];

  if (active >= maxActiveProjects) {
    reasons.push(`Studio capacity maxed (${active}/${maxActiveProjects} active projects).`);
  }

  if (boardConfidence < requiredBoardConfidence) {
    reasons.push(`Board confidence too low (${Math.round(boardConfidence)}/${Math.round(requiredBoardConfidence)} required).`);
  }

  return {
    canGreenlight: reasons.length === 0,
    reasons,
    requiredBoardConfidence,
    currentBoardConfidence: boardConfidence,
    maxActiveProjects,
    activeProjects: active,
  };
}
