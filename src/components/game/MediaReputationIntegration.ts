import { TalentPerson, Studio, Project, GameState, MediaItem, MediaMemory } from '@/types/game';
import { MediaEngine } from './MediaEngine';

export class MediaReputationIntegration {
  // Calculate how media coverage affects talent morale and loyalty
  static updateTalentFromMedia(talent: TalentPerson, studioId: string): void {
    const mediaMemory = MediaEngine.getMediaMemory(talent.id);
    if (!mediaMemory) return;

    const recentSentiment = this.calculateRecentSentiment(mediaMemory);
    const buzzLevel = mediaMemory.currentBuzz;

    // Update talent morale based on recent media coverage
    const moraleEffect = this.calculateMoraleEffect(recentSentiment, buzzLevel);
    this.applyMoraleChange(talent, moraleEffect);

    // Update studio loyalty based on how studio handled media about this talent
    const loyaltyEffect = this.calculateLoyaltyEffect(talent, studioId, mediaMemory);
    this.applyLoyaltyChange(talent, studioId, loyaltyEffect);

    // Update market value based on media perception
    const marketValueEffect = this.calculateMarketValueEffect(recentSentiment, buzzLevel, talent.reputation);
    this.applyMarketValueChange(talent, marketValueEffect);

    // Update burnout from media pressure
    const burnoutEffect = this.calculateBurnoutFromMedia(buzzLevel, recentSentiment);
    this.applyBurnoutChange(talent, burnoutEffect);
  }

  // Calculate casting difficulty based on media coverage
  static getCastingDifficulty(talent: TalentPerson, studioId: string): {
    difficulty: number;
    factors: string[];
    costMultiplier: number;
  } {
    const basedifficulty = 50;
    const factors: string[] = [];
    let difficulty = basedifficulty;
    let costMultiplier = 1.0;

    const mediaMemory = MediaEngine.getMediaMemory(talent.id);
    const studioMemory = MediaEngine.getMediaMemory(studioId);

    // Recent negative media makes talent harder to cast
    if (mediaMemory) {
      const recentSentiment = this.calculateRecentSentiment(mediaMemory);
      if (recentSentiment < -20) {
        difficulty += 30;
        costMultiplier += 0.5;
        factors.push('Recent negative media coverage');
      } else if (recentSentiment > 20) {
        difficulty -= 10;
        factors.push('Positive media buzz');
      }

      // High buzz increases demand and cost
      if (mediaMemory.currentBuzz > 70) {
        difficulty += 20;
        costMultiplier += 0.3;
        factors.push('High media attention');
      }

      // Recent scandals make talent riskier
      if (mediaMemory.lastMajorStory?.type === 'scandal' && 
          mediaMemory.lastMajorStory?.sentiment === 'negative') {
        difficulty += 40;
        costMultiplier += 0.7;
        factors.push('Recent scandal');
      }
    }

    // Studio's media reputation affects talent willingness
    if (studioMemory) {
      const studioSentiment = this.calculateRecentSentiment(studioMemory);
      if (studioSentiment < -30) {
        difficulty += 25;
        costMultiplier += 0.4;
        factors.push('Studio has poor media reputation');
      } else if (studioSentiment > 30) {
        difficulty -= 15;
        factors.push('Studio has strong media reputation');
      }
    }

    // Talent loyalty to studio affects difficulty
    const loyalty = talent.studioLoyalty?.[studioId] || 50;
    if (loyalty < 30) {
      difficulty += 20;
      factors.push('Low loyalty to studio');
    } else if (loyalty > 70) {
      difficulty -= 20;
      factors.push('High loyalty to studio');
    }

    // Talent's current morale affects willingness to work
    if (talent.burnoutLevel && talent.burnoutLevel > 70) {
      difficulty += 30;
      costMultiplier += 0.3;
      factors.push('High burnout level');
    }

    return {
      difficulty: Math.max(0, Math.min(100, difficulty)),
      factors,
      costMultiplier: Math.max(0.5, costMultiplier)
    };
  }

  // Calculate how media affects studio reputation with different audiences
  static calculateStudioReputationEffects(studio: Studio): {
    industryReputation: number;
    publicReputation: number;
    investorConfidence: number;
    mediaRelations: number;
  } {
    const studioMemory = MediaEngine.getMediaMemory(studio.id);
    
    if (!studioMemory) {
      return {
        industryReputation: studio.reputation,
        publicReputation: studio.reputation,
        investorConfidence: studio.reputation,
        mediaRelations: 50
      };
    }

    const recentSentiment = this.calculateRecentSentiment(studioMemory);
    const mediaVolume = studioMemory.sentimentHistory.length;

    // Different audiences care about different things
    const industryReputation = studio.reputation + (recentSentiment * 0.5); // Industry cares about consistent performance
    const publicReputation = studio.reputation + (recentSentiment * 0.8); // Public responds more to recent news
    const investorConfidence = studio.reputation + (recentSentiment * 0.3) + (mediaVolume * 2); // Investors want visibility
    const mediaRelations = 50 + (recentSentiment * 0.6) + (mediaVolume * 1.5); // Media likes active studios

    return {
      industryReputation: Math.max(0, Math.min(100, industryReputation)),
      publicReputation: Math.max(0, Math.min(100, publicReputation)),
      investorConfidence: Math.max(0, Math.min(100, investorConfidence)),
      mediaRelations: Math.max(0, Math.min(100, mediaRelations))
    };
  }

  // Helper methods
  private static calculateRecentSentiment(memory: MediaMemory): number {
    if (memory.sentimentHistory.length === 0) return 0;

    // Weight recent sentiment more heavily
    let totalWeight = 0;
    let weightedSentiment = 0;

    memory.sentimentHistory.forEach((entry, index) => {
      const weight = Math.pow(0.9, memory.sentimentHistory.length - index - 1); // Recent entries have higher weight
      const sentimentValue = entry.sentiment === 'positive' ? entry.intensity : 
                           entry.sentiment === 'negative' ? -entry.intensity : 0;
      
      weightedSentiment += sentimentValue * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  }

  private static calculateMoraleEffect(recentSentiment: number, buzzLevel: number): number {
    // Positive media boosts morale, negative media hurts it
    let moraleChange = recentSentiment * 0.3;
    
    // High buzz can be stressful even if positive
    if (buzzLevel > 80) {
      moraleChange -= 10;
    }
    
    return moraleChange;
  }

  private static calculateLoyaltyEffect(talent: TalentPerson, studioId: string, memory: MediaMemory): number {
    // If studio defended talent in media, loyalty increases
    // If studio threw talent under the bus, loyalty decreases
    
    // For now, simplified: positive media about talent while working with studio = loyalty boost
    const recentSentiment = this.calculateRecentSentiment(memory);
    return recentSentiment * 0.2;
  }

  private static calculateMarketValueEffect(recentSentiment: number, buzzLevel: number, currentRep: number): number {
    // Media coverage affects perceived market value
    let valueChange = 0;
    
    // Positive media increases value
    if (recentSentiment > 0) {
      valueChange = recentSentiment * 0.02; // 2% per sentiment point
    } else {
      valueChange = recentSentiment * 0.03; // Negative media hurts more
    }
    
    // High buzz increases value regardless of sentiment (controversy sells)
    if (buzzLevel > 60) {
      valueChange += 0.05;
    }
    
    // Cap changes based on current reputation (harder to move established stars)
    const reputationCap = Math.max(0.5, (100 - currentRep) / 100);
    return valueChange * reputationCap;
  }

  private static calculateBurnoutFromMedia(buzzLevel: number, recentSentiment: number): number {
    // High media attention increases burnout
    let burnoutIncrease = buzzLevel * 0.1;
    
    // Negative media is more stressful
    if (recentSentiment < -20) {
      burnoutIncrease += Math.abs(recentSentiment) * 0.15;
    }
    
    return burnoutIncrease;
  }

  private static applyMoraleChange(talent: TalentPerson, change: number): void {
    // Morale affects various talent attributes
    if (change > 0) {
      // Positive morale reduces burnout slightly
      if (talent.burnoutLevel) {
        talent.burnoutLevel = Math.max(0, talent.burnoutLevel - change * 0.2);
      }
    } else {
      // Negative morale increases burnout
      if (talent.burnoutLevel !== undefined) {
        talent.burnoutLevel = Math.min(100, talent.burnoutLevel + Math.abs(change) * 0.3);
      }
    }
  }

  private static applyLoyaltyChange(talent: TalentPerson, studioId: string, change: number): void {
    if (!talent.studioLoyalty) {
      talent.studioLoyalty = {};
    }
    
    const currentLoyalty = talent.studioLoyalty[studioId] || 50;
    talent.studioLoyalty[studioId] = Math.max(0, Math.min(100, currentLoyalty + change));
  }

  private static applyMarketValueChange(talent: TalentPerson, percentChange: number): void {
    const change = talent.marketValue * percentChange;
    talent.marketValue = Math.max(100000, talent.marketValue + change); // Minimum $100K value
  }

  private static applyBurnoutChange(talent: TalentPerson, increase: number): void {
    if (talent.burnoutLevel !== undefined) {
      talent.burnoutLevel = Math.max(0, Math.min(100, talent.burnoutLevel + increase));
    }
  }

  // Public API for getting reputation insights
  static getTalentMediaProfile(talent: TalentPerson): {
    recentSentiment: number;
    buzzLevel: number;
    majorStories: number;
    riskLevel: 'low' | 'medium' | 'high';
    marketTrend: 'rising' | 'stable' | 'falling';
  } {
    const memory = MediaEngine.getMediaMemory(talent.id);
    
    if (!memory) {
      return {
        recentSentiment: 0,
        buzzLevel: 0,
        majorStories: 0,
        riskLevel: 'low',
        marketTrend: 'stable'
      };
    }

    const recentSentiment = this.calculateRecentSentiment(memory);
    const buzzLevel = memory.currentBuzz;
    const majorStories = memory.majorStories.length;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (recentSentiment < -30 || buzzLevel > 80) {
      riskLevel = 'high';
    } else if (recentSentiment < -10 || buzzLevel > 50) {
      riskLevel = 'medium';
    }

    // Determine market trend
    let marketTrend: 'rising' | 'stable' | 'falling' = 'stable';
    if (recentSentiment > 20) {
      marketTrend = 'rising';
    } else if (recentSentiment < -20) {
      marketTrend = 'falling';
    }

    return {
      recentSentiment: Math.round(recentSentiment),
      buzzLevel: Math.round(buzzLevel),
      majorStories,
      riskLevel,
      marketTrend
    };
  }

  // Process weekly reputation updates for all entities
  static processWeeklyReputationUpdates(gameState: GameState): void {
    // Update all talent based on their media coverage
    gameState.talent.forEach(talent => {
      this.updateTalentFromMedia(talent, gameState.studio.id);
    });

    // Update studio reputation based on media coverage
    const studioEffects = this.calculateStudioReputationEffects(gameState.studio);
    
    // Apply gradual reputation changes (capped at 2 points per week)
    const reputationChange = Math.max(-2, Math.min(2, 
      (studioEffects.publicReputation - gameState.studio.reputation) * 0.1
    ));
    
    gameState.studio.reputation = Math.max(0, Math.min(100, 
      gameState.studio.reputation + reputationChange
    ));

    console.log(`📊 Weekly reputation update: Studio reputation ${reputationChange >= 0 ? '+' : ''}${reputationChange.toFixed(1)}`);
  }
}