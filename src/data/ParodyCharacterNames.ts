// Mapping from parody source to canonical character names for imports
// This enhances franchise role imports to use recognizable character names

export const PARODY_CHARACTER_NAME_MAP: Record<string, {
  byCharacterId?: Record<string, string>;
  byTemplateId?: Record<string, string>;
}> = {
  'Star Wars': {
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
  'Blade Runner': {
    byCharacterId: {
      'char_detective': 'Rick Decker',
      'char_director': 'Director'
    },
    byTemplateId: {
      'lead_detective': 'Rick Decker',
      'director': 'Director'
    }
  },
  'Alien': {
    byTemplateId: {
      'lead_hero': 'Ellen Riley',
      'director': 'Director'
    }
  },
  'Lord of the Rings': {
    byTemplateId: {
      'lead_hero': 'Frodo Bagsworth',
      'mentor_mystic': 'Gandor',
      'director': 'Director'
    }
  },
  'Harry Potter': {
    byTemplateId: {
      'young_wizard': 'Harry Potter-Smith',
      'mentor_mystic': 'Albus Dumbleton',
      'dark_wizard': 'Lord Voldermore',
      'best_friend': 'Ron Weaselby',
      'director': 'Director'
    }
  },
  'The Godfather': {
    byTemplateId: {
      'patriarch': 'Vito Corelli',
      'heir': 'Michael Corelli',
      'advisor': 'Tom Hagan',
      'director': 'Director'
    }
  },
  'Fast & Furious': {
    byTemplateId: {
      'street_racer': 'Dominic Torretti',
      'agent': 'Luke Hobson',
      'director': 'Director'
    }
  },
  'Mission: Impossible': {
    byTemplateId: {
      'spy_lead': 'Ethan Hunter',
      'director': 'Director'
    }
  },
  'Marvel/DC Superhero Universe': {
    byTemplateId: {
      'team_leader': 'Steve Robertson',
      'billionaire_genius': 'Tony Starks',
      'demigod': 'Thorsen',
      'dark_knight': 'Bruce Waynes',
      'director': 'Director'
    }
  },
  'A Nightmare on Elm Street': {
    byTemplateId: {
      'slasher_icon': 'Freddy Kruger',
      'final_girl': 'Nancy Thomson',
      'director': 'Director'
    }
  },
  'Halloween': {
    byTemplateId: {
      'slasher_icon': 'Michael Meyer',
      'final_girl': 'Laurie Stride',
      'director': 'Director'
    }
  },
  'American Pie': {
    byTemplateId: {
      'awkward_teen': 'Jim Livingston',
      'best_friend': 'Kevin Myer',
      'director': 'Director'
    }
  }
};
