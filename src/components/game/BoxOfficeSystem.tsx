import { Project } from '@/types/game';
import { TimeSystem } from './TimeSystem';

export interface BoxOfficeState {
  inTheaters: boolean;
  weeksSinceRelease: number;
  totalRevenue: number;
  weeklyRevenue: number;
  theaterCount: number;
  status: 'opening' | 'wide' | 'limited' | 'ending' | 'ended';
}

export class BoxOfficeSystem {
  static initializeRelease(project: Project, releaseWeek: number, releaseYear: number): Project {
    console.log(`INITIALIZING RELEASE: ${project.title} for Y${releaseYear}W${releaseWeek}`);
    
    return {
      ...project,
      status: 'released' as any,
      releaseWeek,
      releaseYear,
      metrics: {
        ...project.metrics,
        inTheaters: false, // Will start when release date arrives
        boxOfficeTotal: 0,
        theaterCount: 0,
        weeksSinceRelease: 0,
        criticsScore: Math.floor(Math.random() * 40) + 50, // 50-90
        audienceScore: Math.floor(Math.random() * 40) + 50 // 50-90
      }
    };
  }

  static processWeeklyRevenue(
    project: Project, 
    currentWeek: number, 
    currentYear: number
  ): Project {
    console.log(`BOX OFFICE PROCESSING: ${project.title}`);
    console.log(`  Release: Y${project.releaseYear}W${project.releaseWeek}, Current: Y${currentYear}W${currentWeek}`);
    console.log(`  Status: inTheaters=${project.metrics?.inTheaters}, total=$${(project.metrics?.boxOfficeTotal || 0).toLocaleString()}`);
    
    // Skip if no release date set
    if (!project.releaseWeek || !project.releaseYear) {
      console.log(`  → No release date set`);
      return project;
    }

    // Check if release date has arrived
    const currentAbsoluteWeek = (currentYear * 52) + currentWeek;
    const releaseAbsoluteWeek = (project.releaseYear * 52) + project.releaseWeek;
    const hasReleased = currentAbsoluteWeek >= releaseAbsoluteWeek;
    
    if (!hasReleased) {
      console.log(`  → Waiting for release date`);
      return project;
    }

    // Calculate accurate weeks since release
    const weeksSinceRelease = Math.max(1, currentAbsoluteWeek - releaseAbsoluteWeek + 1);
    console.log(`  → Weeks since release: ${weeksSinceRelease}`);

    // First week - enter theaters
    if (!project.metrics?.inTheaters && weeksSinceRelease === 1) {
      console.log(`  → ENTERING THEATERS`);
      return {
        ...project,
        metrics: {
          ...project.metrics,
          inTheaters: true,
          theaterCount: this.getInitialTheaterCount(project),
          weeksSinceRelease: 1,
          boxOfficeTotal: 0
        }
      };
    }

    // If not in theaters yet, skip revenue processing
    if (!project.metrics?.inTheaters) {
      console.log(`  → Not in theaters yet`);
      return project;
    }

    // Check if should exit theaters (final decision - no flip-flopping)
    if (this.shouldExitTheaters(project, weeksSinceRelease)) {
      console.log(`  → EXITING THEATERS permanently`);
      return {
        ...project,
        metrics: {
          ...project.metrics,
          inTheaters: false,
          theaterCount: 0,
          weeksSinceRelease,
          boxOfficeStatus: 'ended'
        },
        postTheatricalEligible: true,
        theatricalEndDate: new Date()
      };
    }

    // Calculate weekly revenue and theater count
    const weeklyRevenue = this.calculateWeeklyRevenue(project, weeksSinceRelease);
    const newTotal = (project.metrics.boxOfficeTotal || 0) + weeklyRevenue;
    const theaterCount = this.calculateTheaterCount(project, weeksSinceRelease);

    console.log(`  → Weekly: $${weeklyRevenue.toLocaleString()}, Total: $${newTotal.toLocaleString()}, Theaters: ${theaterCount}`);

    return {
      ...project,
      metrics: {
        ...project.metrics,
        boxOfficeTotal: newTotal,
        theaterCount,
        weeksSinceRelease,
        lastWeeklyRevenue: weeklyRevenue,
        boxOfficeStatus: this.getBoxOfficeStatus(weeksSinceRelease, theaterCount)
      }
    };
  }

  private static getInitialTheaterCount(project: Project): number {
    const releaseType = project.releaseStrategy?.type || 'wide';
    switch (releaseType) {
      case 'wide': return 3000;
      case 'limited': return 500;
      case 'platform': return 100;
      case 'festival': return 50;
      default: return 3000;
    }
  }

  private static getBoxOfficeStatus(weeksSinceRelease: number, theaterCount: number): string {
    if (theaterCount === 0) return 'ended';
    if (weeksSinceRelease <= 2) return 'opening';
    if (theaterCount >= 2000) return 'wide';
    if (theaterCount >= 500) return 'limited';
    return 'ending';
  }

  private static shouldExitTheaters(project: Project, weeksSinceRelease: number): boolean {
    // Hard exit conditions - no exceptions, no flip-flopping
    
    // Maximum theatrical run: 16 weeks
    if (weeksSinceRelease >= 16) {
      console.log(`    → EXIT: Maximum 16 weeks reached`);
      return true;
    }

    // Poor performance: exit after 6 weeks if low scores
    if (weeksSinceRelease >= 6) {
      const avgScore = ((project.metrics?.criticsScore || 50) + (project.metrics?.audienceScore || 50)) / 2;
      if (avgScore < 65) {
        console.log(`    → EXIT: Poor performance (${avgScore.toFixed(1)} average)`);
        return true;
      }
    }

    // Average performance: exit after 10 weeks if mediocre scores
    if (weeksSinceRelease >= 10) {
      const avgScore = ((project.metrics?.criticsScore || 50) + (project.metrics?.audienceScore || 50)) / 2;
      if (avgScore < 75) {
        console.log(`    → EXIT: Mediocre performance (${avgScore.toFixed(1)} average)`);
        return true;
      }
    }

    // Good performance: can run up to 16 weeks
    console.log(`    → CONTINUE: Still performing well (week ${weeksSinceRelease})`);
    return false;
  }

  private static calculateWeeklyRevenue(project: Project, weeksSinceRelease: number): number {
    const baseRevenue = project.budget.total * 0.4; // 40% of budget as peak potential
    
    // Performance multipliers
    const criticsMultiplier = (project.metrics?.criticsScore || 50) / 100;
    const audienceMultiplier = (project.metrics?.audienceScore || 50) / 100;
    const marketingMultiplier = 1 + ((project.marketingCampaign?.buzz || 0) / 100);
    
    // Release strategy impact
    const releaseMultiplier = this.getReleaseMultiplier(project.releaseStrategy?.type || 'wide');
    
    // Weekly curve - starts high, drops off realistically
    const weeklyMultiplier = this.getWeeklyMultiplier(weeksSinceRelease);
    
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
      case 'limited': return 0.3;
      case 'platform': return 0.6;
      case 'festival': return 0.2;
      default: return 1.0;
    }
  }

  private static getWeeklyMultiplier(week: number): number {
    // Realistic box office curve
    const multipliers = [
      1.0,   // Week 1: Opening weekend peak
      0.65,  // Week 2: Standard drop
      0.45,  // Week 3: Continued decline
      0.35,  // Week 4: Settling
      0.28,  // Week 5
      0.22,  // Week 6
      0.18,  // Week 7
      0.15,  // Week 8
      0.12,  // Week 9
      0.10,  // Week 10
      0.08,  // Week 11
      0.06,  // Week 12
      0.05,  // Week 13
      0.04,  // Week 14
      0.03,  // Week 15
      0.02   // Week 16: Final week
    ];
    
    return multipliers[week - 1] || 0.01;
  }

  private static calculateTheaterCount(project: Project, weeksSinceRelease: number): number {
    const initialCount = this.getInitialTheaterCount(project);
    const releaseType = project.releaseStrategy?.type || 'wide';
    
    // Platform release - expands over time if successful
    if (releaseType === 'platform') {
      const avgScore = ((project.metrics?.criticsScore || 50) + (project.metrics?.audienceScore || 50)) / 2;
      if (avgScore > 75 && weeksSinceRelease >= 4) {
        return Math.min(3000, initialCount * (weeksSinceRelease - 2)); // Expand after week 4
      }
    }
    
    // Standard decline pattern
    if (weeksSinceRelease <= 2) return initialCount;
    if (weeksSinceRelease <= 6) return Math.floor(initialCount * 0.9);
    if (weeksSinceRelease <= 10) return Math.floor(initialCount * 0.7);
    if (weeksSinceRelease <= 14) return Math.floor(initialCount * 0.4);
    return Math.floor(initialCount * 0.2);
  }
}