import type { Script } from '@/types/game';

export const SCRIPT_STAGE_ORDER: Script['developmentStage'][] = [
  'concept',
  'treatment',
  'first-draft',
  'polish',
  'final',
];

export function getNextScriptStage(stage: Script['developmentStage']): Script['developmentStage'] | null {
  const idx = SCRIPT_STAGE_ORDER.indexOf(stage);
  if (idx === -1) return null;
  return SCRIPT_STAGE_ORDER[idx + 1] ?? null;
}

export function formatScriptStage(stage: Script['developmentStage']): string {
  return stage.replace('-', ' ');
}

export type ScriptStageAdvanceQuote = {
  fromStage: Script['developmentStage'];
  toStage: Script['developmentStage'];
  writerFee: number;
  qualityDelta: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function getScriptStageAdvanceQuote(script: Script): ScriptStageAdvanceQuote | null {
  const fromStage = script.developmentStage;
  const toStage = getNextScriptStage(fromStage);
  if (!toStage) return null;

  // Scale writer fees with project scope, but keep them in a reasonable band.
  // Budget is the film production budget (or per-episode budget for TV scripts).
  const pct =
    fromStage === 'concept'
      ? 0.001
      : fromStage === 'treatment'
        ? 0.002
        : fromStage === 'first-draft'
          ? 0.0015
          : 0.001;

  const rawFee = Math.round(script.budget * pct);
  const writerFee = clamp(rawFee, 25_000, 750_000);

  const qualityDelta =
    fromStage === 'concept'
      ? 3
      : fromStage === 'treatment'
        ? 6
        : fromStage === 'first-draft'
          ? 4
          : 3;

  return {
    fromStage,
    toStage,
    writerFee,
    qualityDelta,
  };
}
