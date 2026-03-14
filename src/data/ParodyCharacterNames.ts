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
      'char_wise_mentor': 'Obi-Juan Kenobi',
      'char_director': 'Director'
    },
    byTemplateId: {
      'lead_hero': 'Luke Starwalker',
      'mentor_mystic': 'Obi-Juan Kenobi',
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
  'Deep Space Horror': {
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
      'young_wizard': 'Harry Plotter-Smith',
      'mentor_mystic': 'Albus Dumbleton',
      'dark_wizard': 'Lord Voldermore',
      'best_friend': 'Ron Weaselby',
      'director': 'Director'
    }
  },
  'The Family Boss': {
    byTemplateId: {
      'patriarch': 'Vito Corelli',
      'heir': 'Michael Corelli',
      'advisor': 'Tom Hagan',
      'director': 'Director'
    }
  },
  'Fast Lane': {
    byTemplateId: {
      'street_racer': 'Dominic Torrelly',
      'agent': 'Luke Hobson',
      'director': 'Director'
    }
  },
  'Mission Critical': {
    byTemplateId: {
      'spy_lead': 'Ethan Hunter',
      'director': 'Director'
    }
  },
  'Hero Collective Universe': {
    byTemplateId: {
      'team_leader': 'Steve Robertson',
      'billionaire_genius': 'Tony Starks',
      'demigod': 'Thorsen',
      'dark_knight': 'Bruce Waynes',
      'director': 'Director'
    }
  },
  'Nightmare Street': {
    byTemplateId: {
      'slasher_icon': 'Freddy Krugman',
      'final_girl': 'Nancy Thomsen',
      'director': 'Director'
    }
  },
  'Hallow Night': {
    byTemplateId: {
      'slasher_icon': 'Michael Myer',
      'final_girl': 'Laurie Strider',
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
