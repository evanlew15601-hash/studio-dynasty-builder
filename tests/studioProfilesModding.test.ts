import { describe, expect, it } from 'vitest';
import { getEffectiveStudioProfiles, STUDIO_PROFILES } from '@/data/StudioGenerator';
import type { ModBundle } from '@/types/modding';

describe('Studio profiles modding', () => {
  it('applies studioProfile patches by name', () => {
    const bundle: ModBundle = {
      version: 1,
      mods: [{ id: 'test', name: 'test', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'studioProfile:test:Golden Horizon Studios',
          modId: 'test',
          entityType: 'studioProfile',
          op: 'update',
          target: 'Golden Horizon Studios',
          payload: { budget: 1234567 },
        },
      ],
    };

    const base = STUDIO_PROFILES.find((s) => s.name === 'Golden Horizon Studios');
    expect(base).toBeTruthy();

    const patched = getEffectiveStudioProfiles(bundle).find((s) => s.name === 'Golden Horizon Studios');
    expect(patched?.budget).toBe(1234567);
  });
});
