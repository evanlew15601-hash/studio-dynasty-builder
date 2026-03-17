import type { CareerEvent, GameState, TalentPerson } from '@/types/game';
import { stableInt } from '@/utils/stableRandom';
import { pushWorldHistory } from '@/utils/worldHistory';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function baseChance(t: TalentPerson): number {
  const age = t.age ?? 30;

  if (t.type === 'actor') {
    if (age < 55) return 0;
    if (age <= 70) return ((age - 55) / (70 - 55)) * 0.12;
    if (age <= 85) return 0.12 + ((age - 70) / (85 - 70)) * 0.13;
    return 0.25;
  }

  if (t.type === 'director') {
    if (age < 60) return 0;
    if (age <= 75) return ((age - 60) / (75 - 60)) * 0.12;
    if (age <= 90) return 0.12 + ((age - 75) / (90 - 75)) * 0.11;
    return 0.23;
  }

  return 0;
}

function rosterPressureMultiplier(activeCount: number): number {
  // Target band: 240–320
  if (activeCount < 240) return clamp(activeCount / 240, 0.7, 1);
  if (activeCount <= 320) return 1;
  return clamp(activeCount / 320, 1, 1.4);
}

function retirementChance(t: TalentPerson, rosterMult: number): number {
  let chance = baseChance(t) * rosterMult;

  const burnout = clamp(t.burnoutLevel ?? 0, 0, 100);
  chance += (burnout / 100) * 0.06;

  const rep = clamp(t.reputation ?? 50, 0, 100);
  if (rep >= 90) chance -= 0.06;
  else if (rep >= 80) chance -= 0.03;

  // Hard clamp: even at extreme ages, we don't want mass exits.
  return clamp(chance, 0, 0.25);
}

function retirementReason(t: TalentPerson): 'age' | 'burnout' | 'unknown' {
  const burnout = t.burnoutLevel ?? 0;
  if (burnout >= 85) return 'burnout';

  const age = t.age ?? 30;
  if ((t.type === 'actor' && age >= 65) || (t.type === 'director' && age >= 70)) return 'age';

  return 'unknown';
}



/**
 * Annual, probabilistic retirements.
 * Conservative: only retires available actors/directors in single-player.
 */
export const TalentRetirementSystem: TickSystem = {
  id: 'talentRetirements',
  label: 'Talent retirements',
  dependsOn: ['talentLifecycle'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const previousYear = ctx.year - 1;

    const activeCount = (state.talent || []).filter(
      (t) => (t.type === 'actor' || t.type === 'director') && t.contractStatus !== 'retired'
    ).length;

    const rosterMult = rosterPressureMultiplier(activeCount);

    const retired: TalentPerson[] = [];

    const updatedTalent = (state.talent || []).map((t) => {
      if (t.contractStatus === 'retired') return t;
      if (t.type !== 'actor' && t.type !== 'director') return t;
      if (t.contractStatus !== 'available') return t;

      const chance = retirementChance(t, rosterMult);
      if (chance <= 0) return t;

      const roll = stableInt(`${state.universeSeed ?? 0}|retire|${t.id}|${previousYear}`, 0, 9999) / 10000;
      if (roll >= chance) return t;

      const reason = retirementReason(t);

      const ev: CareerEvent = {
        type: 'retirement',
        year: previousYear,
        week: 52,
        description: `${t.name} announced retirement from the industry.`,
        impactOnReputation: 0,
        impactOnMarketValue: 0,
      };

      const next: TalentPerson = {
        ...t,
        contractStatus: 'retired',
        retired: { year: previousYear, week: 52, reason },
        careerEvolution: [...(t.careerEvolution || []), ev],
      };

      retired.push(next);
      return next;
    });

    if (retired.length === 0) return state;

    let worldHistory = state.worldHistory || [];

    for (const t of retired) {
      const rep = t.reputation ?? 0;
      const importance: 1 | 2 | 3 | 4 | 5 | undefined =
        rep >= 95 ? 5 : t.isNotable || rep >= 85 ? 4 : undefined;

      if (!importance) continue;

      worldHistory = pushWorldHistory(worldHistory, {
        id: `hist:talent_retirement:${previousYear}:${t.id}`,
        kind: 'talent_retirement',
        year: previousYear,
        week: 52,
        title: `${t.name} retires`,
        body: `${t.name} stepped away from active work at age ${t.age}.`,
        entityIds: { talentIds: [t.id] },
        importance,
      });
    }

    ctx.recap.push({
      type: 'talent',
      title: `${retired.length} retirement${retired.length === 1 ? '' : 's'} finalized`,
      body:
        retired
          .slice(0, 10)
          .map((t) => `• ${t.name} (${t.type})`)
          .join('\n') + (retired.length > 10 ? `\n…and ${retired.length - 10} more` : ''),
      severity: 'info',
    });

    const next: GameState = {
      ...state,
      talent: updatedTalent,
      worldHistory,
    };

    return next;
  },
};
