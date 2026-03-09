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

  it('supports inserting new studio profiles', () => {
    const bundle: ModBundle = {
      version: 1,
      mods: [{ id: 'test', name: 'test', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'studioProfile:test:Custom Studio 1',
          modId: 'test',
          entityType: 'studioProfile',
          op: 'insert',
          target: 'Custom Studio 1',
          payload: {
            name: 'Custom Studio 1',
            personality: 'Custom studio profile',
            budget: 50000000,
            reputation: 50,
            specialties: [],
            businessTendency: 'Custom studio business tendency',
            riskTolerance: 'moderate',
            releaseFrequency: 6,
            brandIdentity: 'Custom studio identity',
            biography: 'Custom studio biography',
          },
        },
      ],
    };

    const patched = getEffectiveStudioProfiles(bundle).find((s) => s.name === 'Custom Studio 1');
    expect(patched).toBeTruthy();
    expect(patched?.budget).toBe(50000000);
  });

  it('supports deleting base studio profiles', () => {
    const target = 'Golden Horizon Studios';
    expect(STUDIO_PROFILES.find((s) => s.name === target)).toBeTruthy();

    const bundle: ModBundle = {
      version: 1,
      mods: [{ id: 'test', name: 'test', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: `studioProfile:test:${target}`,
          modId: 'test',
          entityType: 'studioProfile',
          op: 'delete',
          target,
        },
      ],
    };

    const patched = getEffectiveStudioProfiles(bundle);
    expect(patched.find((s) => s.name === target)).toBeFalsy();
  });
});
