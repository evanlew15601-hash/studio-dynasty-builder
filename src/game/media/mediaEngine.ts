import type { MediaEvent, MediaItem, MediaMemory, MediaState, GameState, TalentPerson, Project, Studio, MediaSource } from '@/types/game';
import { MediaSourceGenerator } from '@/data/MediaSourceGenerator';
import { MediaContentGenerator } from '@/data/MediaContentGenerator';
import { hashStringToUint32 } from '@/utils/stablePick';
import { stableFloat01, stableInt } from '@/utils/stableRandom';
import { isPrimaryStreamingFilm, isTvProject } from '@/utils/projectMedium';


function isDomLike(value: unknown): boolean {
  const g = globalThis as any;
  if (!value || typeof value !== 'object') return false;

  const NodeCtor = g.Node as (new (...args: any[]) => any) | undefined;
  if (typeof NodeCtor === 'function' && value instanceof NodeCtor) return true;

  const EventCtor = g.Event as (new (...args: any[]) => any) | undefined;
  if (typeof EventCtor === 'function' && value instanceof EventCtor) return true;

  const WindowCtor = g.Window as (new (...args: any[]) => any) | undefined;
  if (typeof WindowCtor === 'function' && value instanceof WindowCtor) return true;

  return false;
}

function fallbackClone<T>(value: T): T {
  const seen = new WeakMap<object, any>();

  const walk = (v: any): any => {
    if (v === null || v === undefined) return v;

    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return v;
    if (t === 'bigint') return Number(v);
    if (t === 'symbol' || t === 'function') return undefined;

    if (isDomLike(v)) return undefined;

    if (v instanceof Date) return new Date(v.getTime());

    if (t !== 'object') return undefined;

    if (seen.has(v)) return seen.get(v);

    if (Array.isArray(v)) {
      const out: any[] = [];
      seen.set(v, out);
      for (const item of v) {
        const next = walk(item);
        if (next !== undefined) out.push(next);
      }
      return out;
    }

    if (v instanceof Map) {
      const out = new Map();
      seen.set(v, out);
      for (const [k, val] of v.entries()) {
        const nk = walk(k);
        const nv = walk(val);
        if (nk !== undefined && nv !== undefined) out.set(nk, nv);
      }
      return out;
    }

    if (v instanceof Set) {
      const out = new Set();
      seen.set(v, out);
      for (const item of v.values()) {
        const next = walk(item);
        if (next !== undefined) out.add(next);
      }
      return out;
    }

    const out: Record<string, any> = {};
    seen.set(v, out);

    for (const [k, val] of Object.entries(v)) {
      const next = walk(val);
      if (next !== undefined) out[k] = next;
    }

    return out;
  };

  return walk(value) as T;
}

function clone<T>(value: T): T {
  return fallbackClone(value);
}

class MediaEngine {
  private static mediaHistory: MediaItem[] = [];
  private static mediaMemory: Map<string, MediaMemory> = new Map();
  private static eventQueue: MediaEvent[] = [];

  static hydrate(state?: MediaState): void {
    const engine = state?.engine;
    if (!engine) {
      this.mediaHistory = [];
      this.mediaMemory.clear();
      this.eventQueue = [];
      return;
    }

    // Copy values out of Zustand+Immer drafts (hydrate can be called from inside set()).
    // Retaining draft references here would later crash with: "Cannot perform 'get' on a proxy that has been revoked".
    const src = clone(engine) as NonNullable<MediaState['engine']>;

    this.mediaHistory = (src.history || []).map((m) => clone(m));
    this.mediaMemory = new Map((src.memories || []).map((m) => [m.entityId, clone(m)] as const));
    this.eventQueue = (src.eventQueue || []).map((e) => clone(e));
  }

  static snapshot(): MediaState['engine'] {
    // Keep state bounded to avoid bloating save files.
    const history = this.mediaHistory.slice(-250).map((m) => clone(m));

    const memories = Array.from(this.mediaMemory.values()).map((m) => {
      const sentimentHistory = (m.sentimentHistory || []).slice(-52);
      const majorStories = (m.majorStories || []).slice(-50);
      const lastMajorStory = m.lastMajorStory;

      return clone({
        ...m,
        sentimentHistory,
        majorStories,
        lastMajorStory,
      });
    });

    const eventQueue = this.eventQueue.slice(-250).map((e) => clone(e));

    return { history, memories, eventQueue };
  }

  // Initialize media sources
  static initialize() {
    MediaSourceGenerator.generateMediaSources();
    if (import.meta.env.DEV) {
      console.log('Media Engine initialized with realistic news sources');
    }
  }

  // Add media event to queue for processing
  static queueMediaEvent(event: (Omit<MediaEvent, 'id' | 'processed'> & { id?: string })): string {
    const id =
      event.id ||
      (() => {
        const studios = (event.entities?.studios || []).slice().sort().join(',');
        const talent = (event.entities?.talent || []).slice().sort().join(',');
        const projects = (event.entities?.projects || []).slice().sort().join(',');
        const films = (event.entities?.films || []).slice().sort().join(',');

        const signature = `${event.type}|${event.triggerType}|Y${event.year}W${event.week}|s:${studios}|t:${talent}|p:${projects}|f:${films}`;
        return `event_${hashStringToUint32(signature).toString(36)}`;
      })();

    // Allow deterministic callers to avoid accidental duplicate queueing.
    if (this.eventQueue.some((e) => e.id === id)) return id;

    const mediaEvent: MediaEvent = {
      ...event,
      id,
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
    const currentAbsWeek = (gameState.currentYear * 52) + gameState.currentWeek;
    this.eventQueue = this.eventQueue.filter(event => {
      if (!event.processed) return true;
      const eventAbsWeek = (event.year * 52) + event.week;
      return (currentAbsWeek - eventAbsWeek) < 52;
    });

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
    sourceType?: MediaSource['type'];
    sourceId?: string;
  }): string {
    const allSources = MediaSourceGenerator.generateMediaSources();

    if (this.mediaHistory.some((m) => m.id === input.id)) return input.id;

    const sourceById = input.sourceId ? allSources.find((s) => s.id === input.sourceId) : undefined;

    const pool = sourceById
      ? [sourceById]
      : MediaSourceGenerator.getSourcesByType(input.sourceType || 'trade_publication');

    const source = pool
      .slice()
      .sort((a, b) => (b.credibility || 0) - (a.credibility || 0))[0] ||
      allSources[0];

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

      // Check for releases (player projects) so the news feed reacts immediately.
      const newlyReleased = gameState.projects.filter(project => {
        if (project.status !== 'released') return false;
        const prev = previousState.projects.find(p => p.id === project.id);
        if (prev?.status === 'released') return false;

        const releaseWeek = (project as any).releaseWeek ?? (project as any).scheduledReleaseWeek;
        const releaseYear = (project as any).releaseYear ?? (project as any).scheduledReleaseYear;

        return releaseWeek === gameState.currentWeek && releaseYear === gameState.currentYear;
      });

      for (const project of newlyReleased) {
        const releaseEventId = this.queueMediaEvent({
          type: 'release',
          triggerType: 'automatic',
          priority: 'high',
          entities: {
            studios: [gameState.studio.id],
            projects: [project.id],
            talent: project.cast?.map(c => c.talentId) || []
          },
          eventData: { project },
          week: gameState.currentWeek,
          year: gameState.currentYear
        });
        triggeredEvents.push(releaseEventId);

        const isTv = isTvProject(project);
        const isStreaming = isPrimaryStreamingFilm(project);

        if (!isTv && !isStreaming) {
          const earnings = (project.metrics as any)?.lastWeeklyRevenue ?? 0;
          if (earnings > 0) {
            const boxOfficeEventId = this.triggerBoxOfficeReport(project, earnings, gameState);
            triggeredEvents.push(boxOfficeEventId);
          }
        }
      }
    }

    const absWeek = (gameState.currentYear * 52) + gameState.currentWeek;
    const seedRoot = `media|${gameState.universeSeed ?? 0}|${absWeek}`;

    // Random industry events (keeps the feed from going quiet between major milestones)
    if (stableFloat01(`${seedRoot}|industry-event-chance`) < 0.12 && gameState.talent.length > 0) {
      const randomEventTypes = ['rumor', 'interview', 'exclusive', 'leak', 'rumor', 'interview', 'scandal'] as const;
      const eventType = randomEventTypes[stableInt(`${seedRoot}|industry-event-type`, 0, randomEventTypes.length - 1)];

      // Pick (deterministic) talent for the event
      const talent = gameState.talent[stableInt(`${seedRoot}|industry-event-talent`, 0, gameState.talent.length - 1)];

      const idHash = hashStringToUint32(`${seedRoot}|industry|${eventType}|${talent.id}`).toString(36);

      const eventId = this.queueMediaEvent({
        id: `event_${idHash}`,
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
    if ((gameState.allReleases?.length || 0) > 0) {
      const releasesThisWeek = (gameState.allReleases || [])
        .filter((r): r is Project => (r as any)?.script)
        .filter(p => (p.releaseWeek === gameState.currentWeek && p.releaseYear === gameState.currentYear));

      const competitorCandidates = releasesThisWeek.filter(p =>
        !!p.studioName && p.studioName !== gameState.studio.name
      );

      const candidatePool = competitorCandidates.length > 0 ? competitorCandidates : releasesThisWeek;

      if (candidatePool.length > 0) {
        const project = candidatePool[stableInt(`${seedRoot}|release-coverage-project`, 0, candidatePool.length - 1)];

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

        const idHash = hashStringToUint32(`${seedRoot}|release|${project.id}|${studio?.id || 'none'}`).toString(36);

        const eventId = this.queueMediaEvent({
          id: `event_${idHash}`,
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
      const itemAbsWeek = (mediaItem.publishDate.year * 52) + mediaItem.publishDate.week;
      memory.sentimentHistory = memory.sentimentHistory.filter(entry => {
        const entryAbsWeek = (entry.year * 52) + entry.week;
        return (itemAbsWeek - entryAbsWeek) < 52;
      });

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
