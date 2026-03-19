import { describe, expect, it, afterEach } from 'vitest';
import { MediaEngine } from '@/components/game/MediaEngine';
import { MediaResponseSystem } from '@/components/game/MediaResponseSystem';

const makeMinimalStudio = (overrides: any = {}) => ({
  id: 'studio-1',
  name: 'Player Studio',
  reputation: 50,
  budget: 10_000_000,
  founded: 2025,
  specialties: ['drama'],
  ...overrides,
});

describe('media response system determinism', () => {
  afterEach(() => {
    MediaEngine.cleanup();
    MediaResponseSystem.cleanup();
  });

  it('persists campaign ID counter across snapshot/hydrate', () => {
    const studio = makeMinimalStudio();

    const gameState: any = {
      universeSeed: 123,
      studio,
      currentWeek: 1,
      currentYear: 2025,
      talent: [],
      projects: [],
      competitorStudios: [],
      allReleases: [],
      aiStudioProjects: [],
    };

    MediaEngine.hydrate({ engine: { history: [], memories: [], eventQueue: [] }, response: { campaigns: [], reactions: [] } } as any);
    MediaResponseSystem.hydrate({ engine: { history: [], memories: [], eventQueue: [] }, response: { campaigns: [], reactions: [] } } as any);

    const c1 = MediaResponseSystem.createPRCampaign(
      studio.id,
      'First Push',
      'pr_boost',
      { studios: [studio.id] },
      1_000_000,
      4,
      gameState
    );

    expect(c1.id).toBe('campaign_1');

    const snapshot = MediaResponseSystem.snapshot();
    expect(snapshot.nextCampaignId).toBe(2);

    MediaResponseSystem.cleanup();
    MediaResponseSystem.hydrate({ engine: { history: [], memories: [], eventQueue: [] }, response: snapshot } as any);

    const c2 = MediaResponseSystem.createPRCampaign(
      studio.id,
      'Second Push',
      'pr_boost',
      { studios: [studio.id] },
      1_000_000,
      4,
      gameState
    );

    expect(c2.id).toBe('campaign_2');
    expect(MediaResponseSystem.snapshot().nextCampaignId).toBe(3);
  });
});
