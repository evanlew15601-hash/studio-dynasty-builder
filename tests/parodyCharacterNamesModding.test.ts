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
          target: 'Star Wars',
          payload: {
            byCharacterId: {
              char_hero_pilot: 'Luke Patchwalker',
            },
          },
        },
      ],
    };

    const map = getEffectiveParodyCharacterNameMap(mods);

    expect(map['Star Wars']?.byCharacterId?.char_hero_pilot).toBe('Luke Patchwalker');
    expect(map['Star Wars']?.byTemplateId?.lead_hero).toBe('Luke Starwalker');
  });
});
