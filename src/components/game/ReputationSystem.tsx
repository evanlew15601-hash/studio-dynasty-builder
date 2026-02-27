// Enhanced Reputation System - Addresses punitive decay and adds milestone rewards
import { Project, Studio, GameState } from '../../types/game';
import { getProjectCastingSummary } from '@/utils/projectCasting';
import { TimeState } from './TimeSystem';

export interface ReputationState {
  coreReputation: number; // Long-term, stable reputation (0-100)
  buzz: number; // Short-term excitement/notoriety (-50 to +50)
  prestige: number; // Awards and critical acclaim factor (0-100)
  reliability: number; // Track record of delivering projects (0-100)
  innovation: number; // Willingness to take creative risks (0-100)
}

export interface ReputationEvent {
  type: 'milestone' | 'release' | 'scandal' | 'award' | 'development' | 'decay';
  impact: Partial<ReputationState>;
  description: string;
  week: number;
  year: number;
}

export interface StudioTrait {
  id: string;
  name: string;
  description: string;
  type: 'prestige' | 'commercial' | 'indie' | 'blockbuster' | 'auteur';
  effects: {
    reputationDecayRate?: number; // Multiplier for decay (1.0 = normal, 0.5 = half decay)
    buzzMultiplier?: number; // Multiplier for buzz events
    prestigeBonus?: number; // Flat bonus to prestige
    genreAffinities?: string[]; // Genres this studio excels at
    riskTolerance?: number; // How much the studio benefits from risky projects
  };
}

export class ReputationSystem {
  private static reputationHistory: ReputationEvent[] = [];
  
  static getStudioTraits(studio: Studio): StudioTrait[] {
    const traits: StudioTrait[] = [];
    
    // Determine traits based on studio history and specialties
    if (studio.prestige && studio.prestige > 75) {
      traits.push({
        id: 'prestige-house',
        name: 'Prestige House',
        description: 'Known for high-quality, award-winning films',
        type: 'prestige',
        effects: {
          reputationDecayRate: 0.6, // 40% less decay
          prestigeBonus: 10,
          genreAffinities: ['drama', 'biography', 'historical']
        }
      });
    }
    
    if (studio.reputation > 80 && studio.budget > 100000000) {
      traits.push({
        id: 'major-studio',
        name: 'Major Studio',
        description: 'Established powerhouse with significant resources',
        type: 'blockbuster',
        effects: {
          reputationDecayRate: 0.7, // 30% less decay
          buzzMultiplier: 1.3,
          genreAffinities: ['action', 'adventure', 'sci-fi']
        }
      });
    }
    
    return traits;
  }
  
  static calculateReputationDecay(
    currentReputation: ReputationState, 
    studio: Studio, 
    activeProjects: Project[],
    weeksSinceLastProject: number
  ): ReputationState {
    const traits = this.getStudioTraits(studio);
    let decayRate = 0.5; // FIXED: Much slower base decay rate
    
    // Apply trait modifiers
    traits.forEach(trait => {
      if (trait.effects.reputationDecayRate) {
        decayRate *= trait.effects.reputationDecayRate;
      }
    });
    
    // NO DECAY during active periods
    const activeProjectsInDevelopment = activeProjects.filter(p => 
      p.status === 'development' || p.status === 'pre-production' || p.status === 'production' || p.status === 'post-production'
    );
    
    const releasedRecently = activeProjects.some(p => 
      p.status === 'released' && p.metrics?.inTheaters
    );
    
    // No decay while actively working or in theaters
    if (activeProjectsInDevelopment.length > 0 || releasedRecently) {
      console.log(`REPUTATION: No decay - active work or recent release`);
      return currentReputation; // NO DECAY AT ALL
    }
    
    // Minimal decay for inactivity (capped)
    const inactivityMultiplier = Math.min(1.5, 1.0 + (weeksSinceLastProject * 0.02)); // Much smaller multiplier
    decayRate *= inactivityMultiplier;
    
    // Apply very gentle decay
    const buzzDecay = Math.max(-1, Math.min(1, currentReputation.buzz * 0.05 * decayRate));
    const reputationDecay = Math.min(0.3, 0.1 * decayRate); // Maximum 0.3 per week
    
    const newReputation = {
      coreReputation: Math.max(20, currentReputation.coreReputation - reputationDecay), // Never below 20
      buzz: Math.max(-50, Math.min(50, currentReputation.buzz - buzzDecay)),
      prestige: Math.max(0, currentReputation.prestige - (0.05 * decayRate)), // Very slow prestige decay
      reliability: Math.max(0, currentReputation.reliability - (0.1 * decayRate)),
      innovation: currentReputation.innovation // Innovation doesn't decay
    };
    
    console.log(`REPUTATION DECAY: ${currentReputation.coreReputation.toFixed(1)} -> ${newReputation.coreReputation.toFixed(1)} (rate: ${decayRate.toFixed(2)})`);
    return newReputation;
  }
  
  static processProjectMilestone(
    project: Project, 
    milestone: 'script_complete' | 'cast_attached' | 'production_start' | 'production_wrap' | 'post_complete',
    currentReputation: ReputationState,
    currentWeek: number,
    currentYear: number
  ): { reputation: ReputationState; event: ReputationEvent } {
    let impact: Partial<ReputationState> = {};
    let description = '';
    
    switch (milestone) {
      case 'script_complete':
        impact = { buzz: 2, reliability: 1 };
        description = `Completed script for "${project.title}"`;
        break;
      case 'cast_attached': {
        const casting = getProjectCastingSummary(project);
        const activeTalentIds = casting.assignedTalentIds;

        const relevantContracts = [...(project.cast || []), ...(project.crew || [])].filter(r =>
          r?.talentId && activeTalentIds.has(r.talentId)
        );

        const castQuality = relevantContracts.reduce(
          (sum, role) => sum + ((role.salary || 0) / 1_000_000),
          0
        );

        impact = {
          buzz: Math.min(8, castQuality * 2),
          coreReputation: castQuality > 10 ? 2 : 1
        };
        description = `Assembled cast for "${project.title}"`;
        break;
      }
      case 'production_start':
        impact = { reliability: 2, innovation: 1 };
        description = `Started production on "${project.title}"`;
        break;
      case 'production_wrap':
        impact = { reliability: 3, coreReputation: 1, buzz: 3 };
        description = `Wrapped production on "${project.title}"`;
        break;
      case 'post_complete':
        impact = { reliability: 2, buzz: 5 };
        description = `Completed post-production on "${project.title}"`;
        break;
    }
    
    const newReputation = {
      coreReputation: Math.min(100, currentReputation.coreReputation + (impact.coreReputation || 0)),
      buzz: Math.max(-50, Math.min(50, currentReputation.buzz + (impact.buzz || 0))),
      prestige: Math.min(100, currentReputation.prestige + (impact.prestige || 0)),
      reliability: Math.min(100, currentReputation.reliability + (impact.reliability || 0)),
      innovation: Math.min(100, currentReputation.innovation + (impact.innovation || 0))
    };
    
    const event: ReputationEvent = {
      type: 'milestone',
      impact,
      description,
      week: currentWeek,
      year: currentYear
    };
    
    this.reputationHistory.push(event);
    console.log(`REPUTATION: ${description} - Buzz: +${impact.buzz || 0}, Reputation: +${impact.coreReputation || 0}`);
    
    return { reputation: newReputation, event };
  }
  
  static processReleaseImpact(
    project: Project,
    boxOfficePerformance: 'flop' | 'modest' | 'hit' | 'blockbuster',
    criticalReception: 'poor' | 'mixed' | 'positive' | 'acclaimed',
    currentReputation: ReputationState,
    currentWeek: number,
    currentYear: number
  ): { reputation: ReputationState; event: ReputationEvent } {
    let impact: Partial<ReputationState> = {};
    
    // Box office impact
    const boxOfficeImpacts = {
      'flop': { coreReputation: -8, buzz: -15, reliability: -5 },
      'modest': { coreReputation: -2, buzz: -3, reliability: 1 },
      'hit': { coreReputation: 5, buzz: 12, reliability: 3 },
      'blockbuster': { coreReputation: 8, buzz: 20, reliability: 5 }
    };
    
    // Critical impact
    const criticalImpacts = {
      'poor': { prestige: -5, innovation: -2, buzz: -8 },
      'mixed': { prestige: -1, buzz: -2 },
      'positive': { prestige: 3, innovation: 2, buzz: 5 },
      'acclaimed': { prestige: 8, innovation: 5, buzz: 10 }
    };
    
    // Combine impacts with defaults for missing properties
    const defaultImpact = { coreReputation: 0, buzz: 0, prestige: 0, reliability: 0, innovation: 0 };
    const boxImpact = { ...defaultImpact, ...boxOfficeImpacts[boxOfficePerformance] };
    const critImpact = { ...defaultImpact, ...criticalImpacts[criticalReception] };
    
    impact = {
      coreReputation: boxImpact.coreReputation + critImpact.coreReputation,
      buzz: boxImpact.buzz + critImpact.buzz,
      prestige: boxImpact.prestige + critImpact.prestige,
      reliability: boxImpact.reliability + critImpact.reliability,
      innovation: boxImpact.innovation + critImpact.innovation
    };
    
    const newReputation = {
      coreReputation: Math.max(0, Math.min(100, currentReputation.coreReputation + (impact.coreReputation || 0))),
      buzz: Math.max(-50, Math.min(50, currentReputation.buzz + (impact.buzz || 0))),
      prestige: Math.max(0, Math.min(100, currentReputation.prestige + (impact.prestige || 0))),
      reliability: Math.max(0, Math.min(100, currentReputation.reliability + (impact.reliability || 0))),
      innovation: Math.max(0, Math.min(100, currentReputation.innovation + (impact.innovation || 0)))
    };
    
    const event: ReputationEvent = {
      type: 'release',
      impact,
      description: `"${project.title}" released - ${boxOfficePerformance} box office, ${criticalReception} reviews`,
      week: currentWeek,
      year: currentYear
    };
    
    this.reputationHistory.push(event);
    console.log(`REPUTATION RELEASE: ${event.description}`);
    
    return { reputation: newReputation, event };
  }
  
  static getReputationSummary(reputation: ReputationState): {
    overall: number;
    description: string;
    strengths: string[];
    weaknesses: string[];
  } {
    const overall = (
      reputation.coreReputation * 0.4 +
      Math.max(0, reputation.buzz + 50) * 0.1 + // Convert buzz to 0-100 scale
      reputation.prestige * 0.2 +
      reputation.reliability * 0.2 +
      reputation.innovation * 0.1
    );
    
    let description = '';
    if (overall >= 80) description = 'Industry Leader';
    else if (overall >= 65) description = 'Well-Regarded Studio';
    else if (overall >= 50) description = 'Established Studio';
    else if (overall >= 35) description = 'Struggling Studio';
    else description = 'Studio in Crisis';
    
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (reputation.prestige > 70) strengths.push('Critically Acclaimed');
    else if (reputation.prestige < 30) weaknesses.push('Lacks Critical Respect');
    
    if (reputation.reliability > 70) strengths.push('Reliable Delivery');
    else if (reputation.reliability < 30) weaknesses.push('Unreliable');
    
    if (reputation.innovation > 70) strengths.push('Creative Innovator');
    else if (reputation.innovation < 30) weaknesses.push('Creatively Stagnant');
    
    if (reputation.buzz > 20) strengths.push('High Industry Buzz');
    else if (reputation.buzz < -20) weaknesses.push('Negative Publicity');
    
    return { overall, description, strengths, weaknesses };
  }
  
  static getRecentEvents(count: number = 5): ReputationEvent[] {
    return this.reputationHistory.slice(-count).reverse();
  }
  
  static convertLegacyReputation(studio: Studio): ReputationState {
    return {
      coreReputation: studio.reputation || 50,
      buzz: 0,
      prestige: studio.prestige || studio.reputation || 50,
      reliability: studio.reputation || 50,
      innovation: 50
    };
  }
}