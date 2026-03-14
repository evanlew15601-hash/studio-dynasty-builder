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
      'A long-running space-fantasy saga built on clear heroes, iconic villains, and a galaxy that feels bigger than any one film. Fans expect swashbuckling dogfights, strange planets, and a mythic “power” that can be trained, inherited, or abused. It’s broadly accessible, but the audience will punish anything that feels cheap or cynical—this brand thrives on sincerity and spectacle.',
  },
  {
    titlePatterns: ['Future Shock', 'Cyber Knights', 'Digital Dawn', 'Neural Network'],
    genre: ['sci-fi', 'thriller'],
    tone: 'dark',
    parodySource: 'Blade Chaser',
    tags: ['cyberpunk', 'AI', 'dystopia', 'corporate conspiracy'],
    culturalWeight: 78,
    description:
      'A rain-slick, neon-noir thriller where corporate power is absolute and identity is always up for sale. The hook is moral ambiguity: detectives, defectors, and “manufactured people” all chasing the same fragile truth. Audiences show up for atmosphere—hard shadows, synth-scored dread, and slow-burn reveals—so a grounded tone and strong production design matter as much as action.',
  },
  {
    titlePatterns: ['Alien Hunter', 'Cosmic Horror', 'Deep Space', 'Void Walkers'],
    genre: ['sci-fi', 'horror'],
    tone: 'dark',
    parodySource: 'Deep Space Horror',
    tags: ['space horror', 'survival', 'isolation', 'alien threat'],
    culturalWeight: 85,
    description:
      'Claustrophobic sci-fi horror built around one promise: if something gets on board, you can’t outrun it. These stories thrive on tight corridors, failing systems, and a crew whose competence is tested by panic and paranoia. The fanbase loves practical tension over jump-scare spam—earned dread, brutal stakes, and a monster that feels intelligent even when unseen.',
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
      'A sweeping quest-fantasy with deep lore, ancient wars, and a sense of history baked into every location. The audience comes for fellowship dynamics, impossible odds, and the slow accumulation of meaning as the journey grinds heroes down and rebuilds them. It plays best when the world feels lived-in—songs, ruins, rival kingdoms—and when the magic is treated with reverence instead of convenience.',
  },
  {
    titlePatterns: ['Wizard Academy', 'Spell Casters', 'Magic School', 'Arcane Arts'],
    genre: ['fantasy', 'family'],
    tone: 'light',
    parodySource: 'Wizard Academy',
    tags: ['magic school', 'coming of age', 'friendship', 'dark wizard'],
    culturalWeight: 98,
    description:
      'A cozy-but-dangerous coming‑of‑age series set inside a hidden school for spellcraft. The core appeal is the blend of wonder and routine—classes, rivalries, secret corridors—punctuated by escalating mysteries and a growing shadow in the wider world. Fans expect a strong ensemble, a clear “rulebook” for magic, and emotional payoffs that feel earned rather than purely plot-driven.',
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
      'A shared‑universe of costumed heroes designed for crossovers, spin‑offs, and the occasional “event” sequel that tries to top the last one. The audience expects clear iconography, memorable power-sets, and a rotating mix of earnest character drama and crowd-pleasing spectacle. It can print money when continuity is handled cleanly, but fan sentiment turns fast if a release feels like homework.',
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
      'A supernatural slasher built around the scariest rule: sleep is not safe. The villain is more idea than person—an urban legend that gets stronger the more people fear it—and the set pieces lean surreal without losing cause-and-effect. The franchise’s fans care about inventive “dream logic” kills, but the emotional core is always the survivors trying to stay awake long enough to outsmart the myth.',
  },
  {
    titlePatterns: ['The Mask Killer', 'Silent Stalker', 'Harvest Terror', 'The Shape'],
    genre: ['horror', 'thriller'],
    tone: 'dark',
    parodySource: 'Hallow Night',
    tags: ['slasher', 'unstoppable killer', 'final survivor', 'holiday horror'],
    culturalWeight: 74,
    description:
      'A seasonal slasher series with a simple engine: one quiet town, one night everyone dreads, and a masked presence that returns when people least want to believe. The best entries treat silence like a weapon—long stalking sequences, minimal dialogue, and violence that lands because it’s restrained. Audiences expect “final survivor” tension and a cold, inevitable mood rather than flashy gore.',
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
      'Stunt-forward action built on found-family loyalty, absurdly expensive vehicles, and set pieces that ignore physics with confidence. The tone is earnest even when the plot is ridiculous—rival crews become allies, heists become rescues, and every sequel tries to go “one notch bigger.” Fans will forgive anything except boredom, so momentum and spectacle are the point of the brand.',
  },
  {
    titlePatterns: ['Mission Critical', 'Impossible Task', 'Agent Protocol', 'Operation Ghost'],
    genre: ['action', 'thriller'],
    tone: 'serious',
    parodySource: 'Mission Critical',
    tags: ['spy', 'gadgets', 'infiltration', 'death-defying stunts'],
    culturalWeight: 87,
    description:
      'A sleek espionage franchise where elite agents race deadlines, betrayals, and impossible logistics with gadgets that are always one step ahead. The brand lives on precision: clean action choreography, globe-hopping locations, and set pieces that feel practical even when they’re insane. Fans want competence, tension, and that “plan within a plan” twist that makes the final act click.',
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
      'An ensemble coming‑of‑age comedy built around bad plans, worse advice, and the panic of trying to be cool for the first time. The tone is messy but ultimately warm—friend groups fracture, reunite, and stumble toward adulthood one humiliation at a time. The audience expects quotable dialogue, escalating dares, and a surprisingly sincere ending that makes the chaos feel earned.',
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
      'A prestige crime dynasty saga where family loyalty is both shield and weapon. The hook is quiet power: deals in back rooms, betrayals dressed as tradition, and heirs who inherit both privilege and rot. Audiences come for operatic drama and moral consequence—every choice costs something, and the “business” always follows you home.',
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
