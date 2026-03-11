// Franchise Generation System
import { Franchise, Genre } from '@/types/game';
import { stableFloat01, stableInt } from '@/utils/stableRandom';
import { stablePick } from '@/utils/stablePick';

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
    titlePatterns: ['Star Enforcers', 'Galactic Guardians', 'Space Riders', 'Quantum Rebels'],
    genre: ['sci-fi', 'action'],
    tone: 'pulpy',
    parodySource: 'Star Wars',
    tags: ['space', 'laser weapons', 'alien rebellion', 'chosen one'],
    culturalWeight: 92,
    description: 'Epic space opera featuring galactic conflicts, mystical powers, and the eternal struggle between good and evil across the cosmos.'
  },
  {
    titlePatterns: ['Future Shock', 'Cyber Knights', 'Digital Dawn', 'Neural Network'],
    genre: ['sci-fi', 'thriller'],
    tone: 'dark',
    parodySource: 'Blade Runner',
    tags: ['cyberpunk', 'AI', 'dystopia', 'corporate conspiracy'],
    culturalWeight: 78,
    description: 'Cyberpunk thriller exploring the dark future where AI and humanity blur, set in neon-soaked dystopian cities ruled by mega-corporations.'
  },
  {
    titlePatterns: ['Alien Hunter', 'Cosmic Horror', 'Deep Space', 'Void Walkers'],
    genre: ['sci-fi', 'horror'],
    tone: 'dark',
    parodySource: 'Alien',
    tags: ['space horror', 'survival', 'isolation', 'alien threat'],
    culturalWeight: 85,
    description: 'Terrifying space horror where isolated crews face unknown alien threats in the vast emptiness of space with nowhere to run.'
  },
  
  // Fantasy Franchises
  {
    titlePatterns: ['Ring of Destiny', 'Crown Bearers', 'The Last Kingdom', 'Shadow Realm'],
    genre: ['fantasy', 'adventure'],
    tone: 'epic',
    parodySource: 'Lord of the Rings',
    tags: ['medieval', 'magic', 'quest', 'dark lord'],
    culturalWeight: 95,
    description: 'Epic medieval fantasy following heroes on a grand quest to save their world from ancient evil, featuring rich mythology and magical realms.'
  },
  {
    titlePatterns: ['Wizard Academy', 'Spell Casters', 'Magic School', 'Arcane Arts'],
    genre: ['fantasy', 'family'],
    tone: 'light',
    parodySource: 'Harry Potter',
    tags: ['magic school', 'coming of age', 'friendship', 'dark wizard'],
    culturalWeight: 98,
    description: 'Coming-of-age magical adventure following young wizards learning their craft while facing dark forces threatening their magical world.',
    predefinedRoles: [
      { id: 'young-wizard', name: 'Young Wizard', importance: 'lead', requiredType: 'actor', ageRange: [11, 18] },
      { id: 'mentor', name: 'Wise Mentor', importance: 'supporting', requiredType: 'actor', ageRange: [45, 70] },
      { id: 'dark-wizard', name: 'Dark Wizard', importance: 'supporting', requiredType: 'actor', ageRange: [30, 60] },
      { id: 'best-friend', name: 'Best Friend', importance: 'supporting', requiredType: 'actor', ageRange: [11, 18] }
    ]
  },
  
  // Superhero Franchises
  {
    titlePatterns: ['Hero Collective', 'Champions Universe', 'Legendary Alliance', 'Guardian Legacy'],
    genre: ['action', 'adventure'],
    tone: 'pulpy',
    parodySource: 'Marvel/DC Superhero Universe',
    tags: ['superheroes', 'team up', 'world threat', 'powers', 'mythology', 'interconnected'],
    culturalWeight: 95,
    description: 'A sprawling superhero universe featuring interconnected stories of heroes with extraordinary powers who must unite to face cosmic threats while dealing with personal struggles and complex moral choices.'
  },
  
  // Horror Franchises
  {
    titlePatterns: ['Nightmare Street', 'Terror Lane', 'Fear Drive', 'Horror Heights'],
    genre: ['horror'],
    tone: 'dark',
    parodySource: 'A Nightmare on Elm Street',
    tags: ['supernatural killer', 'dreams', 'teenagers', 'recurring villain'],
    culturalWeight: 76,
    description: 'Supernatural horror featuring an unstoppable killer who hunts victims through their dreams, blurring the line between nightmare and reality.'
  },
  {
    titlePatterns: ['The Mask Killer', 'Silent Stalker', 'Halloween Terror', 'The Shape'],
    genre: ['horror', 'thriller'],
    tone: 'dark',
    parodySource: 'Halloween',
    tags: ['slasher', 'unstoppable killer', 'final girl', 'holiday horror'],
    culturalWeight: 74,
    description: 'Classic slasher horror with a relentless masked killer stalking victims on specific nights, creating an atmosphere of dread and inevitability.'
  },
  
  // Action Franchises
  {
    titlePatterns: ['Speed Racers', 'Fast Lane', 'Velocity', 'Turbo Squad'],
    genre: ['action', 'crime'],
    tone: 'pulpy',
    parodySource: 'Fast & Furious',
    tags: ['cars', 'heists', 'family', 'impossible stunts'],
    culturalWeight: 83,
    description: 'High-octane action featuring street racers turned unlikely heroes, combining family bonds with spectacular car chases and impossible heists.'
  },
  {
    titlePatterns: ['Mission Critical', 'Impossible Task', 'Agent Protocol', 'Operation Ghost'],
    genre: ['action', 'thriller'],
    tone: 'serious',
    parodySource: 'Mission: Impossible',
    tags: ['spy', 'gadgets', 'infiltration', 'death-defying stunts'],
    culturalWeight: 87,
    description: 'Spy thriller featuring elite agents using cutting-edge technology and death-defying stunts to complete seemingly impossible missions.'
  },
  
  // Comedy Franchises
  {
    titlePatterns: ['Campus Comedy', 'College Chaos', 'Dorm Life', 'Party Animals'],
    genre: ['comedy'],
    tone: 'comedic',
    parodySource: 'American Pie',
    tags: ['coming of age', 'raunchy humor', 'teenagers', 'school'],
    culturalWeight: 65,
    description: 'Raunchy teen comedy exploring the awkward and hilarious journey of young adults navigating relationships, parties, and growing up.'
  },
  
  // Crime Franchises
  {
    titlePatterns: ['Family Business', 'The Brotherhood', 'Honor Code', 'Blood Ties'],
    genre: ['crime', 'drama'],
    tone: 'serious',
    parodySource: 'The Godfather',
    tags: ['organized crime', 'family loyalty', 'power struggle', 'corruption'],
    culturalWeight: 97,
    description: 'Epic crime saga exploring the complex dynamics of organized crime families, their codes of honor, and the price of power and loyalty.'
  }
];

const generateRandomDateImpl = (startYear: number, endYear: number, seed: string): string => {
  const year = stableInt(`${seed}|year`, startYear, endYear);
  const month = stableInt(`${seed}|month`, 1, 12);
  const day = stableInt(`${seed}|day`, 1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// NOTE: Movie title generation should remain random/procedural (e.g. competitor releases).
// Franchises, however, are treated as a preset catalogue; keep franchise generation deterministic + cheap.

const generateRandomTagsImpl = (seed: string): string[] => {
  const allTags = [
    'action', 'adventure', 'mystery', 'romance', 'comedy', 'drama',
    'supernatural', 'technology', 'family', 'friendship', 'betrayal',
    'revenge', 'redemption', 'power', 'corruption', 'justice',
  ];

  const tagCount = stableInt(`${seed}|count`, 2, 4);
  const selectedTags: string[] = [];

  for (let i = 0; i < tagCount; i++) {
    const availableTags = allTags.filter((tag) => !selectedTags.includes(tag));
    if (availableTags.length === 0) break;
    const picked = stablePick(availableTags, `${seed}|tag|${i}`) || availableTags[0];
    selectedTags.push(picked);
  }

  return selectedTags;
};

const calculateFranchiseCostImpl = (franchise: Franchise): number => {
  const baseCost = 50_000_000;
  const culturalMultiplier = 1 + (franchise.culturalWeight / 100);
  const fanbaseMultiplier = 1 + (franchise.fanbaseSize || 0) / 1_000_000;
  const fatigueDiscount = 1 - ((franchise.criticalFatigue || 0) / 200);
  return Math.round(baseCost * culturalMultiplier * fanbaseMultiplier * fatigueDiscount);
};

export class FranchiseGenerator {
  static generateInitialFranchises(count: number = 30, seed: string = 'franchise:v1'): Franchise[] {
    // Franchises are meant to be a preset catalogue (similar to public-domain IPs),
    // not procedurally generated movie titles. Keep this fast + deterministic for low-end devices.
    const base: Franchise[] = [];
    let idx = 0;

    for (const template of FRANCHISE_TEMPLATES) {
      for (const title of template.titlePatterns) {
        idx += 1;
        const id = `FR${String(idx).padStart(3, '0')}`;

        const culturalWeight = template.culturalWeight + stableInt(`${seed}|cw|${id}`, -5, 4); // ±5 variation

        const franchise: Franchise = {
          id,
          title,
          originDate: generateRandomDateImpl(1990, 2022, `${seed}|origin|${id}`),
          creatorStudioId: `COMP_${stableInt(`${seed}|creator|${id}`, 1, 15)}`,
          genre: template.genre,
          tone: template.tone,
          parodySource: template.parodySource,
          entries: [],
          status: stableFloat01(`${seed}|status|${id}`) > 0.3 ? 'active' : 'dormant',
          franchiseTags: template.tags,
          culturalWeight: Math.min(100, Math.max(0, culturalWeight)),
          merchandisingPotential: stableInt(`${seed}|merch|${id}`, 0, 99),
          fanbaseSize: stableInt(`${seed}|fanbase|${id}`, 0, 999_999),
          criticalFatigue: stableInt(`${seed}|fatigue|${id}`, 0, 29),
          description: template.description,
          cost: 0, // Will be calculated
        };

        franchise.cost = calculateFranchiseCostImpl(franchise);
        base.push(franchise);
      }
    }

    if (count <= base.length) {
      return base.slice(0, count);
    }

    // If a caller asks for more than we have presets for, extend deterministically by cloning.
    // Titles must remain unique, but also must not introduce any heavy deterministic generation.
    const extended: Franchise[] = [...base];
    const usedTitles = new Set(base.map((f) => f.title));

    while (extended.length < count) {
      idx += 1;
      const id = `FR${String(idx).padStart(3, '0')}`;
      const source = base[(extended.length - base.length) % base.length];

      let title = `${source.title} ${stableInt(`${seed}|cloneSuffix|${id}`, 2, 9)}`;
      if (usedTitles.has(title)) {
        let suffix = 2;
        while (usedTitles.has(`${source.title} ${suffix}`)) suffix += 1;
        title = `${source.title} ${suffix}`;
      }

      const clone: Franchise = {
        ...source,
        id,
        title,
      };

      usedTitles.add(clone.title);
      clone.cost = calculateFranchiseCostImpl(clone);
      extended.push(clone);
    }

    return extended;
  }

  static generateRandomDate(startYear: number, endYear: number, seed: string): string {
    return generateRandomDateImpl(startYear, endYear, seed);
  }

  

  static generateRandomTags(seed: string): string[] {
    return generateRandomTagsImpl(seed);
  }

  static canCreateSequel(franchise: Franchise, currentDate: string): boolean {
    if (franchise.status !== 'active') return false;
    if (franchise.entries.length === 0) return true; // First entry
    if (franchise.criticalFatigue && franchise.criticalFatigue > 80) return false; // Too much fatigue
    
    // Check if enough time has passed since last entry
    if (franchise.lastEntryDate) {
      const lastYear = parseInt(franchise.lastEntryDate.split('-')[0], 10);
      const currentYear = parseInt(currentDate.split('-')[0], 10);
      return currentYear - lastYear >= 2; // At least 2 years between entries
    }
    
    return true;
  }
  
  static calculateFranchiseCost(franchise: Franchise): number {
    return calculateFranchiseCostImpl(franchise);
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