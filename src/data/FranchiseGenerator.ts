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
    description: 'Coming-of-age magical adventure following young wizards learning their craft while facing dark forces threatening their magical world.'
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
    
    // Generate from templates
    const templatesUsed = Math.min(count, FRANCHISE_TEMPLATES.length * 2);
    for (let i = 0; i < templatesUsed; i++) {
      const template = FRANCHISE_TEMPLATES[i % FRANCHISE_TEMPLATES.length];
      const titleOptions = template.titlePatterns.filter(title => !usedTitles.has(title));
      
      if (titleOptions.length === 0) continue;
      
      const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];
      usedTitles.add(title);
      
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