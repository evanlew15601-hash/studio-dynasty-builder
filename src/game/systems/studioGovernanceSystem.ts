import type { GameState } from '@/types/game';
import { normalizeStudioGovernanceState } from '@/utils/studioGovernanceNormalization';
import { computeMaxActiveProjects, countActiveProjects } from '@/utils/studioGovernance';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function estimateWeeklyBurn(state: GameState): number {
  let burn = 0;

  for (const p of state.projects || []) {
    if (!p || p.status === 'archived' || p.status === 'released') continue;

    // Project-level baseline burn. Intentionally conservative so players aren't punished twice
    // if other systems already record detailed finances.
    burn += (p.budget?.total ?? 0) * 0.002;

    for (const ct of p.contractedTalent || []) {
      burn += ct.weeklyPay ?? 0;
    }
  }

  // Studio-wide overhead for exclusive/contracted talent.
  for (const t of state.talent || []) {
    if (t.contractStatus !== 'contracted' && t.contractStatus !== 'exclusive') continue;
    burn += t.weeklyOverhead ?? 0;
  }

  return Math.max(0, burn);
}

function computeFinancePressure(state: GameState): { pressure: number; runwayWeeks: number } {
  const budget = Math.max(0, state.studio.budget ?? 0);
  const burn = estimateWeeklyBurn(state);

  const runwayWeeks = burn > 0 ? budget / burn : 999;

  // 10+ weeks runway => near 0 pressure.
  // <4 weeks => severe.
  const pressure = clamp(Math.round(100 - runwayWeeks * 10), 0, 100);
  return { pressure, runwayWeeks };
}

function computeInvestorPressure(state: GameState): number {
  const debt = Math.max(0, state.studio.debt ?? 0);
  const budget = Math.max(0, state.studio.budget ?? 0);

  // If debt is large relative to cash, investors press harder.
  const leverage = debt / Math.max(1, budget + 1);
  return clamp(Math.round(leverage * 35), 0, 100);
}

function computeCompetitionPressure(state: GameState): number {
  const rep = clamp(state.studio.reputation ?? 50, 0, 100);
  const stronger = (state.competitorStudios || []).filter((s) => (s.reputation ?? 50) > rep).length;
  return clamp(stronger * 8, 0, 100);
}

function computeMarketPressure(state: GameState): number {
  const topTrend = state.marketConditions?.trendingGenres?.[0];
  if (!topTrend) return 0;

  const specialties = state.studio.specialties || [];
  return specialties.includes(topTrend) ? 10 : 30;
}

function computeTalentPressure(state: GameState): number {
  const rep = clamp(state.studio.reputation ?? 50, 0, 100);
  const repPressure = rep < 35 ? 35 : rep < 50 ? 20 : 10;

  const burnoutCount = (state.talent || []).filter((t) => (t.burnoutLevel ?? 0) >= 80).length;
  const burnoutPressure = clamp(burnoutCount * 10, 0, 40);

  return clamp(repPressure + burnoutPressure, 0, 100);
}

function smoothTowards(prev: number, target: number, alpha: number): number {
  return prev + (target - prev) * alpha;
}

export const StudioGovernanceSystem: TickSystem = {
  id: 'studioGovernance',
  label: 'Studio governance',
  onTick: (state, ctx) => {
    if (state.mode === 'online') return state;

    const normalized = normalizeStudioGovernanceState(state);
    const prev = normalized.governance!;

    const maxActiveProjects = computeMaxActiveProjects(normalized.studio);
    const active = countActiveProjects(normalized);

    const { pressure: financePressure, runwayWeeks } = computeFinancePressure(normalized);
    const investorPressure = computeInvestorPressure(normalized);

    const boardPressure = clamp(Math.round(((active - maxActiveProjects) / Math.max(1, maxActiveProjects)) * 80), 0, 100);

    const competitionPressure = computeCompetitionPressure(normalized);
    const marketPressure = computeMarketPressure(normalized);
    const talentPressure = computeTalentPressure(normalized);

    const rep = clamp(normalized.studio.reputation ?? 50, 0, 100);

    const targetConfidence = clamp(
      75 + (rep - 50) * 0.35 - financePressure * 0.45 - investorPressure * 0.25 - boardPressure * 0.25,
      0,
      100
    );

    const nextConfidence = clamp(Math.round(smoothTowards(prev.boardConfidence ?? 60, targetConfidence, 0.18)), 0, 100);

    const next = {
      ...prev,
      boardConfidence: nextConfidence,
      capability: {
        maxActiveProjects,
      },
      internalPressure: {
        board: boardPressure,
        finance: financePressure,
        investors: investorPressure,
      },
      externalPressure: {
        competition: competitionPressure,
        market: marketPressure,
        talent: talentPressure,
      },
      lastUpdatedWeekIndex: ctx.year * 52 + ctx.week,
    };

    const changed =
      next.boardConfidence !== prev.boardConfidence ||
      next.capability.maxActiveProjects !== prev.capability.maxActiveProjects ||
      next.internalPressure.board !== prev.internalPressure.board ||
      next.internalPressure.finance !== prev.internalPressure.finance ||
      next.internalPressure.investors !== prev.internalPressure.investors ||
      next.externalPressure.competition !== prev.externalPressure.competition ||
      next.externalPressure.market !== prev.externalPressure.market ||
      next.externalPressure.talent !== prev.externalPressure.talent;

    if (!changed) return normalized;

    const confidenceDelta = next.boardConfidence - prev.boardConfidence;

    if (Math.abs(confidenceDelta) >= 6) {
      const sign = confidenceDelta > 0 ? '+' : '';

      const runwayLabel = runwayWeeks >= 999 ? '∞' : `${Math.max(0, Math.round(runwayWeeks))}w`;

      ctx.recap.push({
        type: 'system',
        title: 'Governance update',
        body: [
          `Board confidence: ${sign}${confidenceDelta} → ${next.boardConfidence}/100`,
          `Finance pressure: ${next.internalPressure.finance}/100 (runway ~${runwayLabel})`,
          `Capacity: ${active}/${maxActiveProjects} active projects`,
        ].join('\n'),
        severity: confidenceDelta < 0 ? 'warning' : 'info',
      });
    }

    if (next.boardConfidence <= 18 && prev.boardConfidence > 18) {
      ctx.recap.push({
        type: 'system',
        title: 'Board crisis',
        body: 'Leadership confidence has collapsed. Expect harder approvals until finances stabilize or you ship a hit.',
        severity: 'bad',
      });
    }

    return {
      ...normalized,
      governance: next,
    };
  },
};
