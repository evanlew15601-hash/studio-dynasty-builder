import type { AIStudioState, GameState, TalentCommitment, TalentPerson } from '@/types/game';
import type { TickSystem } from '../core/types';
import { AIStudioManager } from '@/game/sim/aiStudioManager';

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function emptyState(): AIStudioState {
  return { aiFilms: [], talentCommitments: [], nextFilmId: 1 };
}

function isActiveCommitment(c: TalentCommitment, currentAbsWeek: number): boolean {
  return currentAbsWeek >= c.startAbsWeek && currentAbsWeek <= c.endAbsWeek;
}

export const AiStudioFilmSystem: TickSystem = {
  id: 'aiStudios',
  label: 'AI studio films',
  onTick: (state, ctx) => {
    if (state.mode === 'online') return state;

    AIStudioManager.hydrate(state.aiStudioState ?? emptyState());

    const currentAbsWeek = absWeek(ctx.week, ctx.year);

    // Occasionally start a new AI film.
    if ((state.competitorStudios || []).length > 0) {
      const shouldCreate = ctx.week % 4 === 1 || ctx.rng.chance(0.35);

      if (shouldCreate) {
        const studio = ctx.rng.pick(state.competitorStudios);
        if (studio) {
          const availableTalent = (state.talent || []).filter((t) => t.contractStatus === 'available');
          if (availableTalent.length > 0) {
            AIStudioManager.createAIFilm(studio, ctx.week, ctx.year, availableTalent, ctx.rng);
          }
        }
      }
    }

    AIStudioManager.processWeeklyAIFilms(ctx.week, ctx.year, ctx.rng);

    // Apply active talent commitments as busy flags (engine-owned now).
    const commitments = AIStudioManager.getAllCommitments();
    const busyUntilByTalent = new Map<string, number>();

    for (const c of commitments) {
      if (!isActiveCommitment(c, currentAbsWeek)) continue;
      const prev = busyUntilByTalent.get(c.talentId) || 0;
      busyUntilByTalent.set(c.talentId, Math.max(prev, c.endAbsWeek));
    }

    let talentChanged = false;

    const nextTalent = (state.talent || []).map((t0): TalentPerson => {
      const busyUntilFromAi = busyUntilByTalent.get(t0.id);
      if (!busyUntilFromAi) return t0;

      const existingBusyUntil = typeof t0.busyUntilWeek === 'number' ? t0.busyUntilWeek : 0;
      const nextBusyUntil = Math.max(existingBusyUntil, busyUntilFromAi);

      if (t0.contractStatus === 'busy' && existingBusyUntil === nextBusyUntil) return t0;

      const base =
        t0.contractStatusBase || (t0.contractStatus !== 'busy' && t0.contractStatus !== 'retired' ? t0.contractStatus : undefined);

      talentChanged = true;

      return {
        ...t0,
        contractStatus: 'busy',
        contractStatusBase: base,
        busyUntilWeek: nextBusyUntil,
      };
    });

    const nextAiStudioState = AIStudioManager.snapshot();

    const stateChanged =
      (state.aiStudioState?.nextFilmId || 0) !== nextAiStudioState.nextFilmId ||
      (state.aiStudioState?.aiFilms?.length || 0) !== nextAiStudioState.aiFilms.length ||
      (state.aiStudioState?.talentCommitments?.length || 0) !== nextAiStudioState.talentCommitments.length;

    if (!talentChanged && !stateChanged) return state;

    return {
      ...state,
      aiStudioState: nextAiStudioState,
      talent: talentChanged ? nextTalent : state.talent,
    } as GameState;
  },
};
