import type { GameState, Project, TalentPerson } from '@/types/game';
import type { TickSystem } from '../core/types';

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function isProductionLike(project: Project): boolean {
  return project.currentPhase === 'production' || project.status === 'production' || project.status === 'filming';
}

function computeCastBusyUntil(project: Project, currentAbsWeek: number): Map<string, number> {
  const out = new Map<string, number>();

  for (const c of project.cast || []) {
    if (!c?.talentId) continue;
    const role = (c.role || '').toLowerCase();
    const isCameo = role.includes('cameo') || role.includes('minor');
    const durationWeeks = isCameo ? 2 : 8;

    const until = currentAbsWeek + durationWeeks;
    const prev = out.get(c.talentId) ?? 0;
    if (until > prev) out.set(c.talentId, until);
  }

  return out;
}

export const TalentAvailabilitySystem: TickSystem = {
  id: 'talentAvailability',
  label: 'Talent availability',
  dependsOn: ['projectLifecycle'],
  onTick: (state, ctx) => {
    const talent0 = state.talent || [];
    if (talent0.length === 0) return state;

    const currentAbs = absWeek(ctx.week, ctx.year);

    const requiredBusyUntilByTalentId = new Map<string, number>();

    for (const p of state.projects || []) {
      if (!p) continue;
      if (!isProductionLike(p)) continue;

      const byCast = computeCastBusyUntil(p, currentAbs);
      for (const [talentId, until] of byCast.entries()) {
        const prev = requiredBusyUntilByTalentId.get(talentId) ?? 0;
        if (until > prev) requiredBusyUntilByTalentId.set(talentId, until);
      }
    }

    let changed = false;

    const nextTalent = talent0.map((t0): TalentPerson => {
      if (!t0) return t0 as any;
      if (t0.contractStatus === 'retired') return t0;

      let status = t0.contractStatus;
      let busyUntil = t0.busyUntilWeek;

      if (status === 'busy' && typeof busyUntil === 'number' && busyUntil <= currentAbs) {
        status = 'available';
        busyUntil = undefined;
      }

      const requiredUntil = requiredBusyUntilByTalentId.get(t0.id);
      if (typeof requiredUntil === 'number' && requiredUntil > 0) {
        const existing = typeof busyUntil === 'number' ? busyUntil : 0;
        busyUntil = Math.max(existing, requiredUntil);
        status = 'busy';
      }

      const statusChanged = status !== t0.contractStatus;
      const busyUntilChanged = busyUntil !== t0.busyUntilWeek;

      if (statusChanged || busyUntilChanged) {
        changed = true;
        return { ...t0, contractStatus: status, busyUntilWeek: busyUntil };
      }

      return t0;
    });

    if (!changed) return state;

    return {
      ...state,
      talent: nextTalent,
    } as GameState;
  },
};
