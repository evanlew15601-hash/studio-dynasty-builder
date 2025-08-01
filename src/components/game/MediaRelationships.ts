import { MediaSource } from './MediaEngine';
import { GameState, Studio } from '../../types/game';

export interface MediaRelationship {
  sourceId: string;
  studioId: string;
  relationship: number; // -100 to 100
  trust: number; // 0 to 100
  exclusiveDeals: number;
  lastInteraction: { week: number; year: number };
  history: MediaInteraction[];
}

export interface MediaInteraction {
  id: string;
  type: 'interview' | 'exclusive' | 'response' | 'bribe' | 'threat' | 'gift';
  week: number;
  year: number;
  cost: number;
  relationshipChange: number;
  trustChange: number;
  success: boolean;
  description: string;
}

export interface MediaEvent {
  id: string;
  title: string;
  description: string;
  type: 'interview' | 'exclusive' | 'press_conference' | 'media_tour';
  cost: number;
  duration: number; // weeks
  targetSources: string[];
  benefits: {
    reputationBoost: number;
    relationshipBoost: number;
    mediaAttention: number;
  };
  requirements: string[];
}

export class MediaRelationships {
  private static relationships: Map<string, MediaRelationship> = new Map();
  private static interactionHistory: MediaInteraction[] = [];

  static initialize(mediaSources: MediaSource[], studioId: string): void {
    this.relationships.clear();
    this.interactionHistory = [];

    mediaSources.forEach(source => {
      const relationship: MediaRelationship = {
        sourceId: source.id,
        studioId,
        relationship: this.getInitialRelationship(source),
        trust: this.getInitialTrust(source),
        exclusiveDeals: 0,
        lastInteraction: { week: 0, year: 2024 },
        history: []
      };
      this.relationships.set(this.getRelationshipKey(source.id, studioId), relationship);
    });
  }

  private static getInitialRelationship(source: MediaSource): number {
    // Base relationship varies by source type and credibility
    let base = 0;
    
    switch (source.type) {
      case 'trade':
        base = 10; // Trade publications start neutral-positive
        break;
      case 'mainstream':
        base = 0; // Mainstream media starts neutral
        break;
      case 'tabloid':
        base = -10; // Tabloids start slightly negative
        break;
      case 'blog':
        base = -5; // Blogs start slightly negative
        break;
      case 'social':
        base = 5; // Social media starts slightly positive
        break;
    }

    // Higher credibility sources are harder to influence
    base += (source.credibility - 50) * 0.2;
    
    // Add some randomness
    base += (Math.random() - 0.5) * 20;

    return Math.max(-50, Math.min(50, base));
  }

  private static getInitialTrust(source: MediaSource): number {
    return 50 + (Math.random() - 0.5) * 20;
  }

  private static getRelationshipKey(sourceId: string, studioId: string): string {
    return `${sourceId}-${studioId}`;
  }

  static getRelationship(sourceId: string, studioId: string): MediaRelationship | undefined {
    return this.relationships.get(this.getRelationshipKey(sourceId, studioId));
  }

  static getAllRelationships(studioId: string): MediaRelationship[] {
    return Array.from(this.relationships.values()).filter(r => r.studioId === studioId);
  }

  static interactWithMedia(
    sourceId: string, 
    studioId: string, 
    interactionType: MediaInteraction['type'],
    gameState: GameState
  ): MediaInteraction {
    const relationship = this.getRelationship(sourceId, studioId);
    if (!relationship) {
      throw new Error('Relationship not found');
    }

    const interaction = this.calculateInteraction(interactionType, relationship, gameState);
    
    // Apply the interaction effects
    relationship.relationship = Math.max(-100, Math.min(100, 
      relationship.relationship + interaction.relationshipChange
    ));
    relationship.trust = Math.max(0, Math.min(100, 
      relationship.trust + interaction.trustChange
    ));
    relationship.lastInteraction = { week: gameState.currentWeek, year: gameState.currentYear };
    relationship.history.push(interaction);

    // Deduct cost from studio budget
    gameState.studio.budget -= interaction.cost;

    this.interactionHistory.push(interaction);

    return interaction;
  }

  private static calculateInteraction(
    type: MediaInteraction['type'],
    relationship: MediaRelationship,
    gameState: GameState
  ): MediaInteraction {
    const baseInteractions = {
      interview: {
        cost: 10000,
        relationshipChange: 15,
        trustChange: 5,
        baseSuccess: 0.8,
        description: 'Scheduled an exclusive interview'
      },
      exclusive: {
        cost: 50000,
        relationshipChange: 25,
        trustChange: 10,
        baseSuccess: 0.7,
        description: 'Granted exclusive access to behind-the-scenes content'
      },
      response: {
        cost: 5000,
        relationshipChange: 5,
        trustChange: 2,
        baseSuccess: 0.9,
        description: 'Provided a thoughtful response to media inquiry'
      },
      bribe: {
        cost: 100000,
        relationshipChange: 30,
        trustChange: -20,
        baseSuccess: 0.6,
        description: 'Made an under-the-table payment for favorable coverage'
      },
      threat: {
        cost: 0,
        relationshipChange: -40,
        trustChange: -30,
        baseSuccess: 0.3,
        description: 'Threatened legal action or other consequences'
      },
      gift: {
        cost: 25000,
        relationshipChange: 10,
        trustChange: 5,
        baseSuccess: 0.85,
        description: 'Sent expensive gifts and perks'
      }
    };

    const base = baseInteractions[type];
    
    // Calculate success chance based on current relationship and studio reputation
    const relationshipBonus = relationship.relationship * 0.01;
    const reputationBonus = (gameState.studio.reputation - 50) * 0.01;
    const successChance = Math.max(0.1, Math.min(0.95, 
      base.baseSuccess + relationshipBonus + reputationBonus
    ));

    const success = Math.random() < successChance;

    return {
      id: `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      week: gameState.currentWeek,
      year: gameState.currentYear,
      cost: base.cost,
      relationshipChange: success ? base.relationshipChange : Math.floor(base.relationshipChange * 0.3),
      trustChange: success ? base.trustChange : Math.floor(base.trustChange * 0.5),
      success,
      description: success ? base.description : `Failed attempt: ${base.description}`
    };
  }

  static organizeMediaEvent(eventType: MediaEvent['type'], gameState: GameState): MediaEvent {
    const events = {
      interview: {
        title: 'Press Interview',
        description: 'One-on-one interview with select media outlets',
        cost: 50000,
        duration: 1,
        benefits: { reputationBoost: 10, relationshipBoost: 15, mediaAttention: 0.3 }
      },
      exclusive: {
        title: 'Exclusive Access Event',
        description: 'Grant exclusive behind-the-scenes access',
        cost: 100000,
        duration: 2,
        benefits: { reputationBoost: 15, relationshipBoost: 25, mediaAttention: 0.5 }
      },
      press_conference: {
        title: 'Press Conference',
        description: 'Major announcement to all media outlets',
        cost: 75000,
        duration: 1,
        benefits: { reputationBoost: 20, relationshipBoost: 10, mediaAttention: 0.8 }
      },
      media_tour: {
        title: 'Media Tour',
        description: 'Multi-city media tour with interviews and appearances',
        cost: 200000,
        duration: 4,
        benefits: { reputationBoost: 30, relationshipBoost: 20, mediaAttention: 1.0 }
      }
    };

    const eventData = events[eventType];
    
    return {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: eventData.title,
      description: eventData.description,
      type: eventType,
      cost: eventData.cost,
      duration: eventData.duration,
      targetSources: this.selectTargetSources(gameState.studio.id),
      benefits: eventData.benefits,
      requirements: this.getEventRequirements(eventType, gameState)
    };
  }

  private static selectTargetSources(studioId: string): string[] {
    const relationships = this.getAllRelationships(studioId);
    
    // Prioritize sources with better relationships
    return relationships
      .sort((a, b) => b.relationship - a.relationship)
      .slice(0, 5)
      .map(r => r.sourceId);
  }

  private static getEventRequirements(eventType: MediaEvent['type'], gameState: GameState): string[] {
    const requirements: string[] = [];

    if (eventType === 'media_tour' && gameState.studio.reputation < 60) {
      requirements.push('Studio reputation must be at least 60');
    }

    if (eventType === 'exclusive' && !gameState.activeProjects.length) {
      requirements.push('Must have at least one active project');
    }

    return requirements;
  }

  static processWeeklyDecay(): void {
    // Relationships slowly decay over time without interaction
    this.relationships.forEach(relationship => {
      const weeksSinceInteraction = this.getWeeksSinceLastInteraction(relationship);
      
      if (weeksSinceInteraction > 4) {
        const decayAmount = Math.min(2, weeksSinceInteraction * 0.2);
        relationship.relationship = Math.max(-100, relationship.relationship - decayAmount);
        relationship.trust = Math.max(0, relationship.trust - decayAmount * 0.5);
      }
    });
  }

  private static getWeeksSinceLastInteraction(relationship: MediaRelationship): number {
    // Simple calculation - in a real implementation, you'd properly calculate weeks
    return 1; // Placeholder
  }

  static getRelationshipSummary(studioId: string): {
    average: number;
    allies: number;
    neutral: number;
    enemies: number;
    totalTrust: number;
  } {
    const relationships = this.getAllRelationships(studioId);
    
    if (relationships.length === 0) {
      return { average: 0, allies: 0, neutral: 0, enemies: 0, totalTrust: 0 };
    }

    const average = relationships.reduce((sum, r) => sum + r.relationship, 0) / relationships.length;
    const allies = relationships.filter(r => r.relationship > 30).length;
    const neutral = relationships.filter(r => r.relationship >= -30 && r.relationship <= 30).length;
    const enemies = relationships.filter(r => r.relationship < -30).length;
    const totalTrust = relationships.reduce((sum, r) => sum + r.trust, 0) / relationships.length;

    return { average, allies, neutral, enemies, totalTrust };
  }

  static getRecentInteractions(limit: number = 10): MediaInteraction[] {
    return this.interactionHistory
      .sort((a, b) => b.year * 52 + b.week - (a.year * 52 + a.week))
      .slice(0, limit);
  }
}