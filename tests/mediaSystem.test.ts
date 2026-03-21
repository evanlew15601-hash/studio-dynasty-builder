import { describe, expect, it, afterEach, vi } from 'vitest';
import { produce } from 'immer';
import { MediaContentGenerator } from '@/data/MediaContentGenerator';
import { MediaEngine } from '@/components/game/MediaEngine';
import { CrisisManagement } from '@/components/game/CrisisManagement';

const makeMinimalTalent = (overrides: any = {}) => ({
  id: 'talent-1',
  name: 'Jamie Star',
  careerStage: 'rising',
  ...overrides,
});

const makeMinimalStudio = (overrides: any = {}) => ({
  id: 'studio-1',
  name: 'Competitor Studios',
  reputation: 50,
  budget: 1000000,
  founded: 2000,
  specialties: ['drama'],
  ...overrides,
});

const makeMinimalProject = (overrides: any = {}) => ({
  id: 'project-1',
  title: 'The Big Premiere',
  script: {
    id: 'script-1',
    title: 'The Big Premiere',
    genre: 'action',
    logline: 'Test',
    writer: 'Test',
    pages: 100,
    quality: 50,
    budget: 10000000,
    developmentStage: 'final',
    themes: [],
    targetAudience: 'general',
    estimatedRuntime: 120,
    characteristics: {
      tone: 'balanced',
      pacing: 'steady',
      dialogue: 'naturalistic',
      visualStyle: 'realistic',
      commercialAppeal: 5,
      criticalPotential: 5,
      cgiIntensity: 'minimal'
    }
  },
  budget: {
    total: 10000000,
    allocated: {},
    spent: {},
    overages: {}
  },
  studioName: 'Competitor Studios',
  cast: [{ talentId: 'talent-1' }],
  ...overrides,
});

describe('media system', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    MediaEngine.cleanup();
    CrisisManagement.cleanup();
  });

  it('can round-trip persisted media engine state (save/load) without changing outcomes', () => {
    const playerStudio = { id: 'player-studio', name: 'Player Studio', reputation: 50, budget: 1000000, founded: 2025, specialties: ['drama'] };
    const playerProject = makeMinimalProject({
      id: 'player-project-1',
      title: 'Player Premiere',
      studioName: playerStudio.name,
      releaseWeek: 1,
      releaseYear: 2025,
      cast: [{ talentId: 'talent-1' }]
    });

    const gameState: any = {
      studio: playerStudio,
      currentWeek: 1,
      currentYear: 2025,
      projects: [playerProject],
      talent: [makeMinimalTalent()],
      competitorStudios: [],
      allReleases: [],
      aiStudioProjects: [],
    };

    MediaEngine.queueMediaEvent({
      type: 'release',
      triggerType: 'automatic',
      priority: 'low',
      entities: {
        studios: [playerStudio.id],
        projects: [playerProject.id],
        talent: ['talent-1']
      },
      eventData: { project: playerProject },
      week: 1,
      year: 2025
    } as any);

    const firstPass = MediaEngine.processMediaEvents(gameState);
    expect(firstPass.length).toBe(1);

    const beforeMemory = MediaEngine.getMediaMemory(playerStudio.id);
    expect(beforeMemory).toBeTruthy();

    const persisted = { engine: MediaEngine.snapshot(), response: { campaigns: [], reactions: [] } } as any;

    MediaEngine.cleanup();
    MediaEngine.hydrate(persisted);

    const afterMemory = MediaEngine.getMediaMemory(playerStudio.id);
    expect(afterMemory?.currentBuzz).toBe(beforeMemory?.currentBuzz);

    // Reprocessing the same week should not regenerate items (events are already marked processed).
    const secondPass = MediaEngine.processMediaEvents(gameState);
    expect(secondPass.length).toBe(0);
  });

  it('can hydrate from an Immer draft without retaining revoked proxies', () => {
    const playerStudio = { id: 'player-studio', name: 'Player Studio', reputation: 50, budget: 1000000, founded: 2025, specialties: ['drama'] };
    const playerProject = makeMinimalProject({
      id: 'player-project-1',
      title: 'Player Premiere',
      studioName: playerStudio.name,
      releaseWeek: 1,
      releaseYear: 2025,
      cast: [{ talentId: 'talent-1' }]
    });

    const gameState: any = {
      studio: playerStudio,
      currentWeek: 1,
      currentYear: 2025,
      projects: [playerProject],
      talent: [makeMinimalTalent()],
      competitorStudios: [],
      allReleases: [],
      aiStudioProjects: [],
    };

    MediaEngine.queueMediaEvent({
      type: 'release',
      triggerType: 'automatic',
      priority: 'low',
      entities: {
        studios: [playerStudio.id],
        projects: [playerProject.id],
        talent: ['talent-1']
      },
      eventData: { project: playerProject },
      week: 1,
      year: 2025
    } as any);

    const firstPass = MediaEngine.processMediaEvents(gameState);
    expect(firstPass.length).toBe(1);

    const persisted = { engine: MediaEngine.snapshot(), response: { campaigns: [], reactions: [] } } as any;

    MediaEngine.cleanup();

    produce(persisted, (draft) => {
      MediaEngine.hydrate(draft as any);
    });

    const memory = MediaEngine.getMediaMemory(playerStudio.id);
    expect(memory).toBeTruthy();

    // Access nested props to ensure we didn't retain Immer draft proxies.
    const firstSentiment = memory?.sentimentHistory?.[0]?.sentiment;
    expect(firstSentiment).toBeTruthy();
  });

  it('does not leak raw {Placeholders} when event lacks a project/studio', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const event: any = {
      id: 'event-1',
      type: 'rumor',
      triggerType: 'random',
      priority: 'low',
      entities: { talent: ['talent-1'] },
      eventData: {},
      week: 1,
      year: 2025,
      processed: false,
    };

    const entities: any = {
      talent: [makeMinimalTalent()],
      studios: [],
      projects: [],
    };

    const item = MediaContentGenerator.generateMediaItem(event, entities);

    expect(item.headline).not.toMatch(/\{[A-Za-z]+\}/);
    expect(item.content).not.toMatch(/\{[A-Za-z]+\}/);
  });

  it('resolves player studio/projects when generating media (player stories)', () => {

    const playerStudio = { id: 'player-studio', name: 'Player Studio', reputation: 50, budget: 1000000, founded: 2025, specialties: ['drama'] };
    const playerProject = makeMinimalProject({
      id: 'player-project-1',
      title: 'Player Premiere',
      studioName: playerStudio.name,
      releaseWeek: 1,
      releaseYear: 2025,
      cast: [{ talentId: 'talent-1' }]
    });

    const gameState: any = {
      studio: playerStudio,
      currentWeek: 1,
      currentYear: 2025,
      projects: [playerProject],
      talent: [makeMinimalTalent()],
      competitorStudios: [],
      allReleases: [],
      aiStudioProjects: [],
    };

    MediaEngine.queueMediaEvent({
      type: 'release',
      triggerType: 'automatic',
      priority: 'low',
      entities: {
        studios: [playerStudio.id],
        projects: [playerProject.id],
        talent: ['talent-1']
      },
      eventData: { project: playerProject },
      week: 1,
      year: 2025
    } as any);

    const items = MediaEngine.processMediaEvents(gameState);
    expect(items.length).toBe(1);
    const combined = `${items[0].headline} ${items[0].content}`;
    expect(combined).toContain(playerProject.title);
    expect(combined).not.toMatch(/\{[A-Za-z]+\}/);
  });

  it('resolves competitor studios/projects when generating media (non-player stories)', () => {

    const competitorStudio = makeMinimalStudio({ id: 'studio-competitor', name: 'Crimson Peak Entertainment' });
    const competitorProject = makeMinimalProject({
      id: 'ai-project-1',
      title: 'Midnight Storm',
      studioName: competitorStudio.name,
      releaseWeek: 1,
      releaseYear: 2025,
      cast: [{ talentId: 'talent-1' }]
    });

    const gameState: any = {
      studio: { id: 'player-studio', name: 'Player Studio', reputation: 50, budget: 1000000, founded: 2025, specialties: ['drama'] },
      currentWeek: 1,
      currentYear: 2025,
      projects: [],
      talent: [makeMinimalTalent()],
      competitorStudios: [competitorStudio],
      allReleases: [competitorProject],
      aiStudioProjects: [],
    };

    MediaEngine.queueMediaEvent({
      type: 'release',
      triggerType: 'competitor_action',
      priority: 'low',
      entities: {
        studios: [competitorStudio.id],
        projects: [competitorProject.id],
        talent: ['talent-1']
      },
      eventData: { project: competitorProject },
      week: 1,
      year: 2025
    } as any);

    const items = MediaEngine.processMediaEvents(gameState);
    expect(items.length).toBe(1);
    const combined = `${items[0].headline} ${items[0].content}`;
    expect(combined).toContain(competitorProject.title);
    expect(combined).not.toMatch(/\{[A-Za-z]+\}/);
  });

  it('generates award nomination stories without placeholder leaks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);

    const competitorStudio = makeMinimalStudio({ id: 'studio-competitor', name: 'Crimson Peak Entertainment' });
    const competitorProject = makeMinimalProject({
      id: 'ai-project-1',
      title: 'Midnight Storm',
      studioName: competitorStudio.name,
      releaseWeek: 1,
      releaseYear: 2025,
      cast: [{ talentId: 'talent-1' }]
    });

    const gameState: any = {
      studio: { id: 'player-studio', name: 'Player Studio', reputation: 50, budget: 1000000, founded: 2025, specialties: ['drama'] },
      currentWeek: 1,
      currentYear: 2025,
      projects: [],
      talent: [makeMinimalTalent()],
      competitorStudios: [competitorStudio],
      allReleases: [competitorProject],
      aiStudioProjects: [],
    };

    MediaEngine.queueMediaEvent({
      type: 'award_nomination',
      triggerType: 'automatic',
      priority: 'medium',
      entities: {
        studios: [competitorStudio.id],
        projects: [competitorProject.id],
        talent: ['talent-1']
      },
      eventData: { project: competitorProject, awardName: 'Crystal Ring - Best Film' },
      week: 1,
      year: 2025
    } as any);

    const items = MediaEngine.processMediaEvents(gameState);
    expect(items.length).toBe(1);

    const combined = `${items[0].headline} ${items[0].content}`;
    expect(combined).toContain('Crystal Ring');
    expect(combined).not.toMatch(/\{[A-Za-z]+\}/);
  });

  it('generates box office bomb stories and includes critics/audience context', () => {

    const playerStudio = { id: 'player-studio', name: 'Player Studio', reputation: 50, budget: 1000000, founded: 2025, specialties: ['drama'] };
    const playerProject = makeMinimalProject({
      id: 'player-project-1',
      title: 'Player Premiere',
      studioName: playerStudio.name,
      metrics: { criticsScore: 52, audienceScore: 49 }
    });

    const gameState: any = {
      studio: playerStudio,
      currentWeek: 1,
      currentYear: 2025,
      projects: [playerProject],
      talent: [makeMinimalTalent()],
      competitorStudios: [],
      allReleases: [],
      aiStudioProjects: [],
    };

    MediaEngine.queueMediaEvent({
      type: 'box_office',
      triggerType: 'automatic',
      priority: 'high',
      entities: { studios: [playerStudio.id], projects: [playerProject.id] },
      eventData: { project: playerProject, earnings: 500_000 },
      week: 1,
      year: 2025
    } as any);

    const items = MediaEngine.processMediaEvents(gameState);
    expect(items.length).toBe(1);

    const combined = `${items[0].headline} ${items[0].content}`;
    expect(items[0].tags).toContain('bomb');
    expect(combined).toContain('52/100');
    expect(combined).toContain('49/100');
    expect(combined).not.toMatch(/\{[A-Za-z]+\}/);
  });

  it('generates box office hit stories and includes critics/audience context', () => {

    const playerStudio = { id: 'player-studio', name: 'Player Studio', reputation: 50, budget: 1000000, founded: 2025, specialties: ['drama'] };
    const playerProject = makeMinimalProject({
      id: 'player-project-1',
      title: 'Player Premiere',
      studioName: playerStudio.name,
      budget: { total: 20_000_000, allocated: {}, spent: {}, overages: {} },
      metrics: { criticsScore: 91, audienceScore: 88 }
    });

    const gameState: any = {
      studio: playerStudio,
      currentWeek: 1,
      currentYear: 2025,
      projects: [playerProject],
      talent: [makeMinimalTalent()],
      competitorStudios: [],
      allReleases: [],
      aiStudioProjects: [],
    };

    MediaEngine.queueMediaEvent({
      type: 'box_office',
      triggerType: 'automatic',
      priority: 'high',
      entities: { studios: [playerStudio.id], projects: [playerProject.id] },
      eventData: { project: playerProject, earnings: 12_000_000 },
      week: 1,
      year: 2025
    } as any);

    const items = MediaEngine.processMediaEvents(gameState);
    expect(items.length).toBe(1);

    const combined = `${items[0].headline} ${items[0].content}`;
    expect(items[0].tags).toContain('hit');
    expect(combined).toContain('91/100');
    expect(combined).toContain('88/100');
    expect(combined).not.toMatch(/\{[A-Za-z]+\}/);
  });

  it('generates leak stories from leak crises without placeholder leaks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);

    const playerStudio = { id: 'player-studio', name: 'Player Studio', reputation: 50, budget: 1000000, founded: 2025, specialties: ['drama'] };
    const playerProject = makeMinimalProject({
      id: 'player-project-1',
      title: 'Player Premiere',
      studioName: playerStudio.name,
      cast: [{ talentId: 'talent-1' }]
    });

    const gameState: any = {
      studio: playerStudio,
      currentWeek: 1,
      currentYear: 2025,
      projects: [playerProject],
      talent: [makeMinimalTalent()],
      competitorStudios: [],
      allReleases: [],
      aiStudioProjects: [],
    };

    CrisisManagement.triggerCrisis(gameState, 'leak');

    const items = MediaEngine.processMediaEvents(gameState);
    expect(items.length).toBe(1);
    expect(items[0].type).toBe('leak');
    expect(items[0].headline).not.toMatch(/\{[A-Za-z]+\}/);
    expect(items[0].content).not.toMatch(/\{[A-Za-z]+\}/);
  });
});
