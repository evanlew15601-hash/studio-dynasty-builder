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
    console.log(`INITIALIZING RELEASE: ${project.title} at Y${releaseYear}W${releaseWeek}`);
    
    return {
      ...project,
      status: 'released' as any,
      releaseWeek,
      releaseYear,
      metrics: {
        ...project.metrics,
        inTheaters: true,
        boxOfficeTotal: 0,
        theaterCount: 3000,
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
    console.log(`    BOX OFFICE: Processing ${project.title}`);
    console.log(`      Project status: ${project.status}`);
    console.log(`      Release info: Week ${project.releaseWeek}, Year ${project.releaseYear}`);
    console.log(`      Current time: Week ${currentWeek}, Year ${currentYear}`);
    console.log(`      Current metrics inTheaters: ${project.metrics?.inTheaters}`);
    
    // Only process if film is in theaters AND release date has passed
    if (!project.metrics?.inTheaters || !project.releaseWeek || !project.releaseYear) {
      console.log(`      → Skipping: inTheaters=${project.metrics?.inTheaters}, releaseWeek=${project.releaseWeek}, releaseYear=${project.releaseYear}`);
      return project;
    }

    // Check if release date has actually arrived
    const hasReleased = currentYear > project.releaseYear || 
                       (currentYear === project.releaseYear && currentWeek >= project.releaseWeek);
    
    if (!hasReleased) {
      console.log(`      → Skipping: Release scheduled for Week ${project.releaseWeek}, Year ${project.releaseYear} but current time is Week ${currentWeek}, Year ${currentYear}`);
      return project;
    }

    const weeksSinceRelease = TimeSystem.calculateWeeksSince(
      project.releaseWeek,
      project.releaseYear,
      currentWeek,
      currentYear
    );

    console.log(`      Weeks since release: ${weeksSinceRelease}`);

    // Check if film should leave theaters
    const shouldExit = this.shouldExitTheaters(project, weeksSinceRelease);
    console.log(`      Should exit theaters: ${shouldExit}`);
    if (shouldExit) {
      console.log(`      → FILM EXITING THEATERS: ${project.title} after ${weeksSinceRelease} weeks`);
      return {
        ...project,
        metrics: {
          ...project.metrics,
          inTheaters: false,
          theaterCount: 0,
          weeksSinceRelease
        },
        postTheatricalEligible: true,
        theatricalEndDate: new Date()
      };
    }

    // Calculate weekly revenue
    const weeklyRevenue = this.calculateWeeklyRevenue(project, weeksSinceRelease);
    const newTotal = (project.metrics.boxOfficeTotal || 0) + weeklyRevenue;
    const theaterCount = this.calculateTheaterCount(project, weeksSinceRelease);

    console.log(`      → Weekly revenue: $${weeklyRevenue.toLocaleString()}, New total: $${newTotal.toLocaleString()}`);

    return {
      ...project,
      metrics: {
        ...project.metrics,
        boxOfficeTotal: newTotal,
        theaterCount,
        weeksSinceRelease
      }
    };
  }

  private static shouldExitTheaters(project: Project, weeksSinceRelease: number): boolean {
    // Simple, guaranteed exit logic
    
    // Force exit after 12 weeks maximum (was 18, now much shorter)
    if (weeksSinceRelease >= 12) {
      console.log(`→ EXIT: 12 weeks maximum reached`);
      return true;
    }

    // Exit after just 6 weeks for poor performance
    if (weeksSinceRelease >= 6) {
      const criticsScore = project.metrics.criticsScore || 50;
      const audienceScore = project.metrics.audienceScore || 50;
      const avgScore = (criticsScore + audienceScore) / 2;
      
      if (avgScore < 70) {
        console.log(`→ EXIT: Poor performance (${avgScore} < 70) after ${weeksSinceRelease} weeks`);
        return true;
      }
    }

    // Exit after 8 weeks for average performance  
    if (weeksSinceRelease >= 8) {
      const criticsScore = project.metrics.criticsScore || 50;
      const audienceScore = project.metrics.audienceScore || 50;
      const avgScore = (criticsScore + audienceScore) / 2;
      
      if (avgScore < 80) {
        console.log(`→ EXIT: Average performance (${avgScore} < 80) after ${weeksSinceRelease} weeks`);
        return true;
      }
    }
    
    console.log(`→ STAY: Still performing well at week ${weeksSinceRelease}`);
    return false;
  }

  private static calculateWeeklyRevenue(project: Project, weeksSinceRelease: number): number {
    // FIXED: Handle week 0 (shouldn't happen now, but safety check)
    if (weeksSinceRelease <= 0) {
      console.log(`      WARNING: weeksSinceRelease is ${weeksSinceRelease}, treating as week 1`);
      weeksSinceRelease = 1;
    }
    
    const baseRevenue = project.budget.total * 0.3; // 30% of budget as baseline
    
    // Star power calculation
    const starPower = project.cast.reduce((sum, role) => {
      // Simplified calculation - would need talent lookup in real implementation
      return sum + 100000; // $100k per cast member as baseline
    }, 0);

    // Performance multipliers
    const criticsMultiplier = (project.metrics.criticsScore || 50) / 100;
    const audienceMultiplier = (project.metrics.audienceScore || 50) / 100;
    const marketingMultiplier = 1 + ((project.marketingCampaign?.buzz || 0) / 200);

    // Week-based dropoff
    const weeklyMultipliers = [1.0, 0.6, 0.4, 0.3, 0.25, 0.2, 0.15, 0.12, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.02, 0.01, 0.01];
    const weekMultiplier = weeklyMultipliers[weeksSinceRelease - 1] || 0.01;

    const totalRevenue = (baseRevenue + starPower) * criticsMultiplier * audienceMultiplier * marketingMultiplier * weekMultiplier;
    
    console.log(`REVENUE CALC: ${project.title} Week ${weeksSinceRelease} = $${Math.floor(totalRevenue).toLocaleString()}`);
    return Math.floor(totalRevenue);
  }

  private static calculateTheaterCount(project: Project, weeksSinceRelease: number): number {
    const baseTheaters = 3000;
    
    if (weeksSinceRelease <= 2) return baseTheaters; // Opening wide
    if (weeksSinceRelease <= 8) return Math.floor(baseTheaters * 0.8); // Slight reduction
    if (weeksSinceRelease <= 12) return Math.floor(baseTheaters * 0.5); // Limited release
    if (weeksSinceRelease <= 16) return Math.floor(baseTheaters * 0.2); // Very limited
    return Math.floor(baseTheaters * 0.05); // Final weeks
  }
}