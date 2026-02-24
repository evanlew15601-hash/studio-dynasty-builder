// Franchise Generation System
import { Franchise, Genre } from '@/types/game';

interface FranchiseTemplate {
  titlePatterns: string[];
  genre: Genre[];
  tone: Franchise['tone'];
  parodySource: string;
  tags: string[];
  culturalWeight: number;
  description: string;
  predefinedRoles?: any[];
}

const FRANCHISE_TEMPLATES: FranchiseTemplate[] = [
  // Sci-Fi Franchises
  {
    titlePatterns: ['Star Enforcers', 'Galactic Guardians', 'Space Riders', 'Quantum Rebels', 'Laser Monks', 'The Twin Suns Saga'],
    genre: ['sci-fi', 'action'],
    tone: 'pulpy',
    parodySource: 'Star Wars',
    tags: ['space', 'laser blades', 'mystic order', 'rebellion', 'evil empire', 'chosen one'],
    culturalWeight: 92,
    description: 'A swashbuckling space opera where farm kids become legends, roguish pilots gamble with their lives, and a mystical order argues about destiny while starships explode in the background.'
  },
  {
    titlePatterns: ['Future Shock', 'Cyber Knights', 'Digital Dawn', 'Neural Network', 'Rain-Slick City', 'Neon Replicants'],
    genre: ['sci-fi', 'thriller'],
    tone: 'dark',
    parodySource: 'Blade Runner',
    tags: ['cyberpunk', 'synthetics', 'noir', 'dystopia', 'corporate conspiracy', 'identity'],
    culturalWeight: 78,
    description: 'Neon-noir detective fiction in a city that never stops raining. A weary hunter chases synthetic runaways and discovers the real mystery is whether "human" is a brand, a feeling, or a receipt.'
  },
  {
    titlePatterns: ['Alien Hunter', 'Cosmic Horror', 'Deep Space', 'Void Walkers', 'Airlock Panic', 'Derelict Signal'],
    genre: ['sci-fi', 'horror'],
    tone: 'dark',
    parodySource: 'Alien',
    tags: ['space horror', 'survival', 'isolation', 'alien threat', 'corporate greed', 'claustrophobic'],
    culturalWeight: 85,
    description: 'A blue-collar crew answers a suspicious distress call and learns the company handbook has a chapter titled "Expendable." Something is loose in the vents and it is not paying rent.'
  },
  {
    titlePatterns: ['Prime Directive', 'Star Explorers', 'The Unity Frontier', 'Warpbound', 'The Strange New Worlds Show'],
    genre: ['sci-fi', 'adventure'],
    tone: 'serious',
    parodySource: 'Star Trek',
    tags: ['starship', 'exploration', 'diplomacy', 'science', 'crew ensemble', 'moral dilemmas'],
    culturalWeight: 90,
    description: 'Optimistic starship adventures where a charismatic captain and a bickering crew try to solve ethical puzzles at light speed, usually minutes before the ship is vaporized (again).'
  },
  {
    titlePatterns: ['The Code Awakens', 'Neon Reality', 'Simulacrum', 'Goggles of Truth', 'Red Pill Weekend'],
    genre: ['sci-fi', 'action'],
    tone: 'dark',
    parodySource: 'The Matrix',
    tags: ['simulation', 'martial arts', 'leather coats', 'reality bending', 'chosen hacker', 'agents'],
    culturalWeight: 88,
    description: 'A philosophical punch-fest where reality is a UI bug. Hackers in long coats dodge bullets, argue about destiny, and crash a digital world maintained by customer support with no escalation path.'
  },
  {
    titlePatterns: ['Tomorrow’s Hunter', 'Steel Salvation', 'Time’s Last Warning', 'Chrono Kill Unit', 'The Future That Hates You'],
    genre: ['sci-fi', 'action'],
    tone: 'serious',
    parodySource: 'Terminator',
    tags: ['time travel', 'killer android', 'human resistance', 'chase thriller', 'apocalypse'],
    culturalWeight: 86,
    description: 'A relentless chase across decades: someone is sent back to prevent the future, someone else is sent back to prevent that, and the audience is sent back to the concession stand for more popcorn.'
  },

  // Fantasy Franchises
  {
    titlePatterns: ['Ring of Destiny', 'Crown Bearers', 'The Last Kingdom', 'Shadow Realm', 'The Long Walk to Doom', 'Songs of Stone and Leaf'],
    genre: ['fantasy', 'adventure'],
    tone: 'epic',
    parodySource: 'Lord of the Rings',
    tags: ['medieval', 'magic', 'quest', 'dark lord', 'fellowship', 'maps', 'endless walking'],
    culturalWeight: 95,
    description: 'A sweeping quest of unlikely heroes, suspicious rings, and an evil presence that is mostly offscreen but somehow still exhausting. Also: mountains, songs, and a lot of walking.'
  },
  {
    titlePatterns: ['Wizard Academy', 'Spell Casters', 'Magic School', 'Arcane Arts', 'Broomstick Varsity', 'Detention in the Dungeon'],
    genre: ['fantasy', 'family'],
    tone: 'light',
    parodySource: 'Harry Potter',
    tags: ['magic school', 'coming of age', 'friendship', 'dark wizard', 'secret houses', 'enchanted sports'],
    culturalWeight: 98,
    description: 'A magical school saga where homework is dangerous, the cafeteria has opinions, and teenagers keep saving the world between exams. A shadowy villain returns every semester like clockwork.'
  },
  {
    titlePatterns: ['Throne of Thorns', 'Kingdoms at War', 'Winter is Punctual', 'The Ironish Seat', 'Banners & Betrayals'],
    genre: ['fantasy', 'drama'],
    tone: 'dark',
    parodySource: 'Game of Thrones',
    tags: ['political intrigue', 'dynasties', 'betrayal', 'dragons', 'grim medieval', 'multiple leads'],
    culturalWeight: 93,
    description: 'A grim fantasy chess match where everyone is a protagonist until they are not. Noble houses trade alliances like coupons, winter refuses to leave, and dragons keep showing up to ruin budgets.'
  },
  {
    titlePatterns: ['Monster Contract', 'The Witchblade Ledger', 'Potion Problems', 'Coins for Creatures', 'The Grumpy Sellsword Chronicles'],
    genre: ['fantasy', 'action'],
    tone: 'serious',
    parodySource: 'The Witcher',
    tags: ['monster hunter', 'grim fairy tales', 'alchemy', 'politics', 'destiny', 'bards'],
    culturalWeight: 84,
    description: 'A cynical monster-hunter takes messy jobs in a messy world. Every contract comes with a moral headache, a catchy tavern ballad, and at least one cursed aristocrat who deserves it.'
  },

  // Superhero Franchises
  {
    titlePatterns: ['Hero Collective', 'Champions Universe', 'Legendary Alliance', 'Guardian Legacy', 'The Crossover Crisis', 'Phase Infinity'],
    genre: ['action', 'adventure'],
    tone: 'pulpy',
    parodySource: 'Marvel/DC Superhero Universe',
    tags: ['superheroes', 'team up', 'world threat', 'powers', 'mythology', 'interconnected', 'post-credits'],
    culturalWeight: 95,
    description: 'A sprawling caped universe where every incident becomes a crossover, every city has a vigilante, and cosmic entities keep trying to delete Earth like a corrupted save file.'
  },
  {
    titlePatterns: ['The Dark Vigil', 'Night Justice', 'Gotham-ish Tales', 'Cowl & Consequences', 'The Brooding Protector'],
    genre: ['action', 'crime'],
    tone: 'dark',
    parodySource: 'Batman',
    tags: ['vigilante', 'no-kill rule', 'gadgets', 'corruption', 'masked rogues', 'noir'],
    culturalWeight: 91,
    description: 'A grim urban crusade powered by trauma, gadgets, and an impossible jawline. A masked detective fights crime, corruption, and the occasional clown-themed philosophical argument.'
  },

  // Horror Franchises
  {
    titlePatterns: ['Nightmare Street', 'Terror Lane', 'Fear Drive', 'Horror Heights', 'Sleep Debt', 'Dream Stalker'],
    genre: ['horror'],
    tone: 'dark',
    parodySource: 'A Nightmare on Elm Street',
    tags: ['supernatural killer', 'dreams', 'teenagers', 'recurring villain', 'sleep', 'one-liners'],
    culturalWeight: 76,
    description: 'A dream-haunting slasher where falling asleep is a plot twist and caffeine is a supporting character. If you die in your dreams, you die in real life (and your alarm clock is useless).'
  },
  {
    titlePatterns: ['The Mask Killer', 'Silent Stalker', 'Halloween Terror', 'The Shape', 'Harvest Night', 'October’s Shadow'],
    genre: ['horror', 'thriller'],
    tone: 'dark',
    parodySource: 'Halloween',
    tags: ['slasher', 'unstoppable killer', 'final girl', 'holiday horror', 'small town'],
    culturalWeight: 74,
    description: 'A classic slow-burn slasher: a silent figure in a cheap mask returns on a specific calendar date to remind everyone that locking doors is an optional game mechanic.'
  },
  {
    titlePatterns: ['Camp Bloodwater', 'Lake Knife Massacre', 'Friday the 14th', 'The Cabin Counting Game', 'Counselor Panic'],
    genre: ['horror'],
    tone: 'dark',
    parodySource: 'Friday the 13th',
    tags: ['camp slasher', 'urban legend', 'body count', 'masked killer', 'sequel machine'],
    culturalWeight: 72,
    description: 'A summer camp legend that refuses to stay buried. Teen counselors break every safety rule, ominous music plays, and a mysterious figure turns a weekend job into a franchise.'
  },

  // Action / Adventure Franchises
  {
    titlePatterns: ['Speed Racers', 'Fast Lane', 'Velocity', 'Turbo Squad', 'Family Overdrive', 'Heist Horizon'],
    genre: ['action', 'crime'],
    tone: 'pulpy',
    parodySource: 'Fast & Furious',
    tags: ['cars', 'heists', 'found family', 'impossible stunts', 'rival-turned-ally'],
    culturalWeight: 83,
    description: 'Street racers graduate into international operatives without ever filling out paperwork. The stakes escalate from pink slips to satellites, but the real superpower is saying “family” convincingly.'
  },
  {
    titlePatterns: ['Mission Critical', 'Impossible Task', 'Agent Protocol', 'Operation Ghost', 'Mask & Mirror', 'The Wire That Wasn’t There'],
    genre: ['action', 'thriller'],
    tone: 'serious',
    parodySource: 'Mission: Impossible',
    tags: ['spy', 'gadgets', 'infiltration', 'double-cross', 'teamwork', 'death-defying stunts'],
    culturalWeight: 87,
    description: 'An elite team pulls off clean operations in messy rooms. There are face-masks, impossible lockpicks, and at least one scene where physics politely looks away.'
  },
  {
    titlePatterns: ['Agent Double-Zeroish', 'Operation Tuxedo', 'Licensed to Quip', 'Specter-ish', 'The Astonishing Gadget'],
    genre: ['action', 'thriller'],
    tone: 'serious',
    parodySource: 'James Bond',
    tags: ['spy', 'tuxedo', 'gadgets', 'globetrotting', 'megalomaniac', 'one-liners'],
    culturalWeight: 89,
    description: 'A suave super-spy saves the world between martinis, improvised disguises, and product-placement closeups. The villain always has a lair, a plan, and a dramatic monologue budget.'
  },
  {
    titlePatterns: ['Relic Raiders', 'Professor Peril', 'Temple of Mild Inconvenience', 'The Lost Artifact Department', 'Whip & Wit'],
    genre: ['adventure', 'action'],
    tone: 'pulpy',
    parodySource: 'Indiana Jones',
    tags: ['archaeology', 'curses', 'traps', 'globe-trotting', 'ancient relics'],
    culturalWeight: 85,
    description: 'A daredevil academic hunts ancient relics in increasingly unsafe locations. Every door is trapped, every idol is cursed, and the museum insurance policy is written in tears.'
  },
  {
    titlePatterns: ['Pirates of the Cola-Seas', 'The Cursed Compass', 'Skull & Sails', 'The Blackish Pearl', 'Rum & Riddles'],
    genre: ['adventure', 'comedy'],
    tone: 'pulpy',
    parodySource: 'Pirates of the Caribbean',
    tags: ['pirates', 'curses', 'sea battles', 'treasure', 'eccentric captain'],
    culturalWeight: 82,
    description: 'Swashbuckling chaos on the high seas: a charmingly unreliable captain chases treasure, curses, and his own reputation while everyone else tries to have a sensible plot.'
  },

  // Monster / Spectacle
  {
    titlePatterns: ['Dino Disaster Park', 'Prehistoric Panic', 'Jurassic-ish World', 'Genetic Safari', 'Raptor Run'],
    genre: ['adventure', 'sci-fi'],
    tone: 'pulpy',
    parodySource: 'Jurassic Park',
    tags: ['dinosaurs', 'theme park', 'science gone wrong', 'survival', 'corporate hubris'],
    culturalWeight: 88,
    description: 'A theme park built on ambition, DNA, and bad signage. The dinosaurs are incredible, the safety systems are decorative, and someone inevitably says: “We spared no expense.”'
  },
  {
    titlePatterns: ['Auto-Morph Armada', 'Gear Giants', 'Robots in Disguise-ish', 'Chrome Conflict', 'The Car That Talks Back'],
    genre: ['action', 'sci-fi'],
    tone: 'pulpy',
    parodySource: 'Transformers',
    tags: ['giant robots', 'alien war', 'spectacle', 'explosions', 'human sidekick', 'merch'],
    culturalWeight: 80,
    description: 'An ancient robot war crashes into modern life, mostly into city blocks. Vehicles become warriors, dialogue becomes optional, and the merchandise potential becomes a core theme.'
  },

  // YA / Romance
  {
    titlePatterns: ['The Tribute Trials', 'Arena of Ash', 'Capitol Games', 'District Drift', 'The Sponsor’s Choice'],
    genre: ['thriller', 'sci-fi'],
    tone: 'serious',
    parodySource: 'The Hunger Games',
    tags: ['dystopia', 'survival games', 'rebellion', 'media spectacle', 'teen lead'],
    culturalWeight: 81,
    description: 'A glossy televised death game fuels a brittle empire. A reluctant hero navigates propaganda, alliances, and the horrifying realization that the audience has favorite murders.'
  },
  {
    titlePatterns: ['Moonlit High', 'The Forever Bite', 'Midnight Romance Club', 'Vampires & Varsity', 'Team Bat vs Team Dog'],
    genre: ['romance', 'fantasy'],
    tone: 'light',
    parodySource: 'Twilight',
    tags: ['teen romance', 'vampires', 'werewolves', 'love triangle', 'melodrama'],
    culturalWeight: 77,
    description: 'A small-town romance spirals into supernatural melodrama where everyone is intensely serious about prom, immortality, and questionable age gaps. The rain has its own billing.'
  },

  // Comedy Franchises
  {
    titlePatterns: ['Campus Comedy', 'College Chaos', 'Dorm Life', 'Party Animals', 'Senior Year Shenanigans', 'The Awkward Pact'],
    genre: ['comedy'],
    tone: 'comedic',
    parodySource: 'American Pie',
    tags: ['coming of age', 'raunchy humor', 'teenagers', 'school', 'friend group'],
    culturalWeight: 65,
    description: 'A chaotic coming-of-age farce where hormones are the villain, friendships are tested by bad decisions, and the true moral is “never make a pact before finals.”'
  },

  // Crime Franchises
  {
    titlePatterns: ['Family Business', 'The Brotherhood', 'Honor Code', 'Blood Ties', 'An Offer You Can’t Refuse-ish', 'Sunday Dinner Syndicate'],
    genre: ['crime', 'drama'],
    tone: 'serious',
    parodySource: 'The Godfather',
    tags: ['organized crime', 'family loyalty', 'power struggle', 'corruption', 'legacy'],
    culturalWeight: 97,
    description: 'A generational crime saga where respect is currency, dinners are negotiations, and power reshapes people. Everyone says it’s “just business” while doing the least businesslike things imaginable.'
  }
];

export class FranchiseGenerator {
  static calculateFranchiseCost(culturalWeight: number): number {
    // Cost calculation: Higher cultural weight = higher cost
    // Range: $1M - $50M based on cultural weight (30-100)
    const baseCost = 1000000; // $1M minimum
    const weightMultiplier = Math.max(0, culturalWeight - 30) / 70; // 0-1 range
    return Math.round(baseCost + (weightMultiplier * 49000000)); // Up to $50M
  }

  static generateInitialFranchises(count: number = 30): Franchise[] {
    const franchises: Franchise[] = [];
    const usedTitles = new Set<string>();
    const usedSources = new Set<string>();
    
    // Generate from templates - only once per parody source
    const templatesUsed = Math.min(count, FRANCHISE_TEMPLATES.length);
    for (let i = 0; i < templatesUsed; i++) {
      const template = FRANCHISE_TEMPLATES[i];
      
      // Skip if parody source already used
      if (usedSources.has(template.parodySource)) continue;
      
      const titleOptions = template.titlePatterns.filter(title => !usedTitles.has(title));
      if (titleOptions.length === 0) continue;
      
      const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];
      usedTitles.add(title);
      usedSources.add(template.parodySource);
      
      const culturalWeight = template.culturalWeight + Math.floor(Math.random() * 10 - 5);
      const franchise: Franchise = {
        id: `FR${String(i + 1).padStart(3, '0')}`,
        title,
        originDate: this.generateRandomDate(2000, 2020),
        creatorStudioId: `COMP_${Math.floor(Math.random() * 10) + 1}`,
        genre: template.genre,
        tone: template.tone,
        parodySource: template.parodySource,
        entries: [], // Will be populated as AI creates films
        status: Math.random() > 0.3 ? 'active' : 'dormant',
        franchiseTags: template.tags,
        culturalWeight,
        totalBoxOffice: 0,
        averageRating: 0,
        merchandisingPotential: Math.floor(Math.random() * 100),
        fanbaseSize: Math.floor(Math.random() * 1000000),
        criticalFatigue: 0,
        description: template.description,
        cost: this.calculateFranchiseCost(culturalWeight)
      };
      
      franchises.push(franchise);
    }
    
    // Generate additional original franchises
    const remainingCount = count - franchises.length;
    for (let i = 0; i < remainingCount; i++) {
      const randomTemplate = FRANCHISE_TEMPLATES[Math.floor(Math.random() * FRANCHISE_TEMPLATES.length)];
      const culturalWeight = Math.floor(Math.random() * 40) + 30;
      const franchise: Franchise = {
        id: `FR${String(franchises.length + i + 1).padStart(3, '0')}`,
        title: this.generateRandomTitle(),
        originDate: this.generateRandomDate(1990, 2022),
        creatorStudioId: `COMP_${Math.floor(Math.random() * 15) + 1}`,
        genre: randomTemplate.genre,
        tone: randomTemplate.tone,
        entries: [],
        status: Math.random() > 0.4 ? 'active' : 'dormant',
        franchiseTags: this.generateRandomTags(),
        culturalWeight,
        totalBoxOffice: 0,
        averageRating: 0,
        merchandisingPotential: Math.floor(Math.random() * 100),
        fanbaseSize: Math.floor(Math.random() * 500000),
        criticalFatigue: 0,
        description: 'A unique franchise with its own distinct style and storytelling approach.',
        cost: this.calculateFranchiseCost(culturalWeight)
      };
      
      franchises.push(franchise);
    }
    
    return franchises;
  }
  
  static generateRandomDate(startYear: number, endYear: number): string {
    const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  static generateRandomTitle(): string {
    const prefixes = ['The', 'Dark', 'Last', 'New', 'Ultimate', 'Secret', 'Hidden', 'Lost'];
    const subjects = ['Warriors', 'Legends', 'Chronicles', 'Saga', 'Dynasty', 'Empire', 'Alliance', 'Order'];
    const suffixes = ['Rising', 'Returns', 'Awakens', 'Reborn', 'United', 'Forever', 'Legacy', 'Destiny'];
    
    const usePrefix = Math.random() > 0.5;
    const useSuffix = Math.random() > 0.6;
    
    let title = '';
    if (usePrefix) {
      title += prefixes[Math.floor(Math.random() * prefixes.length)] + ' ';
    }
    title += subjects[Math.floor(Math.random() * subjects.length)];
    if (useSuffix) {
      title += ': ' + suffixes[Math.floor(Math.random() * suffixes.length)];
    }
    
    return title;
  }
  
  static generateRandomTags(): string[] {
    const allTags = [
      'action', 'adventure', 'mystery', 'romance', 'comedy', 'drama',
      'supernatural', 'technology', 'family', 'friendship', 'betrayal',
      'revenge', 'redemption', 'power', 'corruption', 'justice'
    ];
    
    const tagCount = Math.floor(Math.random() * 3) + 2;
    const selectedTags: string[] = [];
    
    for (let i = 0; i < tagCount; i++) {
      const availableTags = allTags.filter(tag => !selectedTags.includes(tag));
      if (availableTags.length > 0) {
        selectedTags.push(availableTags[Math.floor(Math.random() * availableTags.length)]);
      }
    }
    
    return selectedTags;
  }
  
  static canCreateSequel(franchise: Franchise, currentDate: string): boolean {
    if (franchise.status !== 'active') return false;
    if (franchise.entries.length === 0) return true; // First entry
    if (franchise.criticalFatigue && franchise.criticalFatigue > 80) return false; // Too much fatigue
    
    // Check if enough time has passed since last entry
    if (franchise.lastEntryDate) {
      const lastYear = parseInt(franchise.lastEntryDate.split('-')[0]);
      const currentYear = parseInt(currentDate.split('-')[0]);
      return currentYear - lastYear >= 2; // At least 2 years between entries
    }
    
    return true;
  }
  
  static updateFranchiseMetrics(franchise: Franchise, newEntry: { boxOffice: number; rating: number }): Franchise {
    const updatedEntries = [...franchise.entries];
    const newTotalBoxOffice = (franchise.totalBoxOffice || 0) + newEntry.boxOffice;
    const entryCount = updatedEntries.length;
    const newAverageRating = entryCount > 0 
      ? ((franchise.averageRating || 0) * (entryCount - 1) + newEntry.rating) / entryCount
      : newEntry.rating;
    
    // Update critical fatigue based on rating
    let newCriticalFatigue = franchise.criticalFatigue || 0;
    if (newEntry.rating < 60) {
      newCriticalFatigue = Math.min(100, newCriticalFatigue + 20);
    } else if (newEntry.rating > 80) {
      newCriticalFatigue = Math.max(0, newCriticalFatigue - 10);
    }
    
    return {
      ...franchise,
      totalBoxOffice: newTotalBoxOffice,
      averageRating: newAverageRating,
      criticalFatigue: newCriticalFatigue,
      culturalWeight: Math.min(100, franchise.culturalWeight + (newEntry.rating > 70 ? 2 : -1))
    };
  }
}