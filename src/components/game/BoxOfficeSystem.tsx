import { Project } from '@/types/game';
import { TimeSystem } from './TimeSystem';

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
    console.log(`🎬 INITIALIZING RELEASE: ${project.title} for Y${releaseYear}W${releaseWeek}`);
    console.log(`   Current project status: ${project.status}`);
    console.log(`   Current project metrics:`, project.metrics);
    
    const result = {
      ...project,
      status: 'released' as any,
      releaseWeek,
      releaseYear,
      metrics: {
        ...project.metrics,
        inTheaters: true, // Enter theaters immediately upon release
        boxOfficeTotal: 0,
        theaterCount: this.getInitialTheaterCount(project),
        weeksSinceRelease: 0,
        criticsScore: Math.floor(Math.random() * 40) + 50, // 50-90
        audienceScore: Math.floor(Math.random() * 40) + 50, // 50-90
        boxOfficeStatus: 'Opening',
        theatricalRunLocked: false // Track if run has permanently ended
      }
    };
    
    console.log(`   Result status: ${result.status}, inTheaters: ${result.metrics.inTheaters}, theaterCount: ${result.metrics.theaterCount}`);
    console.log(`   Full result metrics:`, result.metrics);
    return result;
  }

  static processWeeklyRevenue(
    project: Project, 
    currentWeek: number, 
    currentYear: number
  ): Project {
    console.log(`\n📊 BOX OFFICE WEEKLY: ${project.title}`);
    console.log(`   Project status: ${project.status}, inTheaters: ${project.metrics?.inTheaters}`);
    
    // Skip if no release scheduled
    if (!project.releaseWeek || !project.releaseYear) {
      console.log(`   ❌ NO RELEASE SCHEDULED`);
      return project;
    }

    // Skip if theatrical run has permanently ended
    if (project.metrics?.theatricalRunLocked) {
      console.log(`  ✅ Run permanently ended`);
      return project;
    }

    // Calculate if release date has arrived
    const currentAbsoluteWeek = (currentYear * 52) + currentWeek;
    const releaseAbsoluteWeek = (project.releaseYear * 52) + project.releaseWeek;
    const hasReleased = currentAbsoluteWeek >= releaseAbsoluteWeek;
    
    console.log(`   Current: Y${currentYear}W${currentWeek} (${currentAbsoluteWeek})`);
    console.log(`   Release: Y${project.releaseYear}W${project.releaseWeek} (${releaseAbsoluteWeek})`);
    console.log(`   Has released: ${hasReleased}`);
    
    if (!hasReleased) {
      console.log(`  ⏳ Waiting for release: Y${project.releaseYear}W${project.releaseWeek}`);
      return project;
    }

    // Calculate exact weeks since release (0 for release week, 1 for next week, etc.)
    const weeksSinceRelease = Math.max(0, currentAbsoluteWeek - releaseAbsoluteWeek);
    console.log(`  📅 Week ${weeksSinceRelease} of theatrical run (0 = release week)`);

    // Check if project should be processing (week 0 = release week, already in theaters from init)
    if (weeksSinceRelease === 0) {
      console.log(`  🎭 RELEASE WEEK - Project should already be in theaters from initialization`);
      console.log(`  📊 Current metrics: inTheaters=${project.metrics?.inTheaters}, theaterCount=${project.metrics?.theaterCount}`);
    }
    
    // First week: Enter theaters (this should not happen for week 0 releases)
    if (!project.metrics?.inTheaters && weeksSinceRelease === 1) {
      console.log(`  🎭 ENTERING THEATERS (Week 1 entry)`);
      const initialTheaters = this.getInitialTheaterCount(project);
      
      return {
        ...project,
        metrics: {
          ...project.metrics,
          inTheaters: true,
          theaterCount: initialTheaters,
          weeksSinceRelease: 1,
          boxOfficeTotal: 0,
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
      console.log(`  🏁 PERMANENTLY EXITING THEATERS`);
      
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

    console.log(`  💰 Week ${weeksSinceRelease} Report:`);
    console.log(`     Weekly: $${weeklyRevenue.toLocaleString()}`);
    console.log(`     Previous Total: $${(project.metrics.boxOfficeTotal || 0).toLocaleString()}`);
    console.log(`     New Total: $${newTotal.toLocaleString()}`);
    console.log(`     Theaters: ${theaterCount}`);
    console.log(`     Status: ${status}`);
    console.log(`     Chart: #${report.chartPosition}`);

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
      console.log(`    🚫 MAXIMUM RUN REACHED (20 weeks)`);
      return true;
    }

    // POOR PERFORMANCE: Exit after 8 weeks for truly bad films
    if (weeksSinceRelease >= 8) {
      const avgScore = ((project.metrics?.criticsScore || 50) + (project.metrics?.audienceScore || 50)) / 2;
      if (avgScore < 40) {
        console.log(`    🚫 POOR PERFORMANCE EXIT (${avgScore.toFixed(1)} avg score)`);
        return true;
      }
    }

    // MEDIOCRE PERFORMANCE: Exit after 14 weeks
    if (weeksSinceRelease >= 14) {
      const avgScore = ((project.metrics?.criticsScore || 50) + (project.metrics?.audienceScore || 50)) / 2;
      if (avgScore < 60) {
        console.log(`    🚫 MEDIOCRE PERFORMANCE EXIT (${avgScore.toFixed(1)} avg score)`);
        return true;
      }
    }

    // GOOD PERFORMANCE: Can run full 20 weeks
    console.log(`    ✅ CONTINUING (Week ${weeksSinceRelease}, good performance)`);
    return false;
  }

  private static calculateWeeklyRevenue(project: Project, weeksSinceRelease: number): number {
    // Base revenue potential
    const baseRevenue = project.budget.total * 0.5; // 50% of budget as opening week potential
    
    // Performance multipliers
    const criticsMultiplier = (project.metrics?.criticsScore || 50) / 100;
    const audienceMultiplier = (project.metrics?.audienceScore || 50) / 100;
    const marketingMultiplier = 1 + ((project.marketingCampaign?.buzz || 0) / 100);
    
    // Release strategy multiplier
    const releaseMultiplier = this.getReleaseMultiplier(project.releaseStrategy?.type || 'wide');
    
    // Weekly decline curve
    const weeklyMultiplier = this.getRealisticWeeklyMultiplier(weeksSinceRelease);
    
    const totalRevenue = baseRevenue * 
      criticsMultiplier * 
      audienceMultiplier * 
      marketingMultiplier * 
      releaseMultiplier * 
      weeklyMultiplier;
    
    return Math.max(0, Math.floor(totalRevenue));
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