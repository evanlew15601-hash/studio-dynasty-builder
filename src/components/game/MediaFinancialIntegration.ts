import { Project, GameState, MediaItem, MediaMemory } from '@/types/game';
import { getProjectAssignedTalentIds } from '
export class MediaFinancialIntegration {
  // Calculate how media coveexport class MediaFinancialIntegrati  sta  // Calculate how media coverage affects box office performance
  static calculateMediaBoxOfficeMultipli    factors: string[];
    breakdown: {
      baseMultiplier: number;
      mediaBonus: number;
      castBonus: number;
      studioBonus: number;
      finalMultiplier: number;
    };
  } {
    let multiplier = 1.0;
    const factors: string[] = [];
    
    const baseMultiplier = 1.0;
    let mediaBonus = 0;
    let castBonus = 0;
    let studioBonus = 0;

    // Project-specific media coverage
    const projectMemory = Media    // Project-specific media cover        const projectMemo      const projectSentiment = this.calculate    if (projectMemory) {
      const projectSentiment = this.calculateRecentSentiment      
      // Positive media coverage boosts box office
      if (projectSentiment > 0) {
        const sentimentBonus = (projectSentiment / 100) * 0.4; // Up to 40% bonus
        mediaBonus += sentimentBonus;
        factors.push(`Positive media coverage (+${(sentimentBonus * 100).toFixed(1)}%)`);
      } else if (projectSentiment < 0) {
        const sentimentPenalty = (projectSentiment / 100) * 0.3; // Up to 30% penalty
        mediaBonus += sentimentPenalty;
        factors.push(`Negative media coverage (${(sentimentPenalty * 100).toFixed(1)}%)`);
      }
      
      // High buzz drives interest regardless of sentiment
      if (projectBuzz > 50) {
        const buzzBonus = ((projectBuzz - 50) / 50) * 0.2; // Up to 20% bonus
        mediaBonus += buzzBonus;
        factors.push(`High media buzz (+${(buzzBonus * 100).toFixed(1)}%)`);
      }
    }

    // Cast media coverage affects box office (respect role exclusion + script.characters source of truth)
    {
      let totalCastSentiment = 0;
      let castMembersWithMedia = 0;

      const castTalentIds = getProjectAssignedTalentIds(project);

      castTalentIds.forEach(talentId => {
        const talent = gameState.talent.find(t => t.id === talentId);
        if (!talent) return;

        const talentMemory = MediaEngine.getMediaMemory(talent.id);
        if (!talentMemory) return;

        const talentSentiment = this.calculateRecentSentiment(talentMemory);
        totalCastSentiment += talentSentiment;
        castMembersWithMedia++;

        // Major scandals hurt more than positive buzz helps
        if (talentMemory.lastMajorStory?.type === 'scandal' && talentMemory.lastMajorStory?.sentiment === 'negative') {
          const scandalPenalty = -0.15;
          castBonus += scandalPenalty;
          factors.push(`${talent.name} scandal (${(scandalPenalty * 100).toFixed(1)}%)`);
        }
      });
      
      if (castMembersWithMedia > 0) {
        const avgCastSentiment = totalCastSentiment / castMembersWithMedia;
        const castMediaEffect = (avgCastSentiment / 100) * 0.25; // Up to 25% effect
        castBonus += castMediaEffect;
        
        if (Math.abs(castMediaEffect) > 0.01) {
          factors.push(`Cast media coverage (${castMediaEffect >= 0 ? '+' : ''}${(castMediaEffect * 100).toFixed(1)}%)`);
        }
      }
    }

    // Studio reputation affects box office
    const studioMemory = MediaEngine.getMediaMemory(gameState.studio.id);
    if (studioMemory) {
      const studioSentiment = this.calculateRecentSentiment(studioMemory);
      const studioEffect = (studioSentiment / 100) * 0.15; // Up to 15% effect
      studioBonus = studioEffect;
      
      if (Math.abs(studioEffect) > 0.01) {
        factors.push(`Studio reputation (${studioEffect >= 0 ? '+' : ''}${(studioEffect * 100).toFixed(1)}%)`);
      }
    }

    const finalMultiplier = Math.max(0.3, baseMultiplier + mediaBonus + castBonus + studioBonus);

    return {
      multiplier: finalMultiplier,
      factors,
      breakdown: {
        baseMultiplier,
        mediaBonus,
        castBonus,
        studioBonus,
        finalMultiplier
      }
    };
  }

  // Calculate streaming performance based on media coverage
  static calculateStreamingMultiplier(project: Project, gameState: GameState): number {
    // Streaming is less affected by immediate media buzz, more by sustained interest
    let multiplier = 1.0;
    
    const projectMemory = MediaEngine.getMediaMemory(project.id);
    if (projectMemory) {
      // Sustained media coverage over time helps streaming
      const mediaVolume = projectMemory.sentimentHistory.length;
      const volumeBonus = Math.min(0.3, mediaVolume * 0.02); // Up to 30% bonus
      multiplier += volumeBonus;
      
      // Controversy can actually help streaming numbers
      const recentSentiment = this.calculateRecentSentiment(projectMemory);
      if (Math.abs(recentSentiment) > 30) { // Strong sentiment either way
        multiplier += 0.1; // 10% curiosity bonus
      }
    }
    
    return Math.max(0.5, multiplier);
  }

  // Calculate how media affects marketing campaign effectiveness
  static calculateMarketingEffectiveness(
    project: Project,
    campaignBudget: number,
    gameState: GameState
  ): {
    effectiveness: number;
    factors: string[];
    recommendedBudget: number;
  } {
    let effectiveness = 1.0;
    const factors: string[] = [];
    
    // Current media buzz affects marketing efficiency
    const projectMemory = MediaEngine.getMediaMemory(project.id);
    if (projectMemory) {
      const buzz = projectMemory.currentBuzz;
      
      if (buzz > 70) {
        // High buzz means marketing works better
        effectiveness += 0.3;
        factors.push('High media buzz amplifies marketing');
      } else if (buzz < 20) {
        // Low buzz means need more marketing to break through
        effectiveness -= 0.2;
        factors.push('Low media attention requires stronger marketing');
      }
      
      // Recent negative media hurts marketing effectiveness
      const sentiment = this.calculateRecentSentiment(projectMemory);
      if (sentiment < -30) {
        effectiveness -= 0.25;
        factors.push('Negative media coverage reduces marketing impact');
      }
    }
    
    // Studio media relations affect marketing reach
    const studioMemory = MediaEngine.getMediaMemory(gameState.studio.id);
    if (studioMemory) {
      const studioSentiment = this.calculateRecentSentiment(studioMemory);
      if (studioSentiment > 20) {
        effectiveness += 0.15;
        factors.push('Good studio-media relations improve reach');
      } else if (studioSentiment < -20) {
        effectiveness -= 0.15;
        factors.push('Poor studio-media relations limit reach');
      }
    }
    
    // Calculate recommended budget based on media situation
    let recommendedBudget = campaignBudget;
    if (projectMemory) {
      const buzz = projectMemory.currentBuzz;
      if (buzz < 30) {
        recommendedBudget = campaignBudget * 1.5; // Need more marketing when unknown
      } else if (buzz > 70) {
        recommendedBudget = campaignBudget * 0.8; // Can spend less when already buzzing
      }
    }
    
    return {
      effectiveness: Math.max(0.3, effectiveness),
      factors,
      recommendedBudget: Math.round(recommendedBudget)
    };
  }

  // Calculate investor interest based on media coverage
  static calculateInvestorInterest(gameState: GameState): {
    interestLevel: number;
    factors: string[];
    fundingMultiplier: number;
  } {
    let interest = 50; // Base interest level
    const factors: string[] = [];
    
    const studioMemory = MediaEngine.getMediaMemory(gameState.studio.id);
    if (studioMemory) {
      const studioSentiment = this.calculateRecentSentiment(studioMemory);
      const mediaVolume = studioMemory.sentimentHistory.length;
      
      // Positive media coverage increases investor interest
      if (studioSentiment > 20) {
        interest += 20;
        factors.push('Positive media coverage attracts investors');
      } else if (studioSentiment < -20) {
        interest -= 25;
        factors.push('Negative media coverage concerns investors');
      }
      
      // Media visibility (good or bad) shows activity
      if (mediaVolume > 10) {
        interest += 10;
        factors.push('High media visibility shows active studio');
      } else if (mediaVolume < 3) {
        interest -= 10;
        factors.push('Low media presence suggests inactivity');
      }
      
      // Recent major stories have strong impact
      if (studioMemory.lastMajorStory) {
        if (studioMemory.lastMajorStory.sentiment === 'positive') {
          interest += 15;
          factors.push('Recent major positive story boosts confidence');
        } else if (studioMemory.lastMajorStory.sentiment === 'negative') {
          interest -= 20;
          factors.push('Recent major negative story hurts confidence');
        }
      }
    }
    
    // Current studio financial health
    if (gameState.studio.budget < 1000000) {
      interest -= 30;
      factors.push('Low studio budget concerns investors');
    } else if (gameState.studio.budget > 50000000) {
      interest += 15;
      factors.push('Strong studio budget attracts investors');
    }
    
    const finalInterest = Math.max(0, Math.min(100, interest));
    const fundingMultiplier = 0.5 + (finalInterest / 100); // 0.5x to 1.5x funding
    
    return {
      interestLevel: finalInterest,
      factors,
      fundingMultiplier
    };
  }

  // Helper method
  private static calculateRecentSentiment(memory: MediaMemory): number {
    if (memory.sentimentHistory.length === 0) return 0;

    let totalWeight = 0;
    let weightedSentiment = 0;

    memory.sentimentHistory.forEach((entry, index) => {
      const weight = Math.pow(0.9, memory.sentimentHistory.length - index - 1);
      const sentimentValue = entry.sentiment === 'positive' ? entry.intensity : 
                           entry.sentiment === 'negative' ? -entry.intensity : 0;
      
      weightedSentiment += sentimentValue * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  }

  // Apply financial effects to game state
  static applyFinancialEffects(gameState: GameState): void {
    // Update project financial projections based on media
    gameState.projects.forEach(project => {
      if (project.status === 'marketing' || project.status === 'release') {
        const mediaEffect = this.calculateMediaBoxOfficeMultiplier(project, gameState);
        console.log(`📊 Media multiplier for ${project.script?.title}: ${mediaEffect.multiplier.toFixed(2)}x`);
      }
    });
    
    console.log('💰 Applied media financial effects to all projects');
  }
}lied media financial effects to all projects');
  }
}