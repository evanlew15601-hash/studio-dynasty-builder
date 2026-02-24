// Mapping from parody source to canonical character names for imports
// This enhances franchise role imports to use recognizable character names

export const PARODY_CHARACTER_NAME_MAP: Record<string, {
  byCharacterId?: Record<string, string>;
  byTemplateId?: Record<string, string>;
}> = {
  'Star Wars': {
    byCharacterId: {
      char_hero_pilot: 'Luke Starwalker',
      char_wise_mentor: 'Obi-Juan Kenobi',
      char_rogue_smuggler: 'Han Solo-ish',
      char_princess_general: 'Leia Organa-ish',
      char_masked_enforcer: 'Darth Invader',
      char_sassy_droid: 'C-3P-Oh No',
      char_director: 'Director',
    },
    byTemplateId: {
      lead_hero: 'Luke Starwalker',
      mentor_mystic: 'Obi-Juan Kenobi',
      director: 'Director',
    },
  },
  'Blade Runner': {
    byCharacterId: {
      char_detective: 'Rick Decker',
      char_runaway_synth: 'Roy Battery',
      char_corp_heir: 'Wallace Jr-ish',
      char_director: 'Director',
    },
    byTemplateId: {
      lead_detective: 'Rick Decker',
      director: 'Director',
    },
  },
  'Alien': {
    byTemplateId: {
      space_survivor: 'Ellen Riley',
      mysterious_android: 'Ash-ley',
      director: 'Director',
    },
  },
  'Star Trek': {
    byTemplateId: {
      captain: 'Captain Kirk-ish',
      first_officer: 'Commander Spork',
      engineer: 'Scotty-McFixit',
      director: 'Director',
    },
  },
  'The Matrix': {
    byTemplateId: {
      chosen_hacker: 'Neo-Like',
      mysterious_mentor: 'Morpheus-ish',
      leather_fighter: 'Trinity-ish',
      agent: 'Agent Smithy',
      director: 'Director',
    },
  },
  'Terminator': {
    byTemplateId: {
      future_target: 'Sarah Connor-ish',
      killer_machine: 'T-8000-ish',
      director: 'Director',
    },
  },
  'Lord of the Rings': {
    byTemplateId: {
      ring_bearer: 'Frodo Bagsworth',
      mentor_mystic: 'Gandor',
      dark_lord: 'Sauron-None',
      director: 'Director',
    },
  },
  'Harry Potter': {
    byTemplateId: {
      young_wizard: 'Harry Potter-Smith',
      mentor_mystic: 'Albus Dumbleton',
      dark_wizard: 'Lord Voldermore',
      best_friend: 'Ron Weaselby',
      director: 'Director',
    },
  },
  'Game of Thrones': {
    byTemplateId: {
      throne_claimant: 'Daenerys-ish',
      advisor: 'Tyrion-ish',
      dragon_rider: 'Dragon Budget-Owner',
      director: 'Director',
    },
  },
  'The Witcher': {
    byTemplateId: {
      monster_hunter: 'Gerald of Rivia-ish',
      sorceress: 'Yen-Again',
      bard: 'Jaskier-ish',
      director: 'Director',
    },
  },
  'Marvel/DC Superhero Universe': {
    byTemplateId: {
      team_leader: 'Steve Robertson',
      billionaire_genius: 'Tony Starks',
      demigod: 'Thorsen',
      dark_knight: 'Bruce Waynes',
      director: 'Director',
    },
  },
  'Batman': {
    byTemplateId: {
      dark_knight: 'Bruce Waynes',
      clown_villain: 'The Jokester',
      director: 'Director',
    },
  },
  'A Nightmare on Elm Street': {
    byTemplateId: {
      slasher_icon: 'Freddy Kruger',
      final_girl: 'Nancy Thomson',
      director: 'Director',
    },
  },
  'Halloween': {
    byTemplateId: {
      slasher_icon: 'Michael Meyer',
      final_girl: 'Laurie Stride',
      director: 'Director',
    },
  },
  'Friday the 13th': {
    byTemplateId: {
      slasher_icon: 'Jason Voorhees-ish',
      final_girl: 'Camp Counselor #1',
      director: 'Director',
    },
  },
  'Fast & Furious': {
    byTemplateId: {
      street_racer: 'Dominic Torretti',
      tech: 'Techi McWrench',
      director: 'Director',
    },
  },
  'Mission: Impossible': {
    byTemplateId: {
      spy_lead: 'Ethan Hunter',
      director: 'Director',
    },
  },
  'James Bond': {
    byTemplateId: {
      spy_lead: 'Agent Double-Zeroish',
      quartermaster: 'Q-ish',
      director: 'Director',
    },
  },
  'Indiana Jones': {
    byTemplateId: {
      adventure_prof: 'Indy-ish',
      director: 'Director',
    },
  },
  'Pirates of the Caribbean': {
    byTemplateId: {
      pirate_captain: 'Captain Jack-ish',
      director: 'Director',
    },
  },
  'Jurassic Park': {
    byTemplateId: {
      scientist: 'Dr. Grant-ish',
      park_ceo: 'Mr. Spare-No-Expense',
      director: 'Director',
    },
  },
  'Transformers': {
    byTemplateId: {
      noble_robot: 'Optimus-ish',
      tyrant_robot: 'Mega-tron-ish',
      director: 'Director',
    },
  },
  'The Hunger Games': {
    byTemplateId: {
      rebel_lead: 'Katniss-ish',
      mentor: 'Haymitch-ish',
      director: 'Director',
    },
  },
  'Twilight': {
    byTemplateId: {
      teen_lead: 'Bella-ish',
      vampire_love: 'Edward-ish',
      werewolf_love: 'Jacob-ish',
      director: 'Director',
    },
  },
  'American Pie': {
    byTemplateId: {
      awkward_teen: 'Jim Livingston',
      best_friend: 'Kevin Myer',
      director: 'Director',
    },
  },
  'The Godfather': {
    byTemplateId: {
      patriarch: 'Vito Corelli',
      heir: 'Michael Corelli',
      advisor: 'Tom Hagan',
      director: 'Director',
    },
  },
};
