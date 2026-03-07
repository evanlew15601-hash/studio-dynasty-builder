// Unified Financial Engine - Single source of truth for all financial transactions
import { Studio, Project } from '@/types/game';
import { formatMoneyCompact } from '@/utils/money';
export interface Transaction {
  id: string;
  filmId?: string;
  type: 'revenue' | 'expense';
  category: 'production' | 'marketing' | 'talent' | 'boxoffice' | 'streaming' | 'overhead' | 'licensing' | 'touring';
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
  private static readonly STORAGE_KEY = 'studio-magnate-ledger';

  // Load any persisted ledger on first import
  private static ensureLoaded() {
    if (this.transactions.length === 0) {
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(this.STORAGE_KEY) : null;
        if (raw) {
          const parsed = JSON.parse(raw) as { transactions: Transaction[]; nextId?: number };
          this.transactions = Array.isArray((parsed as any).transactions) ? parsed.transactions : (parsed as any);
          // Backward compatibility if only array was stored
          const lastId = this.transactions.reduce((max, t) => {
            const n = Number(String(t.id).replace(/[^0-9]/g, '')) || 0;
            return Math.max(max, n);
          }, 0);
          this.nextTransactionId = (parsed as any).nextId || lastId + 1 || 1;
        }
      } catch (e) {
        // If parsing fails, start fresh but don't crash the game
        this.transactions = [];
        this.nextTransactionId = 1;
      }
    }
  }

  private static persist() {
    try {
      if (typeof window !== 'undefined') {
        const payload = JSON.stringify({ transactions: this.transactions, nextId: this.nextTransactionId });
        // Check if payload is too large (>4MB to leave headroom for 5MB limit)
        if (payload.length > 4 * 1024 * 1024) {
          console.warn('FinancialEngine: Ledger too large, pruning old transactions');
          this.pruneOldTransactions(104); // Keep last 2 years
          const prunedPayload = JSON.stringify({ transactions: this.transactions, nextId: this.nextTransactionId });
          window.localStorage.setItem(this.STORAGE_KEY, prunedPayload);
        } else {
          window.localStorage.setItem(this.STORAGE_KEY, payload);
        }
      }
    } catch (e) {
      // Handle localStorage quota exceeded
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.warn('FinancialEngine: localStorage quota exceeded, pruning old transactions');
        this.pruneOldTransactions(52); // Keep only last year
        try {
          const prunedPayload = JSON.stringify({ transactions: this.transactions, nextId: this.nextTransactionId });
          window.localStorage.setItem(this.STORAGE_KEY, prunedPayload);
        } catch {
          // If still failing, clear and restart
          window.localStorage.removeItem(this.STORAGE_KEY);
          console.warn('FinancialEngine: Had to clear ledger due to storage limits');
        }
      }
    }
  }

  /**
   * Remove transactions older than the specified number of weeks to free memory.
   * Called automatically when storage limits are approached.
   */
  static pruneOldTransactions(maxAgeWeeks: number): void {
    if (this.transactions.length === 0) return;
    
    // Find the most recent transaction to determine current time
    const latest = this.transactions.reduce((newest, t) => {
      const absWeek = (t.year * 52) + t.week;
      const newestAbs = (newest.year * 52) + newest.week;
      return absWeek > newestAbs ? t : newest;
    }, this.transactions[0]);
    
    const currentAbsWeek = (latest.year * 52) + latest.week;
    const cutoffWeek = currentAbsWeek - maxAgeWeeks;
    
    const beforeCount = this.transactions.length;
    this.transactions = this.transactions.filter(t => {
      const absWeek = (t.year * 52) + t.week;
      return absWeek >= cutoffWeek;
    });
    
    console.log(`FinancialEngine: Pruned ${beforeCount - this.transactions.length} old transactions (kept ${this.transactions.length})`);
  }

  /**
   * Public method to trigger memory cleanup. Called periodically from game loop.
   */
  static performMemoryCleanup(currentWeek: number, currentYear: number): void {
    this.ensureLoaded();
    const currentAbsWeek = (currentYear * 52) + currentWeek;
    
    // Remove transactions older than 3 years (156 weeks)
    const cutoffWeek = currentAbsWeek - 156;
    const beforeCount = this.transactions.length;
    
    this.transactions = this.transactions.filter(t => {
      const absWeek = (t.year * 52) + t.week;
      return absWeek >= cutoffWeek;
    });
    
    if (beforeCount !== this.transactions.length) {
      console.log(`FinancialEngine: Memory cleanup removed ${beforeCount - this.transactions.length} transactions`);
      this.persist();
    }
  }

  static clearLedger(): void {
    this.transactions = [];
    this.nextTransactionId = 1;

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(this.STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }
  
  static recordTransaction(
    type: 'revenue' | 'expense',
    category: Transaction['category'],
    amount: number,
    week: number,
    year: number,
    description: string,
    filmId?: string
  ): string {
    this.ensureLoaded();

    const roundedAmount = Math.round(Math.abs(Number.isFinite(amount) ? amount : 0));

    const transaction: Transaction = {
      id: `txn-${this.nextTransactionId++}`,
      filmId,
      type,
      category,
      amount: roundedAmount, // Always store as positive integer dollars, type determines direction
      week,
      year,
      description
    };
    
    this.transactions.push(transaction);
    this.persist();

    console.log(`FINANCE: ${type} ${formatMoneyCompact(roundedAmount)} for ${description} (Y${year}W${week})`);
    
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

  // Touring helpers for record label/artist touring operations
  static recordTouringRevenue(amount: number, week: number, year: number, description: string, filmId?: string): string {
    return this.recordTransaction('revenue', 'touring', amount, week, year, description, filmId);
  }

  static recordTouringExpense(amount: number, week: number, year: number, description: string, filmId?: string): string {
    return this.recordTransaction('expense', 'touring', amount, week, year, description, filmId);
  }
  
  static getWeeklyFinancials(week: number, year: number): WeeklyFinancials {
    this.ensureLoaded();

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
  
  static getFinancialSummary(currentWeek: number, currentYear: number, cashOnHandOverride?: number): FinancialSummary {
    this.ensureLoaded();

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
    
    const netProfit = allRevenue - allExpenses;

    return {
      totalRevenue: allRevenue,
      totalExpenses: allExpenses,
      netProfit,
      cashOnHand: cashOnHandOverride ?? netProfit,
      weeklyBurn,
      profitableFilms,
      totalFilms: filmFinancials.size
    };
  }
  
  static getFilmFinancials(filmId: string): { revenue: number; expenses: number; profit: number; transactions: Transaction[] } {
    this.ensureLoaded();

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

  static getFranchiseFinancials(projects: Project[]): {
    totalRevenue: number;
    boxOfficeRevenue: number;
    streamingRevenue: number;
    otherRevenue: number;
    totalExpenses: number;
    netProfit: number;
  } {
    this.ensureLoaded();

    if (!projects.length) {
      return {
        totalRevenue: 0,
        boxOfficeRevenue: 0,
        streamingRevenue: 0,
        otherRevenue: 0,
        totalExpenses: 0,
        netProfit: 0
      };
    }

    const projectIds = new Set(projects.map(p => p.id));
    const relevant = this.transactions.filter(
      t => t.filmId && projectIds.has(t.filmId)
    );

    let boxOfficeRevenue = 0;
    let streamingRevenue = 0;
    let otherRevenue = 0;
    let totalExpenses = 0;

    relevant.forEach(t => {
      if (t.type === 'revenue') {
        if (t.category === 'boxoffice') {
          boxOfficeRevenue += t.amount;
        } else if (t.category === 'streaming') {
          streamingRevenue += t.amount;
        } else {
          otherRevenue += t.amount;
        }
      } else {
        totalExpenses += t.amount;
      }
    });

    const totalRevenue = boxOfficeRevenue + streamingRevenue + otherRevenue;

    return {
      totalRevenue,
      boxOfficeRevenue,
      streamingRevenue,
      otherRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses
    };
  }
  
  static getRecentTransactions(count: number = 10): Transaction[] {
    this.ensureLoaded();

    return this.transactions
      .slice(-count)
      .reverse(); // Most recent first
  }
  
  static simulateBoxOfficeWeek(films: { id: string; title: string; weeksSinceRelease: number; budget: number; genre: string }[], currentWeek: number, currentYear: number): void {
    this.ensureLoaded();

    films.forEach(film => {
      if (film.weeksSinceRelease >= 0) {
        // Enhanced box office simulation based on budget and genre
        let baseEarnings = Math.max(film.budget * 0.1, 1_000_000); // Base on budget, minimum $1M
        
        // Genre multipliers
        const genreMultipliers: Record<string, number> = {
          'action': 1.3,
          'comedy': 1.0,
          'drama': 0.8,
          'horror': 1.2,
          'romance': 0.9,
          'thriller': 1.1,
          'family': 1.4,
          'animation': 1.5,
          'sci-fi': 1.3,
          'fantasy': 1.2
        };
        
        baseEarnings *= genreMultipliers[film.genre] || 1.0;
        
        // Decline rate based on genre and performance
        const declineRate = Math.pow(0.65, film.weeksSinceRelease); // Faster decline
        const weeklyEarnings = baseEarnings * declineRate;
        
        if (weeklyEarnings > 50_000) { // Stop tracking when earnings drop below $50k
          this.recordFilmRevenue(
            film.id,
            weeklyEarnings,
            currentWeek,
            currentYear,
            `Week ${film.weeksSinceRelease + 1} box office`
          );
          
          // Add streaming revenue after theatrical window (4+ weeks)
          if (film.weeksSinceRelease >= 4) {
            const streamingRevenue = weeklyEarnings * 0.3; // 30% of box office
            this.recordTransaction(
              'revenue',
              'streaming',
              streamingRevenue,
              currentWeek,
              currentYear,
              `Streaming revenue - Week ${film.weeksSinceRelease + 1}`,
              film.id
            );
          }
        }
      }
    });
  }

  static processWeeklyFinancialEvents(currentWeek: number, currentYear: number, studios: Studio[], projects: Project[]): void {
    this.ensureLoaded();

    // Process studio overhead costs
    studios.forEach(studio => {
      const weeklyOverhead = Math.max(studio.budget * 0.001, 50_000); // 0.1% of budget or $50k minimum
      this.recordStudioOverhead(
        weeklyOverhead,
        currentWeek,
        currentYear,
        `Studio ${studio.name} weekly overhead`
      );
    });

    // Process ongoing production costs
    projects.forEach(project => {
      if (project.status === 'production' || project.status === 'post-production') {
        const weeklyProductionCost = project.budget.total * 0.02; // 2% of budget per week
        this.recordFilmExpense(
          project.id,
          weeklyProductionCost,
          currentWeek,
          currentYear,
          'production',
          `Weekly production costs - ${project.title}`
        );
      }
      
      // Process talent weekly payments
      if (project.contractedTalent) {
        project.contractedTalent.forEach((talent: any) => {
          if (talent.weeklyPay > 0) {
            this.recordFilmExpense(
              project.id,
              talent.weeklyPay,
              currentWeek,
              currentYear,
              'talent',
              `Weekly payment - ${talent.name}`
            );
          }
        });
      }
    });
  }
  
  static clearFilmTransactions(filmId: string): void {
    this.ensureLoaded();

    this.transactions = this.transactions.filter(t => t.filmId !== filmId);
    this.persist();
  }

  // Reset entire ledger (useful for new game)
  static clearAll(): void {
    this.transactions = [];
    this.nextTransactionId = 1;
    this.persist();
  }
  
  static exportLedger(): Transaction[] {
    this.ensureLoaded();
    return [...this.transactions]; // Return copy for debugging
  }
}