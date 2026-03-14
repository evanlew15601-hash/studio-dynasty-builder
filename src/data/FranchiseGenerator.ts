// Franchise Generation System
import type { Franchise, Genre } from '@/types/game';
import { stablePick } from '@/utils/stablePick';
import { stableFloat01, stableInt } from '@/utils/stableRandom';

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
  // Sci-Fi
  {
    titlePatterns: ['Star Enforcers', 'Galactic Guardians', 'Space Riders', 'Quantum Rebels'],
    genre: ['sci-fi', 'action'],
    tone: 'pulpy',
    parodySource: 'Star Saga',
    tags: ['space', 'laser weapons', 'alien rebellion', 'chosen one'],
    culturalWeight: 92,
    description:
      'Epic space opera featuring galactic conflicts, mystical powers, and the eternal struggle between good and evil across the cosmos.',
  },
  {
    titlePatterns: ['Future Shock', 'Cyber Knights', 'Digital Dawn', 'Neural Network'],
    genre: ['sci-fi', 'thriller'],
    tone: 'dark',
    parodySource: 'Blade Chaser',
    tags: ['cyberpunk', 'AI', 'dystopia', 'corporate conspiracy'],
    culturalWeight: 78,
    description:
      'Cyberpunk thriller exploring a future where AI and humanity blur, set in neon-soaked cities ruled by mega-corporations.',
  },
  {
    titlePatterns: ['Alien Hunter', 'Cosmic Horror', 'Deep Space', 'Void Walkers'],
    genre: ['sci-fi', 'horror'],
    tone: 'dark',
    parodySource: 'Deep Space Horror',
    tags: ['space horror', 'survival', 'isolation', 'alien threat'],
    culturalWeight: 85,
    description:
      'Terrifying space horror where isolated crews face unknown threats in the vast emptiness of space with nowhere to run.',
  },

  // Fantasy
  {
    titlePatterns: ['Ring of Destiny', 'Crown Bearers', 'The Last Kingdom', 'Shadow Realm'],
    genre: ['fantasy', 'adventure'],
    tone: 'epic',
    parodySource: 'Rings of Destiny',
    tags: ['medieval', 'magic', 'quest', 'dark lord'],
    culturalWeight: 95,
    description:
      'Epic medieval fantasy following heroes on a grand quest to save their world from ancient evil, featuring rich mythology and magical realms.',
  },
  {
    titlePatterns: ['Wizard Academy', 'Spell Casters', 'Magic School', 'Arcane Arts'],
    genre: ['fantasy', 'family'],
    tone: 'light',
    parodySource: 'Wizard Academy',
    tags: ['magic school', 'coming of age', 'friendship', 'dark wizard'],
    culturalWeight: 98,
    description:
      'Coming-of-age magical adventure following young wizards learning their craft while facing dark forces threatening their world.',
  },

  // Superhero
  {
    titlePatterns: ['Hero Collective', 'Champions Universe', 'Legendary Alliance', 'Guardian Legacy'],
    genre: ['action', 'adventure'],
    tone: 'pulpy',
    parodySource: 'Hero Collective Universe',
    tags: ['superheroes', 'team up', 'world threat', 'powers', 'interconnected'],
    culturalWeight: 95,
    description:
      'A sprawling superhero universe featuring interconnected stories of heroes who must unite to face major threats while juggling personal struggles.',
  },

  // Horror
  {
    titlePatterns: ['Nightmare Street', 'Terror Lane', 'Fear Drive', 'Horror Heights'],
    genre: ['horror'],
    tone: 'dark',
    parodySource: 'Nightmare Street',
    tags: ['supernatural killer', 'dreams', 'teenagers', 'recurring villain'],
    culturalWeight: 76,
    description:
      'Supernatural horror featuring an unstoppable killer who hunts victims through their dreams, blurring the line between nightmare and reality.',
  },
  {
    titlePatterns: ['The Mask Killer', 'Silent Stalker', 'Harvest Terror', 'The Shape'],
    genre: ['horror', 'thriller'],
    tone: 'dark',
    parodySource: 'Hallow Night',
    tags: ['slasher', 'unstoppable killer', 'final survivor', 'holiday horror'],
    culturalWeight: 74,
    description:
      'Classic slasher horror with a relentless masked killer stalking victims on specific nights, creating an atmosphere of dread and inevitability.',
  },

  // Action
  {
    titlePatterns: ['Speed Racers', 'Fast Lane', 'Velocity', 'Turbo Squad'],
    genre: ['action', 'crime'],
    tone: 'pulpy',
    parodySource: 'Fast Lane',
    tags: ['cars', 'heists', 'family', 'impossible stunts'],
    culturalWeight: 83,
    description:
      'High-octane action featuring street racers turned unlikely heroes, combining family bonds with spectacular car chases and impossible heists.',
  },
  {
    titlePatterns: ['Mission Critical', 'Impossible Task', 'Agent Protocol', 'Operation Ghost'],
    genre: ['action', 'thriller'],
    tone: 'serious',
    parodySource: 'Mission Critical',
    tags: ['spy', 'gadgets', 'infiltration', 'death-defying stunts'],
    culturalWeight: 87,
    description:
      'Spy thriller featuring elite agents using cutting-edge technology and death-defying stunts to complete seemingly impossible missions.',
  },

  // Comedy
  {
    titlePatterns: ['Campus Comedy', 'College Chaos', 'Dorm Life', 'Party Animals'],
    genre: ['comedy'],
    tone: 'comedic',
    parodySource: 'College Chaos',
    tags: ['coming of age', 'raunchy humor', 'teenagers', 'school'],
    culturalWeight: 65,
    description:
      'Raunchy teen comedy exploring the awkward and hilarious journey of young adults navigating relationships, parties, and growing up.',
  },

  // Crime
  {
    titlePatterns: ['Family Business', 'The Brotherhood', 'Honor Code', 'Blood Ties'],
    genre: ['crime', 'drama'],
    tone: 'serious',
    parodySource: 'The Family Boss',
    tags: ['organized crime', 'family loyalty', 'power struggle', 'corruption'],
    culturalWeight: 97,
    description:
      'Epic crime saga exploring the complex dynamics of organized crime families, their codes of honor, and the price of power and loyalty.',
  },
];

function generateRandomDate(startYear: number, endYear: number, seed: string): string {
  const year = stableInt(`${seed}|year`, startYear, endYear);
  const month = stableInt(`${seed}|month`, 1, 12);
  const day = stableInt(`${seed}|day`, 1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateTitle(template: FranchiseTemplate, seed: string): string {
  const picked = stablePick(template.titlePatterns, `${seed}|title`) ?? template.titlePatterns[0];
  const useSubtitle = stableFloat01(`${seed}|subtitle`) > 0.6;
  if (!useSubtitle) return picked;

  const subtitles = ['Legacy', 'Reborn', 'Returns', 'Awakens', 'Rising', 'Forever', 'Destiny'];
  const subtitle = stablePick(subtitles, `${seed}|subtitlePick`);
  return subtitle ? `${picked}: ${subtitle}` : picked;
}

function franchiseStatusFromAge(ageYears: number, seed: string): Franchise['status'] {
  const r = stableFloat01(`${seed}|status`);
  if (ageYears <= 3) return 'active';
  if (ageYears <= 8) return r > 0.15 ? 'active' : 'dormant';
  if (ageYears <= 20) return r > 0.35 ? 'dormant' : 'rebooted';
  return r > 0.55 ? 'retired' : 'rebooted';
}

function estimateFranchiseCost(culturalWeight: number): number {
  // Weight 0-100 -> 0-80M. (A simple, transparent curve; tuning can happen later.)
  const weight = Math.max(0, Math.min(100, culturalWeight));
  return Math.round((weight / 100) * 80_000_000);
}

function buildFranchise(template: FranchiseTemplate, index: number, seed: string): Franchise {
  const originYear = stableInt(`${seed}|originYear`, 1980, 2023);
  const originDate = generateRandomDate(originYear, originYear, `${seed}|originDate`);
  const ageYears = 2024 - originYear;

  const culturalJitter = stableInt(`${seed}|culturalJitter`, -6, 6);
  const culturalWeight = Math.max(10, Math.min(100, template.culturalWeight + culturalJitter));

  return {
    id: `franchise-${index}-${stableInt(`${seed}|id`, 1000, 9999)}`,
    title: generateTitle(template, `${seed}|title`),
    originDate,
    creatorStudioId: 'world',
    genre: template.genre,
    tone: template.tone,
    parodySource: template.parodySource,
    entries: [],
    status: franchiseStatusFromAge(ageYears, `${seed}|status`),
    franchiseTags: [...template.tags],
    culturalWeight,
    description: template.description,
    cost: estimateFranchiseCost(culturalWeight),
  };
}

export const FranchiseGenerator = {
  generateInitialFranchises(count: number, seed = 'seed:franchises'): Franchise[] {
    const desired = Math.max(0, Math.floor(count));
    const out: Franchise[] = [];

    const templates = [...FRANCHISE_TEMPLATES];

    for (let i = 0; i < desired; i++) {
      const idx = stableInt(`${seed}|template|${i}`, 0, templates.length - 1);
      const template = templates[idx] ?? FRANCHISE_TEMPLATES[0];

      // Prefer unique parody sources early on.
      if (templates.length > 1) {
        templates.splice(idx, 1);
      }

      const franchise = buildFranchise(template, i, `${seed}|franchise|${i}|${template.parodySource}`);
      out.push(franchise);

      // If we consumed all templates but still need more franchises, start recycling.
      if (templates.length === 0 && out.length < desired) {
        templates.push(...FRANCHISE_TEMPLATES);
      }
    }

    return out;
  },
};
