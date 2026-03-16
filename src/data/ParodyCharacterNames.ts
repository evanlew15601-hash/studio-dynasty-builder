// Mapping from parody source to canonical character names for imports
// This enhances franchise role imports to use recognizable character names

import type { ModBundle } from '@/types/modding';
import { applyPatchesToRecord, getPatchesForEntity } from '@/utils/modding';
import { getModBundle } from '@/utils/moddingStore';

export type ParodyCharacterNameMapEntry = {
  byCharacterId?: Record<string, string>;
  byTemplateId?: Record<string, string>;
};

export const PARODY_CHARACTER_NAME_MAP: Record<string, ParodyCharacterNameMapEntry> = {
  'Star Saga': {
    byCharacterId: {
      'char_hero_pilot': 'Luke Starwalker',
      'char_wise_mentor': 'Obi-Juan Kendar',
      'char_director': 'Director'
    },
    byTemplateId: {
      'lead_hero': 'Luke Starwalker',
      'mentor_mystic': 'Obi-Juan Kendar',
      'director': 'Director'
    }
  },
  'Blade Chaser': {
    byCharacterId: {
      'char_detective': 'Rick Decker',
      'char_director': 'Director'
    },
    byTemplateId: {
      'lead_detective': 'Rick Decker',
      'director': 'Director'
    }
  },
  'Voidborne': {
    byTemplateId: {
      'lead_hero': 'Ellen Riley',
      'director': 'Director'
    }
  },
  'Rings of Destiny': {
    byTemplateId: {
      'lead_hero': 'Frodo Bagsworth',
      'mentor_mystic': 'Gandor',
      'director': 'Director'
    }
  },
  'Wizard Academy': {
    byTemplateId: {
      'young_wizard': 'Harlan Wandsmith',
      'mentor_mystic': 'Alden Brambleton',
      'dark_wizard': 'Lord Malvermoor',
      'best_friend': 'Ron Wexley',
      'director': 'Director'
    }
  },
  'The Family Boss': {
    byTemplateId: {
      'patriarch': 'Vito Corvelli',
      'heir': 'Michael Corvelli',
      'advisor': 'Tom Harlan',
      'director': 'Director'
    }
  },
  'Fast Lane': {
    byTemplateId: {
      'street_racer': 'Dominic Torrenti',
      'agent': 'Lucas Hobson',
      'director': 'Director'
    }
  },
  'Mission Critical': {
    byTemplateId: {
      'spy_lead': 'Evan Hunter',
      'director': 'Director'
    }
  },
  'Hero Collective Universe': {
    byTemplateId: {
      'team_leader': 'Stefan Robertson',
      'billionaire_genius': 'Toby Starkman',
      'demigod': 'Thoren',
      'dark_knight': 'Bruno Wayne',
      'director': 'Director'
    }
  },
  'Nightmare Street': {
    byTemplateId: {
      'slasher_icon': 'Freddy Kregman',
      'final_girl': 'Nora Thorne',
      'director': 'Director'
    }
  },
  'Hallow Night': {
    byTemplateId: {
      'slasher_icon': 'Mason Myer',
      'final_girl': 'Laura Strider',
      'director': 'Director'
    }
  },
  'College Chaos': {
    byTemplateId: {
      'awkward_teen': 'Jim Livingstone',
      'best_friend': 'Kevin Myles',
      'director': 'Director'
    }
  }
};

export function getEffectiveParodyCharacterNameMap(mods?: ModBundle): Record<string, ParodyCharacterNameMapEntry> {
  const bundle = mods ?? getModBundle();
  const patches = getPatchesForEntity(bundle, 'parodyCharacterNames');
  return applyPatchesToRecord(PARODY_CHARACTER_NAME_MAP, patches);
}
