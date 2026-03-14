import { describe, expect, it } from 'vitest';
import type { ModBundle } from '@/types/modding';
import { getEffectiveParodyCharacterNameMap } from '@/data/ParodyCharacterNames';

describe('Parody character names modding', () => {
  it('deep-merges partial updates instead of wiping existing mappings', () => {
    const mods: ModBundle = {
      version: 1,
      mods: [{ id: 'm1', name: 'Names', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'p1',
          modId: 'm1',
          entityType: 'parodyCharacterNames',
          op: 'update',
          target: 'Star Saga',
          payload: {
            byCharacterId: {
              char_hero_pilot: 'Luke Patchwalker',
            },
          },
        },
      ],
    };

    const map = getEffectiveParodyCharacterNameMap(mods);

    expect(map['Star Saga']?.byCharacterId?.char_hero_pilot).toBe('Luke Patchwalker');
    expect(map['Star Saga']?.byTemplateId?.lead_hero).toBe('Luke Starwalker');
  });

  it('supports deleting keys via null markers in patch payloads', () => {
    const mods: ModBundle = {
      version: 1,
      mods: [{ id: 'm1', name: 'Names', version: '1.0.0', enabled: true, priority: 0 }],
      patches: [
        {
          id: 'p1',
          modId: 'm1',
          entityType: 'parodyCharacterNames',
          op: 'update',
          target: 'Star Saga',
          payload: {
            byTemplateId: {
              lead_hero: null,
            },
          } as any,
        },
      ],
    };

    const map = getEffectiveParodyCharacterNameMap(mods);

    expect(map['Star Saga']?.byTemplateId?.lead_hero).toBeUndefined();
    expect(map['Star Saga']?.byTemplateId?.mentor_mystic).toBe('Obi-Juan Kenobi');
  });
});
