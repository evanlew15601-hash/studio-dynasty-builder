import type { GameState, Project } from '@/types/game';
import type { TickSystem } from '../core/types';

const BASE_OPERATIONAL_COST = 12_000;
const ACTIVE_PROJECT_OVERHEAD = 6_000;

// Model production cash flow as staged vendor/payroll draws so first films
// remain difficult but do not force mandatory survival loans before release.
const PRODUCTION_WEEKS = 16;
const PRODUCTION_BUDGET_FRACTION = 0.35;
// Draw remaining budget across pre-/post-production so full project budget is
// eventually paid rather than only charging production week draws.
const PRE_PRODUCTION_WEEKS = PRODUCTION_WEEKS;
const POST_PRODUCTION_WEEKS = PRODUCTION_WEEKS;
const PRE_PRODUCTION_BUDGET_FRACTION = 0.25;
const POST_PRODUCTION_BUDGET_FRACTION = 0.40;

const DEBT_AUTO_PAYDOWN_THRESHOLD = 1_000_000;
const DEBT_AUTO_PAYDOWN_FRACTION = 0.05;

const WEEKLY_DEBT_INTEREST_RATE = 0.0002;

function isActiveOverheadProject(project: Project): boolean {
  return (
    project.status === 'development' ||
    project.status === 'pre-production' ||
    project.status === 'production' ||
    project.status === 'post-production'
  );
}

export const StudioEconomySystem: TickSystem = {
  id: 'studioEconomy',
  label: 'Studio economy',
  dependsOn: ['studioRevenue', 'loanPayments'],
  onTick: (state) => {
    const projects = state.projects || [];

    const projectCount = projects.filter(isActiveOverheadProject).length;
    const operationalCost = BASE_OPERATIONAL_COST + projectCount * ACTIVE_PROJECT_OVERHEAD;

    let productionCosts = 0;
    for (const project of projects) {
      if (!project.budget || typeof project.budget.total !== 'number') continue;

      let weeklyDraw = 0;
      if (project.currentPhase === 'production') {
        weeklyDraw = (project.budget.total * PRODUCTION_BUDGET_FRACTION) / PRODUCTION_WEEKS;
      } else if (project.currentPhase === 'pre-production') {
        weeklyDraw = (project.budget.total * PRE_PRODUCTION_BUDGET_FRACTION) / PRE_PRODUCTION_WEEKS;
      } else if (project.currentPhase === 'post-production') {
        weeklyDraw = (project.budget.total * POST_PRODUCTION_BUDGET_FRACTION) / POST_PRODUCTION_WEEKS;
      }

      productionCosts += weeklyDraw;
    }

    const totalWeeklyCosts = operationalCost + productionCosts;

    const studio0 = state.studio;

    let nextBudget = (studio0.budget ?? 0) - totalWeeklyCosts;
    let nextDebt = studio0.debt || 0;

    if (nextBudget < 0) {
      nextDebt += -nextBudget;
      nextBudget = 0;
    }

    if (nextBudget > DEBT_AUTO_PAYDOWN_THRESHOLD && nextDebt > 0) {
      const payment = Math.min(nextDebt, nextBudget * DEBT_AUTO_PAYDOWN_FRACTION);
      nextDebt -= payment;
      nextBudget -= payment;
    }

    if (nextDebt > 0) {
      nextDebt += nextDebt * WEEKLY_DEBT_INTEREST_RATE;
    }

    const nextWeeksSinceLastProject = (studio0.weeksSinceLastProject || 0) + 1;

    const changed =
      nextBudget !== studio0.budget ||
      nextDebt !== (studio0.debt || 0) ||
      nextWeeksSinceLastProject !== (studio0.weeksSinceLastProject || 0);

    if (!changed) return state;

    return {
      ...state,
      studio: {
        ...studio0,
        budget: nextBudget,
        debt: nextDebt,
        weeksSinceLastProject: nextWeeksSinceLastProject,
      },
    } as GameState;
  },
};
