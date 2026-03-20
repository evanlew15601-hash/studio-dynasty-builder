import type { GameState, Loan } from '@/types/game';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export const LoanPaymentSystem: TickSystem = {
  id: 'loanPayments',
  label: 'Loan payments',
  dependsOn: ['studioRevenue'],
  onTick: (state, ctx) => {
    if (state.mode === 'online') return state;

    const studio0 = state.studio;
    const loans0 = studio0.loans || [];

    const active = loans0.some((l) => l.status === 'active' && l.remainingBalance > 0);
    if (!active) return state;

    let budget = studio0.budget ?? 0;
    let reputation = studio0.reputation ?? 50;

    let missedThisWeek = 0;
    let paidOffThisWeek = 0;
    let defaultedThisWeek = 0;

    const loans = loans0.map((loan0): Loan => {
      if (loan0.status !== 'active') return loan0;
      if (loan0.remainingBalance <= 0) return { ...loan0, remainingBalance: 0, weeksRemaining: 0, status: 'paid' };

      let loan = { ...loan0 };

      if (loan.weeksRemaining <= 0) {
        loan.status = 'defaulted';
        defaultedThisWeek += 1;
        reputation = clamp(reputation - 10, 0, 100);
        return loan;
      }

      const payment = Math.min(loan.weeklyPayment, loan.remainingBalance);

      if (budget >= payment) {
        budget -= payment;
        loan.remainingBalance = Math.max(0, loan.remainingBalance - payment);
        loan.weeksRemaining = Math.max(0, loan.weeksRemaining - 1);
        loan.missedPayments = 0;

        if (loan.remainingBalance <= 0) {
          loan.status = 'paid';
          loan.weeksRemaining = 0;
          paidOffThisWeek += 1;
        }

        return loan;
      }

      // Missed payment
      loan.missedPayments = (loan.missedPayments || 0) + 1;
      loan.weeksRemaining = Math.max(0, loan.weeksRemaining - 1);
      missedThisWeek += 1;
      reputation = clamp(reputation - 3, 0, 100);

      if (loan.weeksRemaining <= 0 && loan.remainingBalance > 0) {
        loan.status = 'defaulted';
        defaultedThisWeek += 1;
        reputation = clamp(reputation - 10, 0, 100);
      }

      return loan;
    });

    const changed =
      budget !== studio0.budget ||
      reputation !== studio0.reputation ||
      loans.some((l, i) => l !== loans0[i]);

    if (!changed) return state;

    if (paidOffThisWeek > 0) {
      ctx.recap.push({
        type: 'financial',
        title: 'Loan repaid',
        body: `You fully repaid ${paidOffThisWeek} loan${paidOffThisWeek === 1 ? '' : 's'} this week.`,
        severity: 'good',
      });
    }

    if (missedThisWeek > 0) {
      ctx.recap.push({
        type: 'financial',
        title: 'Missed loan payment',
        body: `You missed ${missedThisWeek} loan payment${missedThisWeek === 1 ? '' : 's'} this week.`,
        severity: 'warning',
      });
    }

    if (defaultedThisWeek > 0) {
      ctx.recap.push({
        type: 'financial',
        title: 'Loan defaulted',
        body: `A loan defaulted after the final payment week.`,
        severity: 'bad',
      });
    }

    return {
      ...state,
      studio: {
        ...studio0,
        budget,
        reputation,
        loans,
      },
    } as GameState;
  },
};
