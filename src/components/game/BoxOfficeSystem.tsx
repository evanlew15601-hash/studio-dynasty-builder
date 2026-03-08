import { Project } from '@/types/game';
import { FinancialEngine } from './FinancialEngine';
import { stableInt } from '@/utils/stableRandom';

const diagnosticsEnabled = import.meta.env.DEV;
const debugLog = (...args: any[]) => {
  if (diagnosticsEnabled) console.log(...args);
};

export interface BoxOfficeWeeklyReport {
  weekNumber: number;
  weeklyRevenue: number;
  cumulativeRevenue: number;
  chartPosition: number;
  screenCount: number;
  status: 'Opening' | 'Wide Release' | 'Limited Release' | 'Final Week' | 'Ended';
  audienceScore: number;
  criticsScore: number;
}

export class BoxOfficeSystem {
  static initializeRelease(project: Project, releaseWeek: number, releaseYear: number): Project {
    debugLog(`INITIALIZING RELEASE: ${project.title} for Y${releaseYear}W${releaseWeek}`);
    debugLog(`   Current project status: ${project.status}`);
    debugLog(`   Current project metrics:`, project.metrics);

    const criticsScore = project.metrics?.criticsScore ?? stableInt(`${project.id}|critics|${releaseYear}|${releaseWeek}`, 50, 90);
    const audienceScore = project.metrics?.audienceScore ?? stableInt(`${project.id}|audience|${releaseYear}|${releaseWeek}`, 50, 90);

    const projectWithScores: Project = {
      ...project,
      metrics: {
        ...project.metrics,
        criticsScore,
        audienceScore,
      },
    };

    // Calculate opening week revenue immediately during release
    const openingWeekRevenue = this.calculateWeeklyRevenue(projectWithScores, 0);
    debugLog(`   OPENING WEEK REVENUE: ${openingWeekRevenue.toLocaleString()}`);

    // Record opening week revenue in the unified ledger (idempotent by week/year)
    const existingOpening = FinancialEngine.getFilmFinancials(project.id).transactions.some(t =>
      t.type === 'revenue' &&
      t.category === 'boxoffice' &&
      t.week === releaseWeek &&
      t.year === releaseYear
    );
    if (!existingOpening && openingWeekRevenue > 0) {
      FinancialEngine.recordFilmRevenue(project.id, openingWeekRevenue, releaseWeek, releaseYear, 'Opening week');
    }

    const result = {
      ...projectWithScores,
      status: 'released' as any,
      currentPhase: 'distribution' as any,
      phaseDuration: -1,
      releaseWeek,
      releaseYear,
      metrics: {
        ...projectWithScores.metrics,
        inTheaters: true, // Enter theaters immediately upon release
        boxOfficeTotal: openingWeekRevenue, // START with opening week revenue
        theaterCount: this.getInitialTheaterCount(projectWithScores),
        weeksSinceRelease: 0,
        criticsScore,
        audienceScore,
        boxOfficeStatus: 'Opening',
        theatricalRunLocked: false, // Track if run has permanently ended
        lastWeeklyRevenue: openingWeekRevenue
      }
    };

    debugLog(`   Result status: ${result.status}, inTheaters: ${result.metrics.inTheaters}, theaterCount: ${result.metrics.theaterCount}`);
    debugLog(`   Initial boxOfficeTotal: \u0024${result.metrics.boxOfficeTotal?.toLocaleString()}`);
    debugLog(`   Full result metrics:`, result.metrics);
    return result;
  }

  static processWeeklyRevenue(
    project: Project,
    currentWeek: number,
    currentYear: number
  ): Project {
    debugLog(`\nBOX OFFICE WEEKLY: ${project.title}`);
    debugLog(`   Project status: ${project.status}, inTheaters: ${project.metrics?.inTheaters}`);

    // Skip if no release scheduled
    if (!project.releaseWeek || !project.releaseYear) {
      debugLog(`   NO RELEASE SCHEDULED`);
      return project;
    }

    // Skip if theatrical run has permanently ended
    if (project.metrics?.theatricalRunLocked) {
      debugLog(`  Run permanently ended`);
      return project;
    }

    // Calculate if release date has arrived
    const currentAbsoluteWeek = (currentYear * 52) + currentWeek;
    const releaseAbsoluteWeek = (project.releaseYear * 52) + project.releaseWeek;
    const hasReleased = currentAbsoluteWeek >= releaseAbsoluteWeek;

    debugLog(`   Current: Y${currentYear}W${currentWeek} (${currentAbsoluteWeek})`);
    debugLog(`   Release: Y${project.releaseYear}W${project.releaseWeek} (${releaseAbsoluteWeek})`);
    debugLog(`   Has released: ${hasReleased}`);

    if (!hasReleased) {
      debugLog(`  Waiting for release: Y${project.releaseYear}W${project.releaseWeek}`);
      return project;
    }

    // Calculate exact weeks since release (0 for release week, 1 for next week, etc.)
    const weeksSinceRelease = Math.max(0, currentAbsoluteWeek - releaseAbsoluteWeek);
    debugLog(`  Week ${weeksSinceRelease} of theatrical run (0 = release week)`);

    // Week 0 revenue is handled during initializeRelease(). Do not double-count.
    if (weeksSinceRelease === 0) {
      debugLog(`  RELEASE WEEK - revenue already captured during initialization`);
      return {
        ...project,
        metrics: {
          ...project.metrics,
          weeksSinceRelease: 0,
        }
      };
    }

    // First week: Enter theaters (this should not happen for week 0 releases)
    if (!project.metrics?.inTheaters && weeksSinceRelease === 1) {
      debugLog(`  ENTERING THEATERS (Week 1 entry)`);
      const initialTheaters = this.getInitialTheaterCount(project);

      return {
        ...project,
        metrics: {
          ...project.metrics,
          inTheaters: true,
          theaterCount: initialTheaters,
          weeksSinceRelease: 1,
          // KEEP existing boxOfficeTotal instead of resetting to 0
          boxOfficeTotal: project.metrics.boxOfficeTotal || 0,
          boxOfficeStatus: 'Opening'
        }
      };
    }

    // Skip if not in theaters yet
    if (!project.metrics?.inTheaters) {
      return project;
    }

    // Check for permanent exit (no flip-flopping)
    if (this.shouldExitTheatersPermanently(project, weeksSinceRelease)) {
      debugLog(`  PERMANENTLY EXITING THEATERS`);

      return {
        ...project,
        metrics: {
          ...project.metrics,
          inTheaters: false,
          theaterCount: 0,
          weeksSinceRelease,
          boxOfficeStatus: 'Ended',
          theatricalRunLocked: true // LOCK THE RUN - NO MORE CHANGES
        },
        postTheatricalEligible: true,
        theatricalEndDate: new Date()
      };
    }

    // Calculate this week's performance
    const weeklyRevenue = this.calculateWeeklyRevenue(project, weeksSinceRelease);
    const newTotal = (project.metrics.boxOfficeTotal || 0) + weeklyRevenue;
    const theaterCount = this.calculateTheaterCount(project, weeksSinceRelease);
    const status = this.getWeeklyStatus(weeksSinceRelease, theaterCount);

    // Generate weekly report
    const report: BoxOfficeWeeklyReport = {
      weekNumber: weeksSinceRelease,
      weeklyRevenue,
      cumulativeRevenue: newTotal,
      chartPosition: this.calculateChartPosition(weeklyRevenue),
      screenCount: theaterCount,
      status: status as any,
      audienceScore: project.metrics.audienceScore || 50,
      criticsScore: project.metrics.criticsScore || 50
    };

    debugLog(`  Week ${weeksSinceRelease} Report:`);
    debugLog(`     Weekly: \u0024${weeklyRevenue.toLocaleString()}`);
    debugLog(`     Previous Total: \u0024${(project.metrics.boxOfficeTotal || 0).toLocaleString()}`);
    debugLog(`     New Total: \u0024${newTotal.toLocaleString()}`);
    debugLog(`     Theaters: ${theaterCount}`);
    debugLog(`     Status: ${status}`);
    debugLog(`     Chart: #${report.chartPosition}`);

    const alreadyRecorded = FinancialEngine.getFilmFinancials(project.id).transactions.some(t =>
      t.type === 'revenue' &&
      t.category === 'boxoffice' &&
      t.week === currentWeek &&
      t.year === currentYear
    );

    if (!alreadyRecorded && weeklyRevenue > 0) {
      FinancialEngine.recordFilmRevenue(project.id, weeklyRevenue, currentWeek, currentYear, `Week ${weeksSinceRelease + 1}`);
    }

    return {
      ...project,
      metrics: {
        ...project.metrics,
        boxOfficeTotal: newTotal,
        theaterCount,
        weeksSinceRelease,
        lastWeeklyRevenue: weeklyRevenue,
        boxOfficeStatus: status,
        lastWeeklyReport: report
      }
    };
  }

  private static getInitialTheaterCount(project: Project): number {
    const releaseType = project.releaseStrategy?.type || 'wide';
    switch (releaseType) {
      case 'wide': return 3200;
      case 'limited': return 600;
      case 'platform': return 150;
      case 'festival': return 80;
      default: return 3200;
    }
  }

  private static shouldExitTheatersPermanently(project: Project, weeksSinceRelease: number): boolean {
    // ABSOLUTE MAXIMUM: 20 weeks (5 months)
    if (weeksSinceRelease >= 20) {
      debugLog(`    MAXIMUM RUN REACHED (20 weeks)`);
      return true;
    }

    // POOR PERFORMANCE: Exit after 8 weeks for truly bad films
    if (weeksSinceRelease >= 8) {
      const avgScore = ((project.metrics?.criticsScore || 50) + (project.metrics?.audienceScore || 50)) / 2;
      if (avgScore < 40) {
        debugLog(`    POOR PERFORMANCE EXIT (${avgScore.toFixed(1)} avg score)`);
        return true;
      }
    }

    // MEDIOCRE PERFORMANCE: Exit after 14 weeks
    if (weeksSinceRelease >= 14) {
      const avgScore = ((project.metrics?.criticsScore || 50) + (project.metrics?.audienceScore || 50)) / 2;
      if (avgScore < 60) {
        debugLog(`    MEDIOCRE PERFORMANCE EXIT (${avgScore.toFixed(1)} avg score)`);
        return true;
      }
    }

    // GOOD PERFORMANCE: Can run full 20 weeks
    debugLog(`    CONTINUING (Week ${weeksSinceRelease}, good performance)`);
    return false;
  }

  private static calculateWeeklyRevenue(project: Project, weeksSinceRelease: number): number {
    // CRITICAL FIX: Ensure revenue is never $0 for valid projects
    debugLog(`REVENUE CALCULATION for ${project.title}, week ${weeksSinceRelease}`);

    // Base revenue potential - increased minimum
    const baseRevenue = Math.max(project.budget.total * 0.3, 500000); // At least 500k minimum
    debugLog(`   Base revenue: \u0024${baseRevenue.toLocaleString()}`);

    // Performance multipliers (ensure never 0)
    const criticsMultiplier = Math.max(0.3, (project.metrics?.criticsScore || 50) / 100);
    const audienceMultiplier = Math.max(0.3, (project.metrics?.audienceScore || 50) / 100);

    // Marketing multiplier - decouple from PR state to fix interference bug
    let marketingMultiplier = 1.0;
    if (project.marketingCampaign) {
      const buzzBonus = Math.max(0, (project.marketingCampaign.buzz || 0) / 100);
      const budgetBonus = Math.max(0, (project.marketingCampaign.budgetSpent || 0) / 1000000 * 0.1);
      marketingMultiplier = 1 + buzzBonus + budgetBonus;
    }

    debugLog(`   Multipliers - Critics: ${criticsMultiplier}, Audience: ${audienceMultiplier}, Marketing: ${marketingMultiplier}`);

    // Star power multiplier from confirmed casting
    const starPowerMultiplier = 1 + Math.min(0.5, project.starPowerBonus || 0);

    // Release strategy multiplier
    const releaseMultiplier = this.getReleaseMultiplier(project.releaseStrategy?.type || 'wide');

    // Weekly decline curve
    const weeklyMultiplier = this.getRealisticWeeklyMultiplier(weeksSinceRelease);

    const totalRevenue = baseRevenue *
      criticsMultiplier *
      audienceMultiplier *
      marketingMultiplier *
      starPowerMultiplier *
      releaseMultiplier *
      weeklyMultiplier;

    const finalRevenue = Math.max(100000, Math.floor(totalRevenue)); // NEVER below 100k
    debugLog(`   Final revenue: \u0024${finalRevenue.toLocaleString()}`);

    // FAIL-SAFE: If calculation somehow results in 0, force minimum
    if (finalRevenue === 0) {
      console.error(`REVENUE BUG DETECTED: ${project.title} calculated $0 - forcing minimum`);
      return Math.max(250000, project.budget.total * 0.05); // 5% of budget minimum
    }

    return finalRevenue;
  }

  private static getReleaseMultiplier(releaseType: string): number {
    switch (releaseType) {
      case 'wide': return 1.0;
      case 'limited': return 0.4;
      case 'platform': return 0.6; // Can expand if successful
      case 'festival': return 0.25;
      default: return 1.0;
    }
  }

  private static getRealisticWeeklyMultiplier(week: number): number {
    // Real-world box office decline patterns
    const curve = [
      1.00,  // Week 1: Opening weekend
      0.55,  // Week 2: Typical 45% drop
      0.35,  // Week 3: Continued decline
      0.25,  // Week 4: Stabilizing
      0.20,  // Week 5
      0.16,  // Week 6
      0.13,  // Week 7
      0.11,  // Week 8
      0.09,  // Week 9
      0.07,  // Week 10
      0.06,  // Week 11
      0.05,  // Week 12
      0.04,  // Week 13
      0.03,  // Week 14
      0.025, // Week 15
      0.02,  // Week 16
      0.015, // Week 17
      0.01,  // Week 18
      0.008, // Week 19
      0.005  // Week 20: Final weeks
    ];

    return curve[week] || 0.001;
  }

  private static calculateTheaterCount(project: Project, weeksSinceRelease: number): number {
    const initialCount = this.getInitialTheaterCount(project);
    const releaseType = project.releaseStrategy?.type || 'wide';

    // Platform release: Expands if successful
    if (releaseType === 'platform') {
      const avgScore = ((project.metrics?.criticsScore || 50) + (project.metrics?.audienceScore || 50)) / 2;
      if (avgScore > 80 && weeksSinceRelease >= 3) {
        // Successful platform release expands
        const expansionMultiplier = Math.min(4, weeksSinceRelease / 2);
        return Math.min(3200, Math.floor(initialCount * expansionMultiplier));
      }
    }

    // Standard wide/limited release decline
    if (weeksSinceRelease <= 2) return initialCount;
    if (weeksSinceRelease <= 4) return Math.floor(initialCount * 0.95);
    if (weeksSinceRelease <= 8) return Math.floor(initialCount * 0.85);
    if (weeksSinceRelease <= 12) return Math.floor(initialCount * 0.65);
    if (weeksSinceRelease <= 16) return Math.floor(initialCount * 0.35);
    return Math.floor(initialCount * 0.15);
  }

  private static getWeeklyStatus(weeksSinceRelease: number, theaterCount: number): string {
    if (theaterCount === 0) return 'Ended';
    if (weeksSinceRelease === 1) return 'Opening';
    if (theaterCount >= 2500) return 'Wide Release';
    if (theaterCount >= 1000) return 'Limited Release';
    if (weeksSinceRelease >= 16) return 'Final Week';
    return 'Limited Release';
  }

  private static calculateChartPosition(weeklyRevenue: number): number {
    // Simple chart position based on revenue
    if (weeklyRevenue >= 50000000) return 1;  // $50M+ = #1
    if (weeklyRevenue >= 30000000) return 2;  // $30M+ = #2
    if (weeklyRevenue >= 20000000) return 3;  // $20M+ = #3
    if (weeklyRevenue >= 15000000) return 4;  // $15M+ = #4
    if (weeklyRevenue >= 10000000) return 5;  // $10M+ = #5
    if (weeklyRevenue >= 7000000) return 7;   // $7M+ = #7
    if (weeklyRevenue >= 5000000) return 10;  // $5M+ = #10
    if (weeklyRevenue >= 2000000) return 15;  // $2M+ = #15
    return Math.min(20, Math.floor(20 - (weeklyRevenue / 100000))); // Scale down
  }
}
