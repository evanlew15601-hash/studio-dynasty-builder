import { describe, expect, it } from 'vitest';
import { MediaSourceGenerator } from '@/data/MediaSourceGenerator';
import type { ModBundle } from '@/types/modding';

describe('Media sources modding', () => {
  it('applies mediaSource patches by id', () => {
    const base = MediaSourceGenerator.getBaseMediaSources().find((s) => s.id === 'source_1');
    expect(base).toBeTruthy();

    const bundle: ModBundle = {
      version: 1,
      mods: [{ id: 'test', name: 'test', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'mediaSource:test:source_1',
          modId: 'test',
          entityType: 'mediaSource',
          op: 'update',
          target: 'source_1',
          payload: { name: 'Patched Source', credibility: 99 },
        },
      ],
    };

    const patched = MediaSourceGenerator.generateMediaSources(bundle).find((s) => s.id === 'source_1');
    expect(patched?.name).toBe('Patched Source');
    expect(patched?.credibility).toBe(99);
  });
});
