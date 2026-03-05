import { describe, expect, it, afterEach, vi } from 'vitest';
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
    // Pick templates that include {StudioName} in both headline/content
    vi.spyOn(Math, 'random').mockReturnValue(0.45);

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
    expect(items[0].headline).toContain(playerStudio.name);
    expect(items[0].headline).toContain(playerProject.title);
    expect(items[0].headline).not.toMatch(/\{[A-Za-z]+\}/);
    expect(items[0].content).not.toMatch(/\{[A-Za-z]+\}/);
  });

  it('resolves competitor studios/projects when generating media (non-player stories)', () => {
    // Pick templates that include {StudioName} in both headline/content
    vi.spyOn(Math, 'random').mockReturnValue(0.45);

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
    expect(items[0].headline).toContain(competitorStudio.name);
    expect(items[0].headline).not.toMatch(/\{[A-Za-z]+\}/);
    expect(items[0].content).not.toMatch(/\{[A-Za-z]+\}/);
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
    // Force first headline/content templates
    vi.spyOn(Math, 'random').mockReturnValue(0);

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
    expect(combined).toContain('box office bomb');
    expect(combined).toContain('52/100');
    expect(combined).toContain('49/100');
    expect(combined).not.toMatch(/\{[A-Za-z]+\}/);
  });

  it('generates box office hit stories and includes critics/audience context', () => {
    // Force first headline/content templates
    vi.spyOn(Math, 'random').mockReturnValue(0);

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
    expect(combined).toContain('breakout hit');
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
