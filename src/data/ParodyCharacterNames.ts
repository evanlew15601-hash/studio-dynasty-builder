// Mapping from parody source to canonical character names for imports
// This enhances franchise role imports to use recognizable character names

export const PARODY_CHARACTER_NAME_MAP: Record<string, {
  byCharacterId?: Record<string, string>;
  byTemplateId?: Record<string, string>;
}> = {
  'Star Wars': {
    byCharacterId: {
      'char_hero_pilot': 'Luke Skywalker',
      'char_wise_mentor': 'Obi-Wan Kenobi',
      'char_director': 'Director'
    },
    byTemplateId: {
      'lead_hero': 'Luke Skywalker',
      'mentor_mystic': 'Obi-Wan Kenobi',
      'director': 'Director'
    }
  },
  'Blade Runner': {
    byCharacterId: {
      'char_detective': 'Rick Deckard',
      'char_director': 'Director'
    },
    byTemplateId: {
      'lead_detective': 'Rick Deckard',
      'director': 'Director'
    }
  },
  'Alien': {
    byTemplateId: {
      'lead_hero': 'Ellen Ripley',
      'director': 'Director'
    }
  },
  'Lord of the Rings': {
    byTemplateId: {
      'lead_hero': 'Frodo Baggins',
      'mentor_mystic': 'Gandalf',
      'director': 'Director'
    }
  },
  'Harry Potter': {
    byTemplateId: {
      'young_wizard': 'Harry Potter',
      'mentor_mystic': 'Albus Dumbledore',
      'dark_wizard': 'Lord Voldemort',
      'best_friend': 'Ron Weasley',
      'director': 'Director'
    }
  },
  'The Godfather': {
    byTemplateId: {
      'patriarch': 'Vito Corleone',
      'heir': 'Michael Corleone',
      'advisor': 'Tom Hagen',
      'director': 'Director'
    }
  },
  'Fast & Furious': {
    byTemplateId: {
      'street_racer': 'Dominic Toretto',
      'agent': 'Luke Hobbs',
      'director': 'Director'
    }
  },
  'Mission: Impossible': {
    byTemplateId: {
      'spy_lead': 'Ethan Hunt',
      'director': 'Director'
    }
  },
  'Marvel/DC Superhero Universe': {
    byTemplateId: {
      'team_leader': 'Steve Rogers',
      'billionaire_genius': 'Tony Stark',
      'demigod': 'Thor',
      'dark_knight': 'Bruce Wayne',
      'director': 'Director'
    }
  },
  'A Nightmare on Elm Street': {
    byTemplateId: {
      'slasher_icon': 'Freddy Krueger',
      'final_girl': 'Nancy Thompson',
      'director': 'Director'
    }
  },
  'Halloween': {
    byTemplateId: {
      'slasher_icon': 'Michael Myers',
      'final_girl': 'Laurie Strode',
      'director': 'Director'
    }
  },
  'American Pie': {
    byTemplateId: {
      'awkward_teen': 'Jim Levenstein',
      'best_friend': 'Kevin Myers',
      'director': 'Director'
    }
  }
};
