import type { GameState, TalentPerson } from '@/types/game';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function lastCreditedYear(t: TalentPerson): number | null {
  const films = t.filmography || [];
  if (films.length > 0) {
    const years = films.map((f) => f.year).filter((y): y is number => typeof y === 'number');
    if (years.length > 0) return Math.max(...years);
  }

  return typeof t.careerStartYear === 'number' ? t.careerStartYear : null;
}

function creditsInYear(t: TalentPerson, year: number): number {
  return (t.filmography || []).filter((f) => f.year === year).length;
}

/**
 * Annual talent burnout drift derived from recent work.
 *
 * Goal: provide real "wear and tear" pressure so retirements aren’t driven only by age.
 */
export const TalentBurnoutSystem: TickSystem = {
  id: 'talentBurnout',
  label: 'Talent burnout',
  dependsOn: ['talentLifecycle'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const previousYear = ctx.year - 1;

    let changed = false;

    const nextTalent = (state.talent || []).map((t) => {
      if (t.contractStatus === 'retired') {
        const b = clamp((t.burnoutLevel ?? 0) - 8, 0, 100);
        if (b !== (t.burnoutLevel ?? 0)) changed = true;
        return b !== (t.burnoutLevel ?? 0) ? { ...t, burnoutLevel: b } : t;
      }

      if (t.type !== 'actor' && t.type !== 'director') return t;

      const lastYear = lastCreditedYear(t);
      const current = clamp(t.burnoutLevel ?? 0, 0, 100);

      const creditsPrevYear = creditsInYear(t, previousYear);

      let delta = -6;
      if (creditsPrevYear >= 2) delta = 10;
      else if (creditsPrevYear === 1) delta = 8;
      else if (lastYear !== null && lastYear >= previousYear - 1) delta = 3;

      // Exclusive contracts add a little extra pressure when actively working.
      if (delta > 0 && t.contractStatus === 'exclusive') delta += 2;

      const next = clamp(current + delta, 0, 100);
      if (next === current) return t;

      changed = true;
      return { ...t, burnoutLevel: next };
    });

    if (!changed) return state;

    return {
      ...state,
      talent: nextTalent,
    };
  },
};
