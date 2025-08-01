// Unified Financial Engine - Single source of truth for all financial transactions
export interface Transaction {
  id: string;
  filmId?: string;
  type: 'revenue' | 'expense';
  category: 'production' | 'marketing' | 'talent' | 'boxoffice' | 'streaming' | 'overhead' | 'licensing';
  amount: number;
  week: number;
  year: number;
  description: string;
}

export interface WeeklyFinancials {
  week: number;
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  transactions: Transaction[];
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashOnHand: number;
  weeklyBurn: number;
  profitableFilms: number;
  totalFilms: number;
}

export class FinancialEngine {
  private static transactions: Transaction[] = [];
  private static nextTransactionId = 1;
  
  static recordTransaction(
    type: 'revenue' | 'expense',
    category: Transaction['category'],
    amount: number,
    week: number,
    year: number,
    description: string,
    filmId?: string
  ): string {
    const transaction: Transaction = {
      id: `txn-${this.nextTransactionId++}`,
      filmId,
      type,
      category,
      amount: Math.abs(amount), // Always store as positive, type determines direction
      week,
      year,
      description
    };
    
    this.transactions.push(transaction);
    console.log(`FINANCE: ${type} of $${amount}k for ${description} (Y${year}W${week})`);
    
    return transaction.id;
  }
  
  static recordFilmRevenue(filmId: string, amount: number, week: number, year: number, source: string): string {
    return this.recordTransaction('revenue', 'boxoffice', amount, week, year, `Box office - ${source}`, filmId);
  }
  
  static recordFilmExpense(filmId: string, amount: number, week: number, year: number, category: Transaction['category'], description: string): string {
    return this.recordTransaction('expense', category, amount, week, year, description, filmId);
  }
  
  static recordStudioOverhead(amount: number, week: number, year: number, description: string): string {
    return this.recordTransaction('expense', 'overhead', amount, week, year, description);
  }
  
  static getWeeklyFinancials(week: number, year: number): WeeklyFinancials {
    const weekTransactions = this.transactions.filter(t => t.week === week && t.year === year);
    
    const totalRevenue = weekTransactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = weekTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      week,
      year,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
      transactions: weekTransactions
    };
  }
  
  static getFinancialSummary(currentWeek: number, currentYear: number): FinancialSummary {
    const allRevenue = this.transactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const allExpenses = this.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate weekly burn rate (last 4 weeks average)
    let weeklyExpenses = 0;
    for (let i = 0; i < 4; i++) {
      let week = currentWeek - i;
      let year = currentYear;
      if (week <= 0) {
        week += 52;
        year -= 1;
      }
      const weeklyFinancials = this.getWeeklyFinancials(week, year);
      weeklyExpenses += weeklyFinancials.totalExpenses;
    }
    const weeklyBurn = weeklyExpenses / 4;
    
    // Count profitable films
    const filmFinancials = new Map<string, { revenue: number; expenses: number }>();
    
    this.transactions.forEach(t => {
      if (t.filmId) {
        if (!filmFinancials.has(t.filmId)) {
          filmFinancials.set(t.filmId, { revenue: 0, expenses: 0 });
        }
        const film = filmFinancials.get(t.filmId)!;
        if (t.type === 'revenue') {
          film.revenue += t.amount;
        } else {
          film.expenses += t.amount;
        }
      }
    });
    
    const profitableFilms = Array.from(filmFinancials.values())
      .filter(film => film.revenue > film.expenses).length;
    
    return {
      totalRevenue: allRevenue,
      totalExpenses: allExpenses,
      netProfit: allRevenue - allExpenses,
      cashOnHand: allRevenue - allExpenses, // For now, assume all profit is retained
      weeklyBurn,
      profitableFilms,
      totalFilms: filmFinancials.size
    };
  }
  
  static getFilmFinancials(filmId: string): { revenue: number; expenses: number; profit: number; transactions: Transaction[] } {
    const filmTransactions = this.transactions.filter(t => t.filmId === filmId);
    
    const revenue = filmTransactions
      .filter(t => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filmTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      transactions: filmTransactions
    };
  }
  
  static getRecentTransactions(count: number = 10): Transaction[] {
    return this.transactions
      .slice(-count)
      .reverse(); // Most recent first
  }
  
  static simulateBoxOfficeWeek(films: { id: string; title: string; weeksSinceRelease: number }[], currentWeek: number, currentYear: number): void {
    films.forEach(film => {
      if (film.weeksSinceRelease >= 0) {
        // Simple box office simulation - declines over time
        let baseEarnings = 5000; // Base 5M per week
        const declineRate = Math.pow(0.7, film.weeksSinceRelease); // 30% decline each week
        const weeklyEarnings = baseEarnings * declineRate;
        
        if (weeklyEarnings > 100) { // Stop tracking when earnings drop below 100k
          this.recordFilmRevenue(
            film.id,
            weeklyEarnings,
            currentWeek,
            currentYear,
            `Week ${film.weeksSinceRelease + 1} box office`
          );
        }
      }
    });
  }
  
  static clearFilmTransactions(filmId: string): void {
    this.transactions = this.transactions.filter(t => t.filmId !== filmId);
  }
  
  static exportLedger(): Transaction[] {
    return [...this.transactions]; // Return copy for debugging
  }
}