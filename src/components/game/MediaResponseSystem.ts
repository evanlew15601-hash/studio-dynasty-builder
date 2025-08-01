import { MediaCampaign, MediaReaction, MediaItem, GameState, TalentPerson, Project } from '@/types/game';
import { MediaEngine } from './MediaEngine';

export class MediaResponseSystem {
  private static activeCampaigns: MediaCampaign[] = [];
  private static playerReactions: MediaReaction[] = [];

  // Memory management
  static cleanup(): void {
    this.activeCampaigns = [];
    this.playerReactions = [];
  }

  // Player response actions
  static createPRCampaign(
    studioId: string,
    name: string,
    type: MediaCampaign['type'],
    targets: MediaCampaign['targets'],
    budget: number,
    duration: number,
    gameState: GameState
  ): MediaCampaign {
    const campaign: MediaCampaign = {
      id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studioId,
      name,
      type,
      targets,
      budget,
      duration: {
        startWeek: gameState.currentWeek,
        endWeek: gameState.currentWeek + duration,
        year: gameState.currentYear
      },
      status: 'active',
      effectiveness: this.calculateCampaignEffectiveness(type, budget, targets, gameState),
      generatedMedia: []
    };

    this.activeCampaigns.push(campaign);
    
    // Generate immediate media coverage about the campaign
    this.generateCampaignMedia(campaign, gameState);
    
    console.log(`📢 PR Campaign launched: ${name} (${type}) - Budget: $${budget/1000}K`);
    return campaign;
  }

  static respondToMedia(
    mediaItemId: string,
    action: MediaReaction['action'],
    gameState: GameState,
    customMessage?: string
  ): MediaReaction {
    const mediaItem = MediaEngine.getRecentMedia(100).find(item => item.id === mediaItemId);
    if (!mediaItem) {
      throw new Error('Media item not found');
    }

    const reaction: MediaReaction = {
      mediaItemId,
      reactionType: 'player_response',
      action,
      impact: this.calculateReactionImpact(action, mediaItem, gameState),
      cost: this.calculateReactionCost(action, mediaItem, gameState)
    };

    this.playerReactions.push(reaction);

    // Generate follow-up media based on the response
    this.generateResponseMedia(reaction, mediaItem, gameState, customMessage);

    console.log(`🎯 Player responded to "${mediaItem.headline}" with: ${action}`);
    return reaction;
  }

  // Campaign effectiveness calculation
  private static calculateCampaignEffectiveness(
    type: MediaCampaign['type'],
    budget: number,
    targets: MediaCampaign['targets'],
    gameState: GameState
  ): number {
    let baseEffectiveness = 50;
    
    // Budget impact (more money = more effective, but with diminishing returns)
    const budgetMultiplier = Math.min(2.0, Math.sqrt(budget / 1000000));
    baseEffectiveness *= budgetMultiplier;
    
    // Studio reputation affects campaign effectiveness
    const reputationBonus = (gameState.studio.reputation - 50) * 0.3;
    baseEffectiveness += reputationBonus;
    
    // Campaign type modifiers
    const typeMultipliers = {
      'pr_boost': 1.0,
      'damage_control': 1.2, // More effective when responding to problems
      'product_placement': 0.8,
      'exclusive_access': 1.1,
      'social_media_blitz': 0.9
    };
    
    baseEffectiveness *= typeMultipliers[type];
    
    // Target-specific modifiers
    if (targets.talent && targets.talent.length > 0) {
      const talent = gameState.talent.filter(t => targets.talent!.includes(t.id));
      const avgReputation = talent.reduce((sum, t) => sum + t.reputation, 0) / talent.length;
      baseEffectiveness += (avgReputation - 50) * 0.2; // High-rep talent easier to promote
    }
    
    return Math.max(10, Math.min(95, Math.round(baseEffectiveness)));
  }

  // Generate media coverage about the campaign itself
  private static generateCampaignMedia(campaign: MediaCampaign, gameState: GameState) {
    const eventType = campaign.type === 'damage_control' ? 'rumor' : 'interview';
    const priority = campaign.budget > 5000000 ? 'high' : 'medium';
    
    const eventId = MediaEngine.queueMediaEvent({
      type: eventType as any,
      triggerType: 'player_action',
      priority,
      entities: {
        studios: [campaign.studioId],
        talent: campaign.targets.talent,
        projects: campaign.targets.projects
      },
      eventData: { 
        campaign,
        headline: this.generateCampaignHeadline(campaign),
        campaignType: campaign.type
      },
      week: gameState.currentWeek,
      year: gameState.currentYear
    });

    campaign.generatedMedia.push(eventId);
  }

  private static generateCampaignHeadline(campaign: MediaCampaign): string {
    const headlines = {
      'pr_boost': [
        `${campaign.name} Launches Major Publicity Push`,
        `Studio Ramps Up Marketing for ${campaign.name}`,
        `${campaign.name} PR Campaign Goes Into High Gear`
      ],
      'damage_control': [
        `Studio Responds to Controversy with PR Offensive`,
        `Damage Control: ${campaign.name} Crisis Management Begins`,
        `Studio Launches Counter-Narrative Campaign`
      ],
      'product_placement': [
        `${campaign.name} Product Integration Campaign Announced`,
        `Studio Partners with Brands for ${campaign.name}`,
        `Marketing Blitz: ${campaign.name} Brand Partnerships`
      ],
      'exclusive_access': [
        `Exclusive Behind-the-Scenes Access Granted for ${campaign.name}`,
        `Media Gets Unprecedented ${campaign.name} Set Access`,
        `Studio Opens Doors for ${campaign.name} Coverage`
      ],
      'social_media_blitz': [
        `${campaign.name} Social Media Campaign Goes Viral`,
        `Digital Marketing Push for ${campaign.name} Begins`,
        `Studio Launches ${campaign.name} Online Engagement`
      ]
    };

    const typeHeadlines = headlines[campaign.type];
    return typeHeadlines[Math.floor(Math.random() * typeHeadlines.length)];
  }

  // Calculate impact of player response to media
  private static calculateReactionImpact(
    action: MediaReaction['action'],
    mediaItem: MediaItem,
    gameState: GameState
  ) {
    const baseImpact = {
      reputationChange: 0,
      moraleChange: 0,
      publicPerceptionChange: 0
    };

    const intensity = mediaItem.impact.intensity;
    const isNegativeStory = mediaItem.sentiment === 'negative';
    
    switch (action) {
      case 'deny':
        if (isNegativeStory) {
          baseImpact.reputationChange = intensity * 0.3; // Modest reputation recovery
          baseImpact.publicPerceptionChange = intensity * 0.2;
        } else {
          baseImpact.reputationChange = -intensity * 0.1; // Slight penalty for denying positive
        }
        break;
        
      case 'confirm':
        if (isNegativeStory) {
          baseImpact.reputationChange = -intensity * 0.2; // Take the hit but show honesty
          baseImpact.moraleChange = intensity * 0.1; // Team appreciates honesty
        } else {
          baseImpact.reputationChange = intensity * 0.4; // Big boost for confirming positive
          baseImpact.publicPerceptionChange = intensity * 0.3;
        }
        break;
        
      case 'deflect':
        baseImpact.reputationChange = isNegativeStory ? intensity * 0.1 : -intensity * 0.05;
        baseImpact.publicPerceptionChange = -intensity * 0.1; // Public doesn't like deflection
        break;
        
      case 'counter_attack':
        if (isNegativeStory) {
          baseImpact.reputationChange = intensity * 0.4; // Strong response can work
          baseImpact.publicPerceptionChange = -intensity * 0.2; // But public may dislike aggression
        } else {
          baseImpact.reputationChange = -intensity * 0.3; // Why attack positive coverage?
        }
        break;
        
      case 'capitalize':
        if (!isNegativeStory) {
          baseImpact.reputationChange = intensity * 0.5; // Maximum benefit from positive
          baseImpact.publicPerceptionChange = intensity * 0.4;
          baseImpact.moraleChange = intensity * 0.2;
        }
        break;
        
      case 'ignore':
        // No immediate impact, but story continues to have effects
        break;
    }

    // Studio reputation affects effectiveness of responses
    const reputationMultiplier = 1 + (gameState.studio.reputation - 50) / 100;
    
    return {
      reputationChange: Math.round(baseImpact.reputationChange * reputationMultiplier),
      moraleChange: Math.round(baseImpact.moraleChange),
      publicPerceptionChange: Math.round(baseImpact.publicPerceptionChange * reputationMultiplier)
    };
  }

  private static calculateReactionCost(
    action: MediaReaction['action'],
    mediaItem: MediaItem,
    gameState: GameState
  ): number {
    const baseCosts = {
      'deny': 100000,      // Legal/PR team costs
      'confirm': 50000,    // Statement preparation
      'deflect': 75000,    // PR messaging
      'counter_attack': 500000, // Major PR offensive
      'capitalize': 200000, // Marketing push
      'ignore': 0         // No cost
    };

    const storyIntensity = mediaItem.impact.intensity / 100;
    const storyReach = mediaItem.impact.reach / 100;
    
    return Math.round(baseCosts[action] * (1 + storyIntensity * storyReach));
  }

  // Generate follow-up media based on player response
  private static generateResponseMedia(
    reaction: MediaReaction,
    originalMedia: MediaItem,
    gameState: GameState,
    customMessage?: string
  ) {
    const followUpEventId = MediaEngine.queueMediaEvent({
      type: 'interview',
      triggerType: 'player_action',
      priority: originalMedia.impact.intensity > 70 ? 'high' : 'medium',
      entities: originalMedia.targets,
      eventData: {
        originalStory: originalMedia,
        response: reaction,
        customMessage,
        responseType: reaction.action
      },
      week: gameState.currentWeek,
      year: gameState.currentYear
    });

    // Add to reaction tracking
    reaction.reactionType = 'follow_up_story';
  }

  // Process weekly campaign effects
  static processWeeklyCampaigns(gameState: GameState): void {
    const currentWeek = gameState.currentWeek;
    const currentYear = gameState.currentYear;

    this.activeCampaigns.forEach(campaign => {
      if (campaign.status === 'active' && 
          currentWeek >= campaign.duration.startWeek && 
          currentWeek <= campaign.duration.endWeek &&
          currentYear === campaign.duration.year) {
        
        // Generate weekly campaign media
        if (Math.random() < (campaign.effectiveness / 100) * 0.3) { // 30% max chance per week
          this.generateCampaignMedia(campaign, gameState);
        }
        
        // Apply campaign effects to targeted entities
        this.applyCampaignEffects(campaign, gameState);
      }
      
      // Mark expired campaigns as completed
      if (currentWeek > campaign.duration.endWeek && campaign.status === 'active') {
        campaign.status = 'completed';
        console.log(`📅 PR Campaign completed: ${campaign.name}`);
      }
    });
  }

  private static applyCampaignEffects(campaign: MediaCampaign, gameState: GameState) {
    const effectStrength = (campaign.effectiveness / 100) * (campaign.budget / 10000000); // Scale with budget
    
    // Apply effects to targeted talent
    if (campaign.targets.talent) {
      campaign.targets.talent.forEach(talentId => {
        const talent = gameState.talent.find(t => t.id === talentId);
        if (talent) {
          // Positive campaigns boost loyalty and reduce burnout
          if (campaign.type === 'pr_boost' || campaign.type === 'social_media_blitz') {
            if (talent.studioLoyalty) {
              talent.studioLoyalty[campaign.studioId] = 
                Math.min(100, (talent.studioLoyalty[campaign.studioId] || 50) + effectStrength * 2);
            }
            if (talent.burnoutLevel) {
              talent.burnoutLevel = Math.max(0, talent.burnoutLevel - effectStrength);
            }
          }
        }
      });
    }
  }

  // Public API
  static getActiveCampaigns(): MediaCampaign[] {
    return this.activeCampaigns.filter(c => c.status === 'active');
  }

  static getPlayerReactions(): MediaReaction[] {
    return this.playerReactions;
  }

  static getCampaignCost(type: MediaCampaign['type'], duration: number, targetCount: number): number {
    const baseCosts = {
      'pr_boost': 1000000,
      'damage_control': 2000000,
      'product_placement': 1500000,
      'exclusive_access': 800000,
      'social_media_blitz': 1200000
    };

    return baseCosts[type] * duration * Math.max(1, targetCount * 0.5);
  }

  static canAffordResponse(action: MediaReaction['action'], mediaItem: MediaItem, gameState: GameState): boolean {
    const cost = this.calculateReactionCost(action, mediaItem, gameState);
    return gameState.studio.budget >= cost;
  }
}