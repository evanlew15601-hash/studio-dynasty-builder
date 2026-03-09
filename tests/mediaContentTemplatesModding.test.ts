import { describe, expect, it, vi } from 'vitest';
import { MediaContentGenerator } from '@/data/MediaContentGenerator';
import type { ModBundle } from '@/types/modding';

describe('media content templates modding', () => {
  it('applies mediaHeadlineTemplates and mediaContentTemplates patches by event type', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const mods: ModBundle = {
      version: 1,
      mods: [{ id: 'my-mod', name: 'my-mod', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'p-headlines',
          modId: 'my-mod',
          entityType: 'mediaHeadlineTemplates',
          op: 'update',
          target: 'release',
          payload: ['MODDED: {StudioName} releases {FilmTitle}'],
        },
        {
          id: 'p-content',
          modId: 'my-mod',
          entityType: 'mediaContentTemplates',
          op: 'update',
          target: 'release',
          payload: ['CONTENT: {FilmTitle} by {StudioName}'],
        },
      ],
    };

    const event: any = {
      id: 'event-1',
      type: 'release',
      triggerType: 'automatic',
      priority: 'low',
      entities: { studios: ['studio-1'], projects: ['project-1'], talent: ['talent-1'] },
      eventData: {},
      week: 1,
      year: 2025,
      processed: false,
    };

    const entities: any = {
      studios: [{ id: 'studio-1', name: 'Player Studio' }],
      projects: [{ id: 'project-1', title: 'Player Premiere', studioName: 'Player Studio', script: { genre: 'action', budget: 10000000 } }],
      talent: [{ id: 'talent-1', name: 'Jamie Star', careerStage: 'rising' }],
    };

    const item = MediaContentGenerator.generateMediaItem(event, entities, mods);

    expect(item.headline).toContain('MODDED:');
    expect(item.headline).toContain('Player Studio');
    expect(item.headline).toContain('Player Premiere');

    expect(item.content).toContain('CONTENT:');
    expect(item.content).toContain('Player Studio');
    expect(item.content).toContain('Player Premiere');
  });
});
