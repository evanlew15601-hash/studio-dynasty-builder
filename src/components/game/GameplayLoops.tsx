// Complete Gameplay Loop Integration System
import { Project, Studio, GameState } from '@/types/game';
import { FinancialEngine } from './FinancialEngine';
import { DeepReputationSystem } from './DeepReputationSystem';
import { CalendarManager } from './CalendarManager';
import { ReleaseSystem } from './ReleaseSystem';

interface TimeState {
  week: number;
  year: number;
}

export interface GameplayLoopResult {
  success: boolean;
  phase: string;
  nextAction: string;
  errors: string[];
  warnings: string[];
  metrics: Record<string, any>;
}

export class GameplayLoops {
  
  // ============= COMPLETE FILM PRODUCTION LOOP =============
  static processFilmProductionLoop(
    project: Project, 
    studio: Studio, 
    currentTime: TimeState
  ): GameplayLoopResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metrics: Record<string, any> = {};
    
    if (import.meta.env.DEV) {
      console.log(`🎬 PROCESSING FILM LOOP: ${project.title} (${project.status})`);
    }
    
    // Phase 1: Development
    if (project.status === 'development') {
      const devResult = this.processDevelopmentPhase(project, studio, currentTime);
      metrics.development = devResult;
      
      if (!devResult.canAdvance) {
        return {
          success: false,
          phase: 'development',
          nextAction: devResult.nextAction,
          errors: devResult.errors,
          warnings: devResult.warnings,
          metrics
        };
      }
    }
    
    // Phase 2: Pre-production
    if (project.status === 'pre-production') {
      const preResult = this.processPreProductionPhase(project, studio, currentTime);
      metrics.preProduction = preResult;
      
      if (!preResult.canAdvance) {
        return {
          success: false,
          phase: 'pre-production',
          nextAction: preResult.nextAction,
          errors: preResult.errors,
          warnings: preResult.warnings,
          metrics
        };
      }
    }
    
    // Phase 3: Production
    if (project.status === 'production' || project.status === 'filming') {
      const prodResult = this.processProductionPhase(project, studio, currentTime);
      metrics.production = prodResult;
      
      // Record weekly production costs
      const weeklyProductionCost = project.budget.total * 0.03; // 3% per week
      FinancialEngine.recordFilmExpense(
        project.id,
        weeklyProductionCost,
        currentTime.week,
        currentTime.year,
        'production',
        `Weekly production costs - ${project.title}`
      );
      
      if (!prodResult.canAdvance) {
        return {
          success: false,
          phase: 'production',
          nextAction: prodResult.nextAction,
          errors: prodResult.errors,
          warnings: prodResult.warnings,
          metrics
        };
      }
    }
    
    // Phase 4: Post-production
    if (project.status === 'post-production') {
      const postResult = this.processPostProductionPhase(project, studio, currentTime);
      metrics.postProduction = postResult;
      
      if (!postResult.canAdvance) {
        return {
          success: false,
          phase: 'post-production',
          nextAction: postResult.nextAction,
          errors: postResult.errors,
          warnings: postResult.warnings,
          metrics
        };
      }
    }
    
    // Phase 5: Marketing & Release Preparation
    if (project.status === 'completed') {
      const marketingResult = this.processMarketingPhase(project, studio, currentTime);
      metrics.marketing = marketingResult;
      
      if (!marketingResult.canAdvance) {
        return {
          success: false,
          phase: 'marketing',
          nextAction: marketingResult.nextAction,
          errors: marketingResult.errors,
          warnings: marketingResult.warnings,
          metrics
        };
      }
    }
    
    // Phase 6: Release
    if (project.status === 'ready-for-release') {
      const releaseResult = this.processReleasePhase(project, studio, currentTime);
      metrics.release = releaseResult;
      
      if (!releaseResult.canAdvance) {
        return {
          success: false,
          phase: 'release',
          nextAction: releaseResult.nextAction,
          errors: releaseResult.errors,
          warnings: releaseResult.warnings,
          metrics
        };
      }
    }
    
    // Phase 7: Box Office & Revenue
    if (project.status === 'released') {
      const revenueResult = this.processRevenuePhase(project, studio, currentTime);
      metrics.revenue = revenueResult;
      
      return {
        success: true,
        phase: 'revenue',
        nextAction: 'Monitor box office performance',
        errors: [],
        warnings: revenueResult.warnings || [],
        metrics
      };
    }
    
    return {
      success: true,
      phase: project.status,
      nextAction: 'Continue current phase',
      errors,
      warnings,
      metrics
    };
  }
  
  // ============= PHASE PROCESSORS =============
  
  private static processDevelopmentPhase(project: Project, studio: Studio, currentTime: TimeState) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check script quality
    if (!project.script || project.script.quality < 30) {
      errors.push('Script quality too low for production');
    }
    
    // Check budget allocation
    if (!project.budget || project.budget.total < 1000000) {
      errors.push('Insufficient budget allocated');
    }
    
    // Check development time
    const developmentWeeks = 4; // Simplified
    if (developmentWeeks < 4) {
      warnings.push('Consider more development time for better results');
    }
    
    // Development costs
    const weeklyDevCost = project.budget.total * 0.005; // 0.5% per week
    FinancialEngine.recordFilmExpense(
      project.id,
      weeklyDevCost,
      currentTime.week,
      currentTime.year,
      'production',
      `Development costs - ${project.title}`
    );
    
    return {
      canAdvance: errors.length === 0,
      nextAction: errors.length > 0 ? 'Fix development issues' : 'Move to pre-production',
      errors,
      warnings,
      developmentWeeks,
      developmentCost: weeklyDevCost
    };
  }
  
  private static processPreProductionPhase(project: Project, studio: Studio, currentTime: TimeState) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check cast requirements
    const requiredRoles = ['Lead Actor', 'Supporting Actor', 'Director'];
    const castMembers = project.contractedTalent || [];
    
    requiredRoles.forEach(role => {
      const hasRole = castMembers.some(talent => talent.role === role);
      if (!hasRole) {
        errors.push(`Missing required role: ${role}`);
      }
    });
    
    // Check director
    const director = castMembers.find(t => t.role === 'Director');
    if (director && (director as any).reputation < 40) {
      warnings.push('Director reputation is low - may affect film quality');
    }
    
    // Pre-production costs
    const preProductionCost = project.budget.total * 0.1; // 10% for pre-production
    FinancialEngine.recordFilmExpense(
      project.id,
      preProductionCost,
      currentTime.week,
      currentTime.year,
      'production',
      `Pre-production costs - ${project.title}`
    );
    
    return {
      canAdvance: errors.length === 0,
      nextAction: errors.length > 0 ? 'Complete casting' : 'Begin production',
      errors,
      warnings,
      castComplete: errors.length === 0,
      preProductionCost
    };
  }
  
  private static processProductionPhase(project: Project, studio: Studio, currentTime: TimeState) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check production timeline
    const productionWeeks = 8; // Standard production length
    if (productionWeeks < 8) {
      warnings.push('Short production schedule may affect quality');
    }
    
    // Check budget vs spending
    const filmFinancials = FinancialEngine.getFilmFinancials(project.id);
    const budgetUsage = filmFinancials.expenses / project.budget.total;
    
    if (budgetUsage > 0.8) {
      warnings.push('High budget usage - monitor spending closely');
    }
    if (budgetUsage > 1.0) {
      errors.push('Over budget! Production may need to be scaled back');
    }
    
    // Talent performance affects reputation
    const castMembers = project.contractedTalent || [];
    castMembers.forEach(talent => {
      if (talent.weeklyPay > 0) {
        FinancialEngine.recordFilmExpense(
          project.id,
          talent.weeklyPay,
          currentTime.week,
          currentTime.year,
          'talent',
          `Weekly payment - ${(talent as any).name || talent.role}`
        );
      }
    });
    
    return {
      canAdvance: errors.length === 0,
      nextAction: errors.length > 0 ? 'Resolve production issues' : 'Move to post-production',
      errors,
      warnings,
      budgetUsage,
      weeklyTalentCosts: castMembers.reduce((sum, t) => sum + t.weeklyPay, 0)
    };
  }
  
  private static processPostProductionPhase(project: Project, studio: Studio, currentTime: TimeState) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Post-production costs
    const postProductionCost = project.budget.total * 0.15; // 15% for post-production
    FinancialEngine.recordFilmExpense(
      project.id,
      postProductionCost,
      currentTime.week,
      currentTime.year,
      'production',
      `Post-production costs - ${project.title}`
    );
    
    // Check post-production timeline
    const postWeeks = 4; // Standard post-production length
    if (postWeeks < 4) {
      warnings.push('Rushed post-production may affect final quality');
    }
    
    return {
      canAdvance: true,
      nextAction: 'Prepare marketing campaign',
      errors,
      warnings,
      postProductionCost
    };
  }
  
  private static processMarketingPhase(project: Project, studio: Studio, currentTime: TimeState) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check marketing budget
    const marketingBudget = project.distributionStrategy?.marketingBudget || 0;
    const recommendedMarketing = project.budget.total * 0.5; // 50% of production budget
    
    if (marketingBudget < recommendedMarketing * 0.3) {
      warnings.push('Low marketing budget may limit box office potential');
    }
    
    // Record marketing expenses
    const weeklyMarketingSpend = marketingBudget > 0 ? marketingBudget / 8 : 0; // Spread over 8 weeks
    if (weeklyMarketingSpend > 0) {
      FinancialEngine.recordFilmExpense(
        project.id,
        weeklyMarketingSpend,
        currentTime.week,
        currentTime.year,
        'marketing',
        `Marketing campaign - ${project.title}`
      );
    }
    
    // Check optimal release window using calendar system
    const calendarTime = {
      currentWeek: currentTime.week,
      currentYear: currentTime.year,
      currentQuarter: Math.ceil(currentTime.week / 13)
    };
    const optimalWindows = CalendarManager.getOptimalReleaseWindows(calendarTime);
    const hasOptimalDate = optimalWindows.length > 0;
    let recommendedWeek: number | undefined;
    let recommendedYear: number | undefined;
    let recommendedReason: string | undefined;
    
    if (!hasOptimalDate) {
      warnings.push('No optimal release window in the next 6 months');
    } else {
      const bestWindow = optimalWindows[0];
      recommendedWeek = bestWindow.week;
      recommendedYear = bestWindow.year;
      recommendedReason = bestWindow.reason;
    }
    
    return {
      canAdvance: true,
      nextAction: 'Schedule release date',
      errors,
      warnings,
      marketingBudget,
      weeklyMarketingSpend,
      hasOptimalWindow: hasOptimalDate,
      recommendedReleaseWeek: recommendedWeek,
      recommendedReleaseYear: recommendedYear,
      recommendedReleaseReason: recommendedReason
    };
  }
  
  private static processReleasePhase(project: Project, studio: Studio, currentTime: TimeState) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate release
    const releaseValidation = ReleaseSystem.validateFilmForRelease(project);
    errors.push(...releaseValidation.errors);
    warnings.push(...releaseValidation.warnings);
    
    let scheduledWeek: number | undefined;
    let scheduledYear: number | undefined;
    let scheduled = false;
    
    if (releaseValidation.canRelease && errors.length === 0) {
      const calendarTime = {
        currentWeek: currentTime.week,
        currentYear: currentTime.year,
        currentQuarter: Math.ceil(currentTime.week / 13)
      };
      
      const nextDate = ReleaseSystem.getNextAvailableReleaseDate(calendarTime);
      const releaseResult = ReleaseSystem.scheduleRelease(
        project,
        nextDate.week,
        nextDate.year,
        calendarTime
      );
      
      if (!releaseResult.success) {
        errors.push(releaseResult.message);
      } else {
        scheduled = true;
        scheduledWeek = releaseResult.releaseWeek;
        scheduledYear = releaseResult.releaseYear;
      }
    }
    
    return {
      canAdvance: scheduled && errors.length === 0,
      nextAction: errors.length > 0
        ? 'Fix release issues'
        : scheduled
          ? `Release scheduled for week ${scheduledWeek}, ${scheduledYear}`
          : 'Film ready for release scheduling',
      errors,
      warnings,
      releaseReady: releaseValidation.canRelease,
      scheduledWeek,
      scheduledYear
    };
  }
  
  private static processRevenuePhase(project: Project, studio: Studio, currentTime: TimeState) {
    const warnings: string[] = [];
    
    // Get current film financials
    const filmFinancials = FinancialEngine.getFilmFinancials(project.id);
    
    // Check performance
    const roi = filmFinancials.profit / Math.max(filmFinancials.expenses, 1) * 100;
    const weeksSinceRelease = project.metrics?.weeksSinceRelease ?? 0;
    
    if (roi < -50) {
      warnings.push('Film performing poorly - major loss expected');
    } else if (roi < 0) {
      warnings.push('Film not yet profitable - monitor performance');
    }
    
    // Update studio reputation based on performance
    if (weeksSinceRelease === 1) {
      // First week performance affects reputation immediately
      const performanceImpact = roi > 50 ? 5 : roi > 0 ? 2 : roi > -25 ? -1 : -3;
      
      if (import.meta.env.DEV) {
        console.log(`📊 REPUTATION IMPACT: ${project.title} performance (ROI: ${roi}%) affects studio reputation by ${performanceImpact}`);
      }
    }
    
    return {
      canAdvance: true,
      nextAction: 'Continue monitoring revenue',
      errors: [],
      warnings,
      currentROI: roi,
      totalRevenue: filmFinancials.revenue,
      totalExpenses: filmFinancials.expenses,
      weeksSinceRelease
    };
  }
  
  // ============= STUDIO MANAGEMENT LOOP =============
  
  static processStudioManagementLoop(
    studio: Studio,
    projects: Project[],
    currentTime: TimeState
  ): GameplayLoopResult {
    const warnings: string[] = [];
    const metrics: Record<string, any> = {};
    
    if (import.meta.env.DEV) {
      console.log(`🏢 PROCESSING STUDIO LOOP: ${studio.name}`);
    }
    
    // Financial health check
    const studioFinancials = FinancialEngine.getFinancialSummary(currentTime.week, currentTime.year);
    metrics.financials = studioFinancials;
    
    // Cash flow warning
    if (studioFinancials.cashOnHand < studioFinancials.weeklyBurn * 4) {
      warnings.push('Low cash reserves - less than 4 weeks runway');
    }
    
    // Project portfolio analysis
    const activeProjects = projects.filter(p =>
      ['development', 'pre-production', 'production', 'filming', 'post-production'].includes(p.status)
    );
    const releasedProjects = projects.filter(p => p.status === 'released');
    
    metrics.portfolio = {
      activeProjects: activeProjects.length,
      releasedProjects: releasedProjects.length,
      successRate: releasedProjects.length > 0 ? 
        releasedProjects.filter(p => {
          const financials = FinancialEngine.getFilmFinancials(p.id);
          return financials.profit > 0;
        }).length / releasedProjects.length : 0
    };
    
    // Reputation management (simplified for now)
    const reputationScore = studio.reputation || 50;
    metrics.reputation = { overallReputation: reputationScore };
    
    if (reputationScore < 30) {
      warnings.push('Studio reputation is critically low');
    }
    
    return {
      success: true,
      phase: 'studio-management',
      nextAction: 'Continue studio operations',
      errors: [],
      warnings,
      metrics
    };
  }
  
  // ============= INTEGRATION VERIFICATION =============
  
  static verifySystemIntegration(projects: Project[], studios: Studio[], currentTime: TimeState) {
    const results = {
      financial: true,
      calendar: true,
      reputation: true,
      release: true,
      production: true,
      errors: [] as string[],
      warnings: [] as string[]
    };
    
    if (import.meta.env.DEV) {
      console.log('🔍 VERIFYING SYSTEM INTEGRATION...');
    }
    
    // Verify financial tracking
    projects.forEach(project => {
      const financials = FinancialEngine.getFilmFinancials(project.id);
      if (project.status === 'released' && financials.revenue === 0) {
        results.financial = false;
        results.errors.push(`${project.title}: No revenue recorded despite being released`);
      }
    });
    
    // Verify calendar consistency (simplified)
    // const calendarEvents = CalendarManager.getEvents(currentTime.week, currentTime.year);
    // if (calendarEvents.length === 0) {
    //   results.warnings.push('No calendar events scheduled');
    // }
    
    // Verify reputation updates
    studios.forEach(studio => {
      if (studio.reputation === undefined || studio.reputation === 50) {
        results.warnings.push(`${studio.name}: Reputation may not be updating properly`);
      }
    });
    
    if (import.meta.env.DEV) {
      console.log('✅ INTEGRATION VERIFICATION COMPLETE:', results);
    }
    return results;
  }
}