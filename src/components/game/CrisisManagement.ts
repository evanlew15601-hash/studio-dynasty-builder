import { MediaEngine } from './MediaEngine';
import { GameState, Studio } from '../../types/game';
import { stableFloat01, stableInt } from '@/utils/stableRandom';
import { hashStringToUint32 } from '@/utils/stablePick';

export interface Crisis {
  id: string;
  type: 'scandal' | 'lawsuit' | 'controversy' | 'leak' | 'accident' | 'financial';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  title: string;
  description: string;
  affectedType: 'studio' | 'talent' | 'project';
  affectedEntities: string[];
  triggerWeek: number;
  triggerYear: number;
  resolved: boolean;
  reputationImpact: number;
  financialImpact: number;
  mediaAttention: number;
  responseOptions: CrisisResponse[];
}

export interface CrisisResponse {
  id: string;
  label: string;
  description: string;
  cost: number;
  effectiveness: number;
  reputationImpact: number;
  timeToResolve: number;
  requirements?: string[];
}

export class CrisisManagement {
  private static activeCrises: Crisis[] = [];
  private static crisisHistory: Crisis[] = [];

  static initialize(): void {
    this.activeCrises = [];
    this.crisisHistory = [];
  }

  static triggerCrisis(gameState: GameState, forcedType?: Crisis['type']): Crisis | null {
    const studio = gameState.studio;
    const crisisChance = this.calculateCrisisChance(studio, gameState);

    const absWeek = (gameState.currentYear * 52) + gameState.currentWeek;
    const seedRoot = `crisis|${gameState.universeSeed ?? 0}|${absWeek}`;

    if (!forcedType) {
      const roll = stableFloat01(`${seedRoot}|chance-roll`);
      if (roll > crisisChance) {
        return null;
      }
    }

    const crisisType = forcedType || this.selectCrisisType(studio, seedRoot);
    const crisis = this.generateCrisis(crisisType, gameState, seedRoot);

    // Avoid duplicates if called multiple times for the same save/week.
    if (this.activeCrises.some((c) => c.id === crisis.id)) return crisis;

    this.activeCrises.push(crisis);

    const affectedProjects = crisis.affectedType === 'project' ? crisis.affectedEntities : [];
    const affectedTalent = crisis.affectedType === 'talent'
      ? crisis.affectedEntities
      : affectedProjects.flatMap(projectId => {
          const project = gameState.projects.find(p => p.id === projectId);
          return (project?.cast || []).map(c => c.talentId);
        });

    const affectedStudios = (() => {
      if (crisis.affectedType === 'studio') return crisis.affectedEntities;

      if (affectedProjects.length > 0) {
        const fromProjects = affectedProjects.flatMap(projectId => {
          const playerProject = gameState.projects.find(p => p.id === projectId);
          if (playerProject) return [gameState.studio.id];

          const releaseProject = (gameState.allReleases || []).find((r: any) => r?.id === projectId && r?.script);
          const studioName = (releaseProject as any)?.studioName;
          const competitorStudio = studioName
            ? gameState.competitorStudios?.find(s => s.name === studioName)
            : undefined;

          return competitorStudio ? [competitorStudio.id] : [];
        });

        return Array.from(new Set(fromProjects));
      }

      return [];
    })();

    const mediaEventType = crisis.type === 'leak' ? 'leak' : 'scandal';

    // Generate initial media coverage
    MediaEngine.queueMediaEvent({
      type: mediaEventType as any,
      triggerType: 'automatic',
      priority: crisis.severity === 'critical' ? 'breaking' : 'high',
      entities: {
        studios: affectedStudios.length > 0 ? affectedStudios : undefined,
        talent: affectedTalent.length > 0 ? affectedTalent : undefined,
        projects: affectedProjects.length > 0 ? affectedProjects : undefined
      },
      eventData: {
        crisisId: crisis.id,
        severity: crisis.severity,
        title: crisis.title
      },
      week: gameState.currentWeek,
      year: gameState.currentYear
    });

    return crisis;
  }

  static respondToCrisis(crisisId: string, responseId: string, gameState: GameState): boolean {
    const crisis = this.activeCrises.find(c => c.id === crisisId);
    if (!crisis) return false;

    const response = crisis.responseOptions.find(r => r.id === responseId);
    if (!response) return false;

    // Check if studio can afford the response
    if (gameState.studio.budget < response.cost) {
      return false;
    }

    // Apply response effects
    gameState.studio.budget -= response.cost;
    gameState.studio.reputation = Math.max(0, Math.min(100, 
      gameState.studio.reputation + response.reputationImpact
    ));

    // Generate follow-up media
    MediaEngine.queueMediaEvent({
      type: 'interview',
      triggerType: 'player_action',
      priority: 'high',
      entities: {
        studios: [gameState.studio.id]
      },
      eventData: {
        crisisId: crisis.id,
        responseType: response.label,
        effectiveness: response.effectiveness
      },
      week: gameState.currentWeek,
      year: gameState.currentYear
    });

    // Mark crisis as resolved or reduce severity
    if (response.effectiveness >= 80) {
      crisis.resolved = true;
      this.activeCrises = this.activeCrises.filter(c => c.id !== crisisId);
      this.crisisHistory.push(crisis);
    } else {
      crisis.severity = this.reduceSeverity(crisis.severity);
      crisis.mediaAttention *= (1 - response.effectiveness / 100);
    }

    return true;
  }

  private static calculateCrisisChance(studio: Studio, gameState: GameState): number {
    let baseChance = 0.05; // 5% base chance per week

    // Higher chance with more projects
    const activeProjectCount = gameState.projects?.length || 0;
    baseChance += activeProjectCount * 0.01;

    // Higher chance with lower reputation
    const reputationFactor = (100 - studio.reputation) / 100;
    baseChance += reputationFactor * 0.03;
    baseChance += 0; // Removed problematic talent calculation

    return Math.min(baseChance, 0.25); // Cap at 25%
  }

  private static selectCrisisType(studio: Studio, seedRoot: string): Crisis['type'] {
    const weights = {
      scandal: 30,
      lawsuit: 15,
      controversy: 25,
      leak: 20,
      accident: 5,
      financial: studio.budget < 1000000 ? 15 : 5
    };

    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const roll = stableFloat01(`${seedRoot}|type-roll`) * totalWeight;

    let currentWeight = 0;
    for (const [type, weight] of Object.entries(weights)) {
      currentWeight += weight;
      if (roll <= currentWeight) {
        return type as Crisis['type'];
      }
    }

    return 'scandal';
  }

  private static generateCrisis(type: Crisis['type'], gameState: GameState, seedRoot: string): Crisis {
    const crisisTemplates = {
      scandal: [
        { title: "Talent Scandal Erupts", description: "A major star is caught in a compromising situation", affectedType: 'talent' as const },
        { title: "Behind-the-Scenes Drama", description: "Reports of unprofessional behavior on set", affectedType: 'project' as const }
      ],
      lawsuit: [
        { title: "Copyright Infringement Suit", description: "Studio faces legal action over script similarities", affectedType: 'project' as const },
        { title: "Contract Dispute", description: "Former employee files wrongful termination lawsuit", affectedType: 'studio' as const }
      ],
      controversy: [
        { title: "Casting Controversy", description: "Public backlash over casting decisions", affectedType: 'project' as const },
        { title: "Cultural Sensitivity Issues", description: "Critics call out problematic content", affectedType: 'project' as const }
      ],
      leak: [
        { title: "Script Leak", description: "Confidential script surfaces online", affectedType: 'project' as const },
        { title: "Internal Documents Exposed", description: "Private emails and memos made public", affectedType: 'studio' as const }
      ],
      accident: [
        { title: "On-Set Accident", description: "Serious injury during filming", affectedType: 'project' as const },
        { title: "Equipment Failure", description: "Major equipment malfunction causes delays", affectedType: 'project' as const }
      ],
      financial: [
        { title: "Budget Overrun Exposed", description: "Media reports massive cost overruns", affectedType: 'project' as const },
        { title: "Investor Concerns", description: "Questions raised about studio's financial health", affectedType: 'studio' as const }
      ]
    };

    const templates = crisisTemplates[type];
    const template = templates[stableInt(`${seedRoot}|template`, 0, templates.length - 1)];

    const severity = this.determineSeverity(seedRoot);
    const affectedEntities = this.selectAffectedEntities(template.affectedType, gameState, seedRoot);

    const signature = `${seedRoot}|${type}|${severity}|${template.affectedType}|${affectedEntities.slice().sort().join(',')}`;
    const id = `crisis_${hashStringToUint32(signature).toString(36)}`;

    return {
      id,
      type,
      severity,
      title: template.title,
      description: template.description,
      affectedType: template.affectedType,
      affectedEntities,
      triggerWeek: gameState.currentWeek,
      triggerYear: gameState.currentYear,
      resolved: false,
      reputationImpact: this.calculateReputationImpact(severity),
      financialImpact: this.calculateFinancialImpact(severity),
      mediaAttention: this.calculateMediaAttention(severity),
      responseOptions: this.generateResponseOptions(type, severity)
    };
  }

  private static determineSeverity(seedRoot: string): Crisis['severity'] {
    const roll = stableFloat01(`${seedRoot}|severity-roll`);
    if (roll < 0.4) return 'minor';
    if (roll < 0.7) return 'moderate';
    if (roll < 0.9) return 'major';
    return 'critical';
  }

  private static selectAffectedEntities(affectedType: Crisis['affectedType'], gameState: GameState, seedRoot: string): string[] {
    if (affectedType === 'talent' && gameState.talent.length > 0) {
      const idx = stableInt(`${seedRoot}|affected-talent`, 0, gameState.talent.length - 1);
      const talent = gameState.talent[idx];
      return [talent.id];
    }

    if (affectedType === 'project' && gameState.projects.length > 0) {
      const idx = stableInt(`${seedRoot}|affected-project`, 0, gameState.projects.length - 1);
      const project = gameState.projects[idx];
      return [project.id];
    }

    return [gameState.studio.id];
  }

  private static calculateReputationImpact(severity: Crisis['severity']): number {
    const impacts = { minor: -5, moderate: -15, major: -30, critical: -50 };
    return impacts[severity];
  }

  private static calculateFinancialImpact(severity: Crisis['severity']): number {
    const impacts = { minor: 50000, moderate: 200000, major: 500000, critical: 1000000 };
    return impacts[severity];
  }

  private static calculateMediaAttention(severity: Crisis['severity']): number {
    const attention = { minor: 0.3, moderate: 0.6, major: 0.8, critical: 1.0 };
    return attention[severity];
  }

  private static generateResponseOptions(type: Crisis['type'], severity: Crisis['severity']): CrisisResponse[] {
    const baseOptions: CrisisResponse[] = [
      {
        id: 'no-comment',
        label: 'No Comment',
        description: 'Remain silent and hope it blows over',
        cost: 0,
        effectiveness: 20,
        reputationImpact: -5,
        timeToResolve: 4
      },
      {
        id: 'public-statement',
        label: 'Public Statement',
        description: 'Issue a carefully crafted public statement',
        cost: 25000,
        effectiveness: 50,
        reputationImpact: 10,
        timeToResolve: 2
      },
      {
        id: 'legal-action',
        label: 'Legal Action',
        description: 'Pursue legal remedies and threaten lawsuits',
        cost: 100000,
        effectiveness: 40,
        reputationImpact: -10,
        timeToResolve: 6
      }
    ];

    // Add type-specific options
    const typeSpecificOptions: { [key: string]: CrisisResponse[] } = {
      scandal: [
        {
          id: 'pr-campaign',
          label: 'PR Campaign',
          description: 'Launch a comprehensive PR campaign to rebuild image',
          cost: 200000,
          effectiveness: 70,
          reputationImpact: 20,
          timeToResolve: 3
        }
      ],
      lawsuit: [
        {
          id: 'settlement',
          label: 'Settle Out of Court',
          description: 'Offer a settlement to avoid prolonged litigation',
          cost: 300000,
          effectiveness: 80,
          reputationImpact: -5,
          timeToResolve: 1
        }
      ],
      controversy: [
        {
          id: 'community-outreach',
          label: 'Community Outreach',
          description: 'Engage with affected communities and make amends',
          cost: 150000,
          effectiveness: 75,
          reputationImpact: 25,
          timeToResolve: 4
        }
      ]
    };

    const options = [...baseOptions];
    if (typeSpecificOptions[type]) {
      options.push(...typeSpecificOptions[type]);
    }

    // Adjust costs and effectiveness based on severity
    const severityMultipliers = { minor: 0.5, moderate: 1.0, major: 1.5, critical: 2.0 };
    const multiplier = severityMultipliers[severity];

    return options.map(option => ({
      ...option,
      cost: Math.floor(option.cost * multiplier),
      effectiveness: Math.max(10, option.effectiveness - (multiplier - 1) * 20)
    }));
  }

  private static reduceSeverity(severity: Crisis['severity']): Crisis['severity'] {
    const reductions = { critical: 'major', major: 'moderate', moderate: 'minor', minor: 'minor' };
    return reductions[severity] as Crisis['severity'];
  }

  // Public API methods
  static getActiveCrises(): Crisis[] {
    return [...this.activeCrises];
  }

  static getCrisisHistory(): Crisis[] {
    return [...this.crisisHistory];
  }

  static getCrisisById(id: string): Crisis | undefined {
    return this.activeCrises.find(c => c.id === id) || this.crisisHistory.find(c => c.id === id);
  }

  static getWeeklyImpact(gameState: GameState): { reputationImpact: number; financialImpact: number } {
    let reputationImpact = 0;
    let financialImpact = 0;

    this.activeCrises.forEach(crisis => {
      reputationImpact += crisis.reputationImpact * crisis.mediaAttention * 0.1;
      financialImpact += crisis.financialImpact * crisis.mediaAttention * 0.05;
    });

    return { reputationImpact, financialImpact };
  }

  // Memory management
  static cleanup(): void {
    this.activeCrises = [];
    this.crisisHistory = [];
  }

  // Periodic cleanup to prevent memory leaks
  static performMaintenanceCleanup(currentWeek: number, currentYear: number): void {
    // Remove old resolved crises from history (keep last 52 weeks)
    this.crisisHistory = this.crisisHistory.filter(crisis => {
      const weeksAgo = (currentYear - crisis.triggerYear) * 52 + (currentWeek - crisis.triggerWeek);
      return weeksAgo <= 52;
    });
  }
}