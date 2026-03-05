import { GameState, Project } from '@/types/game';
import { TimeSystem } from '@/components/game/TimeSystem';
import { BoxOfficeSystem } from '@/components/game/BoxOfficeSystem';
import { FinancialEngine } from '@/components/game/FinancialEngine';

export type LongTermSimulationResult = {
  finalState: GameState;
  weeksSimulated: number;
  totalStudioRevenueShare: number;
  totalBoxOfficeGross: number;
};

const getAbsWeek = (year: number, week: number) => (year * 52) + week;

export const runLongTermSimulation = (
  initialState: GameState,
  weeksToSimulate: number
): LongTermSimulationResult => {
  // Avoid mutating the caller's object graph (projects carry nested fields)
  const clone: <T>(value: T) => T =
    typeof structuredClone === 'function'
      ? structuredClone
      : (value) => JSON.parse(JSON.stringify(value));

  let state: GameState = clone(initialState);

  let totalStudioRevenueShare = 0;
  let totalBoxOfficeGross = 0;

  const applyStudioShare = (projectBefore: Project, projectAfter: Project) => {
    const before = projectBefore.metrics?.boxOfficeTotal || 0;
    const after = projectAfter.metrics?.boxOfficeTotal || 0;
    const delta = after - before;
    if (delta <= 0) return;

    totalBoxOfficeGross += delta;
    const studioShare = delta * 0.55;
    totalStudioRevenueShare += studioShare;

    state = {
      ...state,
      studio: {
        ...state.studio,
        budget: (state.studio.budget || 0) + studioShare,
      },
    };
  };

  for (let i = 0; i < weeksToSimulate; i += 1) {
    const currentAbs = getAbsWeek(state.currentYear, state.currentWeek);

    const updatedProjects: Project[] = state.projects.map((project) => {
      let updated = project;

      // Scheduled releases become released at their target week
      const scheduledWeek = project.scheduledReleaseWeek || project.releaseWeek;
      const scheduledYear = project.scheduledReleaseYear || project.releaseYear;

      if (project.status === 'scheduled-for-release' && scheduledWeek && scheduledYear) {
        const scheduledAbs = getAbsWeek(scheduledYear, scheduledWeek);
        if (scheduledAbs === currentAbs) {
          // BoxOfficeSystem will set released metrics including opening revenue (Week 0)
          updated = BoxOfficeSystem.initializeRelease({ ...project }, scheduledWeek, scheduledYear);
          applyStudioShare(project, updated);
          return updated;
        }
      }

      if (project.status === 'released' && project.type !== 'series' && project.type !== 'limited-series') {
        const before = project;
        updated = BoxOfficeSystem.processWeeklyRevenue({ ...project }, state.currentWeek, state.currentYear);
        applyStudioShare(before, updated);
        return updated;
      }

      return updated;
    });

    state = {
      ...state,
      projects: updatedProjects,
    };

    FinancialEngine.performMemoryCleanup(state.currentWeek, state.currentYear);

    const nextTime = TimeSystem.advanceWeek({
      currentWeek: state.currentWeek,
      currentYear: state.currentYear,
      currentQuarter: state.currentQuarter,
    });

    state = {
      ...state,
      currentWeek: nextTime.currentWeek,
      currentYear: nextTime.currentYear,
      currentQuarter: nextTime.currentQuarter,
    };
  }

  return {
    finalState: state,
    weeksSimulated: weeksToSimulate,
    totalStudioRevenueShare,
    totalBoxOfficeGross,
  };
};
