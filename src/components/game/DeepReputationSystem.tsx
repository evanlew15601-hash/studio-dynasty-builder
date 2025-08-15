// Deep Reputation System - Industry Context & Nuanced Mechanics
import { Project, Studio, GameState, TalentPerson } from '../../types/game';
import { TimeState } from './TimeSystem';

export interface IndustryContext {
  marketSentiment: 'bullish' | 'bearish' | 'volatile' | 'stable';
  dominantStudios: string[]; // Top 3 studios by reputation
  emergingTrends: string[]; // Current industry trends
  scandals: IndustryScandal[];
  majorReleases: { studio: string; title: string; performance: string }[];
  seasonalFactor: number; // 0.8-1.2 based on time of year
}

export interface IndustryScandal {
  type: 'industry-wide' | 'competitor' | 'talent';
  severity: number; // 1-10
  description: string;
  reputationShift: number; // How much it shifts baseline expectations
  week: number;
  year: number;
}

export interface ReputationFactors {
  // Core factors
  trackRecord: number; // Historical success rate (0-100)
  consistency: number; // How reliable releases are (0-100)
  innovation: number; // Willingness to take creative risks (0-100)
  talentRelations: number; // How well studio works with talent (0-100)
  
  // Industry standing
  marketPosition: 'unknown' | 'indie' | 'boutique' | 'mid-tier' | 'major' | 'dominant';
  peerRespect: number; // How other studios view this studio (0-100)
  culturalImpact: number; // Influence on culture/society (0-100)
  
  // Momentum factors
  currentMomentum: number; // Recent trajectory (-50 to +50)
  buzzCycle: 'dormant' | 'building' | 'peak' | 'declining' | 'scandal';
  lastMajorHit: number; // Weeks since last major success
  lastMajorFlop: number; // Weeks since last major failure
  
  // Activity patterns
  developmentCadence: number; // How regularly studio develops projects
  genreConsistency: number; // How focused studio is on specific genres
  budgetDiscipline: number; // How well studio manages money
  talentLoyalty: number; // How often talent returns to work with studio
}

export interface ReputationModifiers {
  industryBonus: number; // Bonus from industry context
  seasonalAdjustment: number; // Time-of-year effects
  competitorComparison: number; // Relative to other studios
  talentEndorsement: number; // Boost from working with respected talent
  projectPortfolio: number; // Diversity and quality of project slate
}

export class DeepReputationSystem {
  private static industryContext: IndustryContext = {
    marketSentiment: 'stable',
    dominantStudios: [],
    emergingTrends: [],
    scandals: [],
    majorReleases: [],
    seasonalFactor: 1.0
  };
  
  private static studioFactors = new Map<string, ReputationFactors>();
  private static reputationHistory = new Map<string, Array<{ week: number; year: number; value: number; factors: ReputationFactors }>>();
  
  static calculateDeepReputation(
    studio: Studio, 
    projects: Project[], 
    talent: TalentPerson[], 
    timeState: TimeState,
    allStudios: Studio[]
  ): { reputation: number; factors: ReputationFactors; modifiers: ReputationModifiers } {
    
    // Get or initialize studio factors
    let factors = this.studioFactors.get(studio.id) || this.initializeStudioFactors(studio);
    
    // Update factors based on current state
    factors = this.updateFactorsFromGameState(factors, studio, projects, talent, timeState);
    
    // Calculate industry modifiers
    const modifiers = this.calculateModifiers(studio, factors, allStudios, timeState);
    
    // Calculate base reputation from factors
    const baseReputation = this.calculateBaseReputation(factors);
    
    // Apply modifiers
    const finalReputation = Math.max(0, Math.min(100, 
      baseReputation + modifiers.industryBonus + modifiers.seasonalAdjustment + 
      modifiers.competitorComparison + modifiers.talentEndorsement + modifiers.projectPortfolio
    ));
    
    // Store for historical tracking
    this.studioFactors.set(studio.id, factors);
    this.recordReputationHistory(studio.id, timeState, finalReputation, factors);
    
    // Only log reputation changes, not every calculation
    const previousRep = this.getLastReputation(studio.id);
    if (!previousRep || Math.abs(finalReputation - previousRep) > 0.1) {
      console.log(`DEEP REP: ${studio.name} = ${finalReputation.toFixed(1)} (base: ${baseReputation.toFixed(1)}, modifiers: +${(finalReputation - baseReputation).toFixed(1)})`);
    }
    
    return { reputation: finalReputation, factors, modifiers };
  }
  
  private static initializeStudioFactors(studio: Studio): ReputationFactors {
    return {
      trackRecord: 50,
      consistency: 50,
      innovation: 50,
      talentRelations: 50,
      marketPosition: 'unknown',
      peerRespect: studio.reputation || 50,
      culturalImpact: 25,
      currentMomentum: 0,
      buzzCycle: 'dormant',
      lastMajorHit: -1, // -1 means no major hit yet
      lastMajorFlop: -1, // -1 means no major flop yet
      developmentCadence: 50,
      genreConsistency: 50,
      budgetDiscipline: 50,
      talentLoyalty: 50
    };
  }
  
  private static updateFactorsFromGameState(
    factors: ReputationFactors,
    studio: Studio,
    projects: Project[],
    talent: TalentPerson[],
    timeState: TimeState
  ): ReputationFactors {
    const newFactors = { ...factors };
    
    // Track Record: Based on actual project outcomes
    const releasedProjects = projects.filter(p => p.status === 'released');
    if (releasedProjects.length > 0) {
      const successfulProjects = releasedProjects.filter(p => 
        (p.metrics?.boxOfficeTotal || 0) > (p.budget?.total || 0) * 1.5
      );
      newFactors.trackRecord = Math.min(95, Math.max(5, 
        (successfulProjects.length / releasedProjects.length) * 100
      ));
    }
    
    // Consistency: How predictable are the studio's releases
    if (releasedProjects.length >= 3) {
      const revenues = releasedProjects.map(p => p.metrics?.boxOfficeTotal || 0);
      const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
      const variance = revenues.reduce((sum, rev) => sum + Math.pow(rev - avgRevenue, 2), 0) / revenues.length;
      const coefficientOfVariation = Math.sqrt(variance) / avgRevenue;
      newFactors.consistency = Math.max(20, 100 - (coefficientOfVariation * 100));
    }
    
    // Innovation: Based on genre diversity and risk-taking
    const uniqueGenres = new Set(projects.map(p => p.script.genre));
    newFactors.innovation = Math.min(90, 30 + (uniqueGenres.size * 15));
    
    // Budget Discipline: How well does studio manage costs vs. revenue
    const projectsWithFinancials = projects.filter(p => 
      p.budget?.total && p.metrics?.boxOfficeTotal
    );
    if (projectsWithFinancials.length > 0) {
      const avgROI = projectsWithFinancials.reduce((sum, p) => {
        const revenue = p.metrics?.boxOfficeTotal || 0;
        const cost = p.budget?.total || 1;
        return sum + (revenue / cost);
      }, 0) / projectsWithFinancials.length;
      
      newFactors.budgetDiscipline = Math.min(95, Math.max(10, avgROI * 50));
    }
    
    // Development Cadence: Regular activity vs. long gaps (HEAVILY NERFED)
    if (studio.lastProjectWeek && studio.weeksSinceLastProject !== undefined) {
      if (studio.weeksSinceLastProject <= 4) {
        newFactors.developmentCadence = Math.min(95, newFactors.developmentCadence + 0.5); // Reduced from +2
      } else if (studio.weeksSinceLastProject > 24) { // Increased from 12 to 24 weeks
        newFactors.developmentCadence = Math.max(30, newFactors.developmentCadence - 0.5); // Reduced from -3 to -0.5
      }
    }
    
    // Market Position: Based on budget and success
    const avgBudget = projects.length > 0 ? 
      projects.reduce((sum, p) => sum + (p.budget?.total || 0), 0) / projects.length : 0;
    
    if (avgBudget > 100000000 && newFactors.trackRecord > 70) {
      newFactors.marketPosition = 'major';
    } else if (avgBudget > 50000000 && newFactors.trackRecord > 60) {
      newFactors.marketPosition = 'mid-tier';
    } else if (avgBudget > 10000000) {
      newFactors.marketPosition = 'boutique';
    } else {
      newFactors.marketPosition = 'indie';
    }
    
    // Current Momentum: Recent trend
    const recentProjects = projects.filter(p => 
      p.releaseWeek && p.releaseYear && 
      ((timeState.currentYear - p.releaseYear) * 52 + (timeState.currentWeek - p.releaseWeek)) <= 26
    );
    
    if (recentProjects.length > 0) {
      const recentSuccess = recentProjects.filter(p => 
        (p.metrics?.boxOfficeTotal || 0) > (p.budget?.total || 0) * 1.2
      ).length;
      const recentSuccessRate = recentSuccess / recentProjects.length;
      
      if (recentSuccessRate > 0.7) {
        newFactors.currentMomentum = Math.min(50, newFactors.currentMomentum + 2); // Reduced from +5
        newFactors.buzzCycle = 'building';
      } else if (recentSuccessRate < 0.2) { // Made it harder to trigger negative momentum
        newFactors.currentMomentum = Math.max(-30, newFactors.currentMomentum - 1); // Reduced from -5 to -1, capped at -30
        newFactors.buzzCycle = 'declining';
      }
    }
    
    // Talent Relations: Based on talent quality and retention
    const workingTalent = projects.flatMap(p => p.cast.concat(p.crew || []));
    if (workingTalent.length > 0) {
      const avgTalentReputation = workingTalent.reduce((sum, role) => {
        const talentPerson = talent.find(t => t.id === role.talentId);
        return sum + (talentPerson?.reputation || 50);
      }, 0) / workingTalent.length;
      
      newFactors.talentRelations = Math.min(95, Math.max(20, avgTalentReputation));
    }
    
    return newFactors;
  }
  
  private static calculateModifiers(
    studio: Studio,
    factors: ReputationFactors,
    allStudios: Studio[],
    timeState: TimeState
  ): ReputationModifiers {
    // Industry bonus: Benefit from being in a hot market or suffer in cold market
    let industryBonus = 0;
    if (this.industryContext.marketSentiment === 'bullish' && factors.marketPosition !== 'unknown') {
      industryBonus += 3;
    } else if (this.industryContext.marketSentiment === 'bearish') {
      industryBonus -= 2;
    }
    
    // Seasonal adjustments
    let seasonalAdjustment = 0;
    const isAwardsSeason = timeState.currentWeek >= 1 && timeState.currentWeek <= 12;
    const isSummerBlockbuster = timeState.currentWeek >= 20 && timeState.currentWeek <= 35;
    
    if (isAwardsSeason && factors.culturalImpact > 60) {
      seasonalAdjustment += 5; // Prestige studios benefit during awards season
    }
    if (isSummerBlockbuster && factors.marketPosition === 'major') {
      seasonalAdjustment += 3; // Major studios benefit during blockbuster season
    }
    
    // Competitor comparison: Relative standing
    let competitorComparison = 0;
    const studioReputation = studio.reputation || 50;
    const avgCompetitorReputation = allStudios.length > 0 ? 
      allStudios.reduce((sum, s) => sum + (s.reputation || 50), 0) / allStudios.length : 50;
    
    if (studioReputation > avgCompetitorReputation + 10) {
      competitorComparison += 5; // Significantly above average
    } else if (studioReputation < avgCompetitorReputation - 10) {
      competitorComparison -= 3; // Significantly below average
    }
    
    // Talent endorsement: Working with respected talent
    let talentEndorsement = 0;
    if (factors.talentRelations > 80) {
      talentEndorsement += Math.min(8, (factors.talentRelations - 80) / 2.5);
    }
    
    // Project portfolio: Diversity and ambition
    let projectPortfolio = 0;
    if (factors.innovation > 70 && factors.budgetDiscipline > 60) {
      projectPortfolio += 4; // Innovative but financially responsible
    }
    if (factors.genreConsistency > 80) {
      projectPortfolio += 2; // Focused expertise
    }
    
    return {
      industryBonus,
      seasonalAdjustment,
      competitorComparison,
      talentEndorsement,
      projectPortfolio
    };
  }
  
  private static calculateBaseReputation(factors: ReputationFactors): number {
    // Weighted combination of factors
    const weights = {
      trackRecord: 0.25,
      consistency: 0.15,
      talentRelations: 0.15,
      innovation: 0.10,
      budgetDiscipline: 0.10,
      developmentCadence: 0.10,
      peerRespect: 0.10,
      culturalImpact: 0.05
    };
    
    let baseRep = 0;
    baseRep += factors.trackRecord * weights.trackRecord;
    baseRep += factors.consistency * weights.consistency;
    baseRep += factors.talentRelations * weights.talentRelations;
    baseRep += factors.innovation * weights.innovation;
    baseRep += factors.budgetDiscipline * weights.budgetDiscipline;
    baseRep += factors.developmentCadence * weights.developmentCadence;
    baseRep += factors.peerRespect * weights.peerRespect;
    baseRep += factors.culturalImpact * weights.culturalImpact;
    
    // Apply momentum
    baseRep += factors.currentMomentum * 0.3;
    
    // Market position bonus
    const positionBonus = {
      'unknown': 0,
      'indie': 5,
      'boutique': 10,
      'mid-tier': 15,
      'major': 20,
      'dominant': 25
    };
    baseRep += positionBonus[factors.marketPosition];
    
    return Math.max(5, Math.min(95, baseRep));
  }
  
  private static recordReputationHistory(
    studioId: string,
    timeState: TimeState,
    reputation: number,
    factors: ReputationFactors
  ): void {
    if (!this.reputationHistory.has(studioId)) {
      this.reputationHistory.set(studioId, []);
    }
    
    const history = this.reputationHistory.get(studioId)!;
    history.push({
      week: timeState.currentWeek,
      year: timeState.currentYear,
      value: reputation,
      factors: { ...factors }
    });
    
    // Keep last 52 weeks of history
    if (history.length > 52) {
      history.splice(0, history.length - 52);
    }
  }
  
  static updateIndustryContext(allStudios: Studio[], timeState: TimeState): void {
    // Update dominant studios
    const sortedStudios = [...allStudios].sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
    this.industryContext.dominantStudios = sortedStudios.slice(0, 3).map(s => s.name);
    
    // Update market sentiment based on overall industry performance
    const avgReputation = allStudios.reduce((sum, s) => sum + (s.reputation || 50), 0) / allStudios.length;
    
    if (avgReputation > 70) {
      this.industryContext.marketSentiment = 'bullish';
    } else if (avgReputation < 45) {
      this.industryContext.marketSentiment = 'bearish';
    } else {
      this.industryContext.marketSentiment = 'stable';
    }
    
    // Seasonal factors
    if (timeState.currentWeek >= 47 || timeState.currentWeek <= 2) {
      this.industryContext.seasonalFactor = 1.15; // Holiday boost
    } else if (timeState.currentWeek >= 20 && timeState.currentWeek <= 35) {
      this.industryContext.seasonalFactor = 1.10; // Summer boost
    } else {
      this.industryContext.seasonalFactor = 1.0;
    }
  }
  
  static getIndustryInsights(studio: Studio): {
    marketPosition: string;
    competitiveAdvantages: string[];
    threats: string[];
    opportunities: string[];
    recommendations: string[];
  } {
    const factors = this.studioFactors.get(studio.id);
    if (!factors) {
      return {
        marketPosition: 'Unknown',
        competitiveAdvantages: [],
        threats: [],
        opportunities: [],
        recommendations: ['Establish market presence through active development']
      };
    }
    
    const advantages: string[] = [];
    const threats: string[] = [];
    const opportunities: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze strengths
    if (factors.trackRecord > 75) advantages.push('Strong track record of successes');
    if (factors.consistency > 75) advantages.push('Reliable and predictable performance');
    if (factors.innovation > 75) advantages.push('Reputation for creative innovation');
    if (factors.talentRelations > 75) advantages.push('Strong relationships with talent');
    
    // Identify threats
    if (factors.currentMomentum < -20) threats.push('Declining industry momentum');
    if (factors.lastMajorHit > 52) threats.push('No major hits in over a year');
    if (factors.budgetDiscipline < 40) threats.push('Poor financial management reputation');
    if (this.industryContext.marketSentiment === 'bearish') threats.push('Overall market downturn');
    
    // Find opportunities
    if (factors.innovation > 60 && this.industryContext.emergingTrends.length > 0) {
      opportunities.push('Well-positioned for emerging trends');
    }
    if (factors.marketPosition === 'indie' && factors.trackRecord > 70) {
      opportunities.push('Ready for expansion to mid-tier projects');
    }
    if (this.industryContext.seasonalFactor > 1.05) {
      opportunities.push('Favorable seasonal conditions');
    }
    
    // Generate recommendations
    if (factors.developmentCadence < 50) {
      recommendations.push('Increase development activity to maintain industry presence');
    }
    if (factors.consistency < 50) {
      recommendations.push('Focus on reliable, proven concepts to build consistency');
    }
    if (factors.talentRelations < 60) {
      recommendations.push('Invest in talent relationships and competitive compensation');
    }
    if (factors.innovation < 40) {
      recommendations.push('Take calculated creative risks to build innovation reputation');
    }
    
    return {
      marketPosition: factors.marketPosition,
      competitiveAdvantages: advantages,
      threats,
      opportunities,
      recommendations
    };
  }
  
  private static getLastReputation(studioId: string): number | null {
    const history = this.reputationHistory.get(studioId);
    if (!history || history.length === 0) {
      return null;
    }
    return history[history.length - 1].value;
  }

  static getReputationTrend(studioId: string): {
    trend: 'rising' | 'falling' | 'stable';
    changePercent: number;
    recentHigh: number;
    recentLow: number;
  } {
    const history = this.reputationHistory.get(studioId) || [];
    
    if (history.length < 4) {
      return { trend: 'stable', changePercent: 0, recentHigh: 50, recentLow: 50 };
    }
    
    const recent = history.slice(-4);
    const oldest = recent[0].value;
    const newest = recent[recent.length - 1].value;
    const changePercent = ((newest - oldest) / oldest) * 100;
    
    const recentValues = recent.map(h => h.value);
    const recentHigh = Math.max(...recentValues);
    const recentLow = Math.min(...recentValues);
    
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (changePercent > 5) trend = 'rising';
    else if (changePercent < -5) trend = 'falling';
    
    return { trend, changePercent, recentHigh, recentLow };
  }
}
