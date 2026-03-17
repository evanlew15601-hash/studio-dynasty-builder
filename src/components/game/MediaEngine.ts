import { MediaEvent, MediaItem, MediaMemory, GameState, TalentPerson, Project, Studio } from '@/types/game';
import { MediaSourceGenerator } from '@/data/MediaSourceGenerator';
import { MediaContentGenerator } from '@/data/MediaContentGenerator';

class MediaEngine {
  private static mediaHistory: MediaItem[] = [];
  private static mediaMemory: Map<string, MediaMemory> = new Map();
  private static eventQueue: MediaEvent[] = [];

  // Initialize media sources
  static initialize() {
    MediaSourceGenerator.generateMediaSources();
    if (import.meta.env.DEV) {
      console.log('Media Engine initialized with realistic news sources');
    }
  }

  // Add media event to queue for processing
  static queueMediaEvent(event: Omit<MediaEvent, 'id' | 'processed'>): string {
    const mediaEvent: MediaEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      processed: false
    };

    this.eventQueue.push(mediaEvent);
    if (import.meta.env.DEV) {
      console.log(`Media event queued: ${mediaEvent.type} - ${mediaEvent.priority}`);
    }

    return mediaEvent.id;
  }

  // Process all queued media events
  static processMediaEvents(gameState: GameState): MediaItem[] {
    const newMediaItems: MediaItem[] = [];
    const eventsToProcess = this.eventQueue.filter(event => !event.processed);

    for (const event of eventsToProcess) {
      try {
        const entities = this.getEntitiesForEvent(event, gameState);
        const mediaItem = MediaContentGenerator.generateMediaItem(event, entities);
        
        newMediaItems.push(mediaItem);
        this.mediaHistory.push(mediaItem);
        
        // Update media memory for affected entities
        this.updateMediaMemory(mediaItem);
        
        // Mark event as processed
        event.processed = true;
        
        if (import.meta.env.DEV) {
          console.log(`Generated media: "${mediaItem.headline}" from ${mediaItem.source.name}`);
        }
      } catch (error) {
        console.error('Error processing media event:', error);
        // Mark as processed to prevent infinite retry
        event.processed = true;
      }
    }

    // Clean up processed events older than 52 weeks to prevent memory leaks
    this.eventQueue = this.eventQueue.filter(event => 
      !event.processed || (gameState.currentWeek - event.week < 52 && gameState.currentYear === event.year)
    );

    // Limit media history to prevent memory growth (keep last 1000 items)
    if (this.mediaHistory.length > 1000) {
      this.mediaHistory = this.mediaHistory.slice(-1000);
    }

    return newMediaItems;
  }

  static injectDeterministicMediaItem(input: {
    id: string;
    type: MediaItem['type'];
    headline: string;
    content: string;
    week: number;
    year: number;
    sentiment: MediaItem['sentiment'];
    targets: MediaItem['targets'];
    impact?: Partial<MediaItem['impact']>;
    tags?: string[];
    relatedEvents?: string[];
  }): string {
    MediaSourceGenerator.generateMediaSources();

    if (this.mediaHistory.some((m) => m.id === input.id)) return input.id;

    const source = MediaSourceGenerator
      .getSourcesByType('trade_publication')
      .slice()
      .sort((a, b) => (b.credibility || 0) - (a.credibility || 0))[0] ||
      MediaSourceGenerator.generateMediaSources()[0];

    const impact: MediaItem['impact'] = {
      reach: 70,
      credibility: source?.credibility ?? 80,
      virality: 30,
      intensity: 35,
      ...(input.impact || {}),
    };

    const mediaItem: MediaItem = {
      id: input.id,
      source,
      type: input.type,
      headline: input.headline,
      content: input.content,
      publishDate: { week: input.week, year: input.year },
      targets: input.targets,
      sentiment: input.sentiment,
      impact,
      tags: input.tags || [],
      relatedEvents: input.relatedEvents,
    };

    this.mediaHistory.push(mediaItem);
    this.updateMediaMemory(mediaItem);

    return input.id;
  }

  // Auto-generate events based on game state changes
  static triggerAutomaticEvents(gameState: GameState, previousState?: GameState): string[] {
    const triggeredEvents: string[] = [];

    // Check for new projects entering production
    if (previousState) {
      const newInProduction = gameState.projects.filter(project =>
        project.status === 'production' &&
        previousState.projects.find(p => p.id === project.id)?.status !== 'production'
      );

      for (const project of newInProduction) {
        const eventId = this.queueMediaEvent({
          type: 'production_start',
          triggerType: 'automatic',
          priority: 'medium',
          entities: {
            studios: [gameState.studio.id],
            projects: [project.id],
            talent: project.cast?.map(c => c.talentId) || []
          },
          eventData: { project },
          week: gameState.currentWeek,
          year: gameState.currentYear
        });
        triggeredEvents.push(eventId);
      }

      // Check for completed films
      const newlyCompleted = gameState.projects.filter(project =>
        project.status === 'post-production' &&
        previousState.projects.find(p => p.id === project.id)?.status === 'production'
      );

      for (const project of newlyCompleted) {
        const eventId = this.queueMediaEvent({
          type: 'production_wrap',
          triggerType: 'automatic',
          priority: 'medium',
          entities: {
            studios: [gameState.studio.id],
            projects: [project.id],
            talent: project.cast?.map(c => c.talentId) || []
          },
          eventData: { project },
          week: gameState.currentWeek,
          year: gameState.currentYear
        });
        triggeredEvents.push(eventId);
      }
    }

    // Random industry events (keeps the feed from going quiet between major milestones)
    if (Math.random() < 0.12 && gameState.talent.length > 0) {
      const randomEventTypes = ['rumor', 'interview', 'exclusive', 'leak', 'rumor', 'interview', 'scandal'];
      const eventType = randomEventTypes[Math.floor(Math.random() * randomEventTypes.length)];

      // Pick random talent for the event
      const talent = gameState.talent[Math.floor(Math.random() * gameState.talent.length)];

      const eventId = this.queueMediaEvent({
        type: eventType as any,
        triggerType: 'random',
        priority: eventType === 'scandal' ? 'high' : eventType === 'leak' ? 'medium' : 'low',
        entities: {
          talent: [talent.id]
        },
        eventData: { talent },
        week: gameState.currentWeek,
        year: gameState.currentYear
      });
      triggeredEvents.push(eventId);
    }

    // Competitor / industry release coverage (gives the feed non-player stories)
    if (Math.random() < 0.35 && (gameState.allReleases?.length || 0) > 0) {
      const releasesThisWeek = (gameState.allReleases || [])
        .filter((r): r is Project => (r as any)?.script)
        .filter(p => (p.releaseWeek === gameState.currentWeek && p.releaseYear === gameState.currentYear));

      const competitorCandidates = releasesThisWeek.filter(p =>
        !!p.studioName && p.studioName !== gameState.studio.name
      );

      const candidatePool = competitorCandidates.length > 0 ? competitorCandidates : releasesThisWeek;

      if (candidatePool.length > 0) {
        const project = candidatePool[Math.floor(Math.random() * candidatePool.length)];

        const studio =
          (project.studioName
            ? gameState.competitorStudios.find(s => s.name === project.studioName)
            : undefined) ||
          gameState.competitorStudios.find(s => project.title.includes(s.name.split(' ')[0])) ||
          gameState.competitorStudios.find(s => s.specialties.includes(project.script?.genre));

        const talentIds = (project.cast || [])
          .slice(0, 2)
          .map(c => c.talentId)
          .filter(Boolean);

        const eventId = this.queueMediaEvent({
          type: 'release',
          triggerType: 'competitor_action',
          priority: 'low',
          entities: {
            studios: studio ? [studio.id] : undefined,
            projects: [project.id],
            talent: talentIds.length > 0 ? talentIds : undefined
          },
          eventData: { project },
          week: gameState.currentWeek,
          year: gameState.currentYear
        });

        triggeredEvents.push(eventId);
      }
    }

    return triggeredEvents;
  }

  // Get entities (studios, talent, projects) referenced in an event
  private static getEntitiesForEvent(event: MediaEvent, gameState: GameState) {
    const entities: {
      studios?: Studio[];
      talent?: TalentPerson[];
      projects?: Project[];
    } = {};

    if (event.entities.studios?.length) {
      const allStudios = [gameState.studio, ...(gameState.competitorStudios || [])];
      const studiosById = new Map(allStudios.map(s => [s.id, s] as const));
      entities.studios = event.entities.studios
        .map(id => studiosById.get(id))
        .filter(Boolean) as Studio[];
    }

    if (event.entities.talent?.length) {
      entities.talent = gameState.talent.filter(t => event.entities.talent?.includes(t.id));
    }

    if (event.entities.projects?.length) {
      const allReleases = (gameState.allReleases || []).filter((r): r is Project => (r as any)?.script);
      const allProjects = [...(gameState.projects || []), ...(gameState.aiStudioProjects || []), ...allReleases];
      const projectsById = new Map(allProjects.map(p => [p.id, p] as const));
      entities.projects = event.entities.projects
        .map(id => projectsById.get(id))
        .filter(Boolean) as Project[];
    }

    return entities;
  }

  // Update media memory for reputation tracking
  private static updateMediaMemory(mediaItem: MediaItem) {
    const updateEntityMemory = (entityId: string, entityType: 'studio' | 'talent' | 'project' | 'film') => {
      let memory = this.mediaMemory.get(entityId);
      
      if (!memory) {
        memory = {
          entityId,
          entityType,
          reputationImpact: 0,
          sentimentHistory: [],
          majorStories: [],
          currentBuzz: 0,
          lastMajorStory: undefined
        };
      }

      // Update sentiment history
      memory.sentimentHistory.push({
        week: mediaItem.publishDate.week,
        year: mediaItem.publishDate.year,
        sentiment: mediaItem.sentiment,
        intensity: mediaItem.impact.intensity
      });

      // Calculate reputation impact
      const sentimentMultiplier = {
        'positive': 1,
        'neutral': 0,
        'negative': -1
      }[mediaItem.sentiment];

      const impactValue = (mediaItem.impact.reach * mediaItem.impact.credibility * mediaItem.impact.intensity) / 10000;
      memory.reputationImpact += impactValue * sentimentMultiplier;

      // Update buzz level
      memory.currentBuzz = Math.min(100, memory.currentBuzz + mediaItem.impact.virality);

      // Track major stories
      if (mediaItem.impact.intensity > 50) {
        memory.majorStories.push(mediaItem.id);
        memory.lastMajorStory = {
          week: mediaItem.publishDate.week,
          year: mediaItem.publishDate.year,
          type: mediaItem.type,
          sentiment: mediaItem.sentiment
        };
      }

      // Keep only recent sentiment history (last 52 weeks)
      memory.sentimentHistory = memory.sentimentHistory.filter(entry =>
        mediaItem.publishDate.week - entry.week < 52 && mediaItem.publishDate.year >= entry.year
      );

      this.mediaMemory.set(entityId, memory);
    };

    // Update memory for all targeted entities
    if (mediaItem.targets.studios) {
      mediaItem.targets.studios.forEach(id => updateEntityMemory(id, 'studio'));
    }
    if (mediaItem.targets.talent) {
      mediaItem.targets.talent.forEach(id => updateEntityMemory(id, 'talent'));
    }
    if (mediaItem.targets.projects) {
      mediaItem.targets.projects.forEach(id => updateEntityMemory(id, 'project'));
    }
  }

  // Public API for getting media data
  static getRecentMedia(limit: number = 20): MediaItem[] {
    const abs = (m: MediaItem) => (m.publishDate.year * 52) + m.publishDate.week;

    return this.mediaHistory
      .slice()
      .sort((a, b) => abs(b) - abs(a))
      .slice(0, limit);
  }

  static getMediaForEntity(entityId: string): MediaItem[] {
    return this.mediaHistory.filter(item =>
      item.targets.studios?.includes(entityId) ||
      item.targets.talent?.includes(entityId) ||
      item.targets.projects?.includes(entityId)
    );
  }

  static getMediaMemory(entityId: string): MediaMemory | undefined {
    return this.mediaMemory.get(entityId);
  }

  static getAllMediaSources() {
    return MediaSourceGenerator.generateMediaSources();
  }

  static getMediaStats() {
    const abs = (m: MediaItem) => (m.publishDate.year * 52) + m.publishDate.week;
    const latest = this.mediaHistory.reduce((max, item) => Math.max(max, abs(item)), 0);

    return {
      totalItems: this.mediaHistory.length,
      queuedEvents: this.eventQueue.filter(e => !e.processed).length,
      entitiesTracked: this.mediaMemory.size,
      // Items from last 4 in-game weeks relative to the newest article we have.
      recentActivity: this.mediaHistory.filter(item => (latest - abs(item)) < 4).length
    };
  }

  // Player action triggers
  static triggerCastingAnnouncement(project: Project, talent: TalentPerson, gameState: GameState): string {
    return this.queueMediaEvent({
      type: 'casting_announcement',
      triggerType: 'player_action',
      priority: talent.reputation > 80 ? 'high' : 'medium',
      entities: {
        studios: [gameState.studio.id],
        projects: [project.id],
        talent: [talent.id]
      },
      eventData: { project, talent },
      week: gameState.currentWeek,
      year: gameState.currentYear
    });
  }

  static triggerBoxOfficeReport(project: Project, earnings: number, gameState: GameState): string {
    return this.queueMediaEvent({
      type: 'box_office',
      triggerType: 'automatic',
      priority: earnings > 50000000 ? 'breaking' : 'high',
      entities: {
        studios: [gameState.studio.id],
        projects: [project.id],
        talent: project.cast?.map(c => c.talentId) || []
      },
      eventData: { project, earnings },
      week: gameState.currentWeek,
      year: gameState.currentYear
    });
  }

  static triggerAwardWin(talent: TalentPerson, award: string, project: Project, gameState: GameState): string {
    return this.queueMediaEvent({
      type: 'award_win',
      triggerType: 'automatic',
      priority: 'breaking',
      entities: {
        studios: [gameState.studio.id],
        projects: [project.id],
        talent: [talent.id]
      },
      eventData: { talent, award, project },
      week: gameState.currentWeek,
      year: gameState.currentYear
    });
  }

  // Cleanup method for memory management
  static cleanup(): void {
    this.mediaHistory = [];
    this.mediaMemory.clear();
    this.eventQueue = [];
  }
}

export { MediaEngine };
