import type { GameState, TalentPerson } from '@/types/game';
import { determineCareerStage } from '@/utils/careerStage';
import type { TickSystem } from '../core/types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Hard caps on talent market value to prevent runaway inflation.
 * Even the biggest A-list stars shouldn't exceed ~$50M per project
 * in a realistic simulation. Directors cap lower.
 */
const MARKET_VALUE_HARD_CAP_ACTOR = 50_000_000;    // $50M
const MARKET_VALUE_HARD_CAP_DIRECTOR = 30_000_000;  // $30M

/**
 * Soft cap where diminishing returns kick in aggressively.
 * Above this, any growth is reduced by 90%.
 */
const MARKET_VALUE_SOFT_CAP_ACTOR = 25_000_000;
const MARKET_VALUE_SOFT_CAP_DIRECTOR = 15_000_000;

function getMarketValueCaps(type: string): { soft: number; hard: number } {
  if (type === 'director') return { soft: MARKET_VALUE_SOFT_CAP_DIRECTOR, hard: MARKET_VALUE_HARD_CAP_DIRECTOR };
  return { soft: MARKET_VALUE_SOFT_CAP_ACTOR, hard: MARKET_VALUE_HARD_CAP_ACTOR };
}

export function clampMarketValue(value: number, type: string): number {
  const { soft, hard } = getMarketValueCaps(type);
  if (value <= soft) return value;
  // Above soft cap: only 10% of growth above soft cap actually applies
  const excess = value - soft;
  const dampened = soft + excess * 0.1;
  return Math.min(hard, Math.max(0, Math.round(dampened)));
}

function driftMarketValue(t: TalentPerson, nextAge: number): TalentPerson['marketValue'] {
  if (t.type !== 'actor' && t.type !== 'director') return t.marketValue;

  const current = t.marketValue;
  if (!Number.isFinite(current ?? Number.NaN) || (current ?? 0) <= 0) return current;

  const optimalAge = t.type === 'director' ? 45 : 35;
  const ageFactorRaw = 1 - Math.abs(nextAge - optimalAge) * 0.01;
  const ageFactor = Math.max(0.6, Math.min(1.15, ageFactorRaw));

  const base = current ?? 0;
  const next = base * lerp(1, ageFactor, 0.15);
  return clampMarketValue(Math.max(0, Math.round(next)), t.type);
}

/**
 * Annual lifecycle updates.
 * - Ages everyone (including retired)
 * - Increments experience + updates stage/value for non-retired talent
 */
export const TalentLifecycleSystem: TickSystem = {
  id: 'talentLifecycle',
  label: 'Talent lifecycle',
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const updated = (state.talent || []).map((t) => {
      const nextAge = (t.age ?? 30) + 1;

      if (t.contractStatus === 'retired') {
        return { ...t, age: nextAge };
      }

      const nextExperience = (t.experience ?? 0) + 1;
      const reputation = t.reputation ?? 50;
      const careerStage = determineCareerStage(nextAge, nextExperience, reputation);

      return {
        ...t,
        age: nextAge,
        experience: nextExperience,
        careerStage,
        marketValue: driftMarketValue(t, nextAge),
      };
    });

    const next: GameState = {
      ...state,
      talent: updated,
    };

    return next;
  },
};
