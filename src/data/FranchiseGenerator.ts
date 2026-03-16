// Franchise Generation System
import type { Franchise, Genre } from '@/types/game';

interface FranchiseTemplate {
  titlePatterns: string[];
  genre: Genre[];
  tone: Franchise['tone'];
  parodySource: string;
  inspirationLabel?: string;
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

  // Adventure
  {
    titlePatterns: ['Dino Park', 'Primeval Resort', 'Jurassic Frontier', 'The Lost Exhibit'],
    genre: ['adventure', 'thriller'],
    tone: 'pulpy',
    parodySource: 'Dino Park',
    tags: ['dinosaurs', 'theme park', 'survival', 'science gone wrong'],
    culturalWeight: 93,
    description:
      'A high-concept adventure where wonder turns to panic the moment the fences fail. The audience comes for escalating set pieces—containment breaches, clever improvisation, and humans discovering they are not the apex predator. The brand works best when it balances awe with consequences and treats every “upgrade” as a new problem, not a bigger gun.',
  },
  {
    titlePatterns: ['Black Flag Shores', 'Pirate Kings', 'Cursed Compass', 'Sea of Thieves'],
    genre: ['adventure', 'action'],
    tone: 'pulpy',
    parodySource: 'Pirate Seas',
    tags: ['pirates', 'curses', 'treasure', 'naval battles'],
    culturalWeight: 84,
    description:
      'A swashbuckling adventure series built on rogues, cursed gold, and impossible sea battles. Fans want charm-forward leads, outrageous betrayals, and a supernatural hook that justifies the spectacle. The tone should feel like a campfire legend told with modern production values—breezy until it gets scary, then back to fun.',
  },
  {
    titlePatterns: ['Deep Blue Quest', 'Abyssal Gate', 'Trench Raiders', 'Ocean Unknown'],
    genre: ['adventure', 'sci-fi'],
    tone: 'serious',
    parodySource: 'Abyss Expedition',
    tags: ['deep sea', 'ancient ruins', 'pressure', 'unknown life'],
    culturalWeight: 71,
    description:
      'A deep-ocean adventure where the environment is as hostile as any monster. The franchise lives on discovery—forgotten structures, strange signals, and moral choices made under crushing pressure. Audiences show up for atmosphere and “hard survival” problem-solving, so tight rules and credible logistics matter more than quips.',
  },

  // Animation
  {
    titlePatterns: ['Toy Friends', 'Playroom Patrol', 'Shelf Life', 'The Lost Plush'],
    genre: ['animation', 'comedy'],
    tone: 'light',
    parodySource: 'Toy Friends',
    tags: ['toys', 'friendship', 'growing up', 'secret life'],
    culturalWeight: 90,
    description:
      'A heart-forward animated franchise about loyalty, change, and the private world that exists when humans aren’t watching. The hook is emotional clarity: jokes land because the characters mean what they say, and the stakes are small but real. Fans expect warmth, memorable sidekicks, and a few scenes that unexpectedly devastate adults.',
  },
  {
    titlePatterns: ['Green Ogre', 'Swamp Tales', 'Fairyland Fiasco', 'Once Upon a Mess'],
    genre: ['animation', 'comedy'],
    tone: 'comedic',
    parodySource: 'Swamp Ogre',
    tags: ['fairy tales', 'parody', 'odd couple', 'road trip'],
    culturalWeight: 82,
    description:
      'A fairy-tale comedy built on sending classic stories through a blender and finding genuine heart in the wreckage. The audience expects sharp jokes, modern references, and a surprisingly earnest core relationship. The franchise can go wild with spin-offs as long as it keeps that “outsider found family” anchor.',
  },

  // Sci-Fi / Action
  {
    titlePatterns: ['Time Runner', 'Chrono Hunter', 'Future War', 'The Last Protocol'],
    genre: ['sci-fi', 'action'],
    tone: 'serious',
    parodySource: 'Time Runner',
    tags: ['time travel', 'assassins', 'doomsday', 'paradox'],
    culturalWeight: 88,
    description:
      'A relentless sci-fi action brand where the future keeps sending problems back in time. The appeal is inevitability: every victory costs something, and even “saving the world” leaves scars. Fans want a clean central premise, hard choices, and set pieces that feel like cause-and-effect rather than magic.',
  },
  {
    titlePatterns: ['Auto Titans', 'Steel Legion', 'Machine Wars', 'Gearstorm'],
    genre: ['sci-fi', 'action'],
    tone: 'pulpy',
    parodySource: 'Auto Titans',
    tags: ['robots', 'alien war', 'transforming machines', 'spectacle'],
    culturalWeight: 80,
    description:
      'A toyetic action franchise where the hardware is the star: towering machines, impossible vehicle mayhem, and mythology delivered in punchy chunks. The fanbase comes for scale and clear visual identity—distinct silhouettes, signature transformations, and battles that read. It works best when it keeps the human story simple and the mechanical stakes big.',
  },
  {
    titlePatterns: ['Star Infantry', 'Bug War', 'Drop Troopers', 'Offworld Draft'],
    genre: ['sci-fi', 'action'],
    tone: 'dark',
    parodySource: 'Star Infantry',
    tags: ['space marines', 'alien swarms', 'propaganda', 'survival'],
    culturalWeight: 73,
    description:
      'A militarized sci-fi franchise about young soldiers thrown into a machine that doesn’t care if they live. The best entries embrace tension between heroic imagery and ugly reality—competence under fire, propaganda gloss, and brutal consequences. Fans expect relentless action, sharp satire, and characters who change because they have to.',
  },

  // Horror / Thriller
  {
    titlePatterns: ['Kaiju Clash', 'City Breaker', 'Titanfall', 'Monster Horizon'],
    genre: ['sci-fi', 'horror'],
    tone: 'epic',
    parodySource: 'Kaiju Clash',
    tags: ['giant monsters', 'city destruction', 'ancient threats', 'military'],
    culturalWeight: 79,
    description:
      'A monster-event franchise built around a simple promise: something impossibly large is coming, and the city will not survive intact. The audience wants scale, dread, and moments of awe. The brand works when it treats civilians as part of the story—evacuations, failures, and fragile heroism—not just background texture.',
  },
  {
    titlePatterns: ['Wasteland Road', 'Chrome Nomads', 'Dust Kingdom', 'Road of Fury'],
    genre: ['action', 'thriller'],
    tone: 'dark',
    parodySource: 'Wasteland Road',
    tags: ['post-apocalypse', 'convoys', 'scarcity', 'war rigs'],
    culturalWeight: 86,
    description:
      'A kinetic post-apocalypse franchise where every scene feels like momentum. The hook is scarcity turned into style: improvised machines, harsh desert politics, and chases that escalate into mythology. Fans want practical stunt energy, a clear visual language, and a sense that the world has rules—even when it’s insane.',
  },
  {
    titlePatterns: ['Specter Squad', 'Ghost Patrol', 'Paranormal Unit', 'Haunt Hunters'],
    genre: ['comedy', 'horror'],
    tone: 'comedic',
    parodySource: 'Specter Squad',
    tags: ['ghosts', 'gadgets', 'team comedy', 'city hauntings'],
    culturalWeight: 77,
    description:
      'A horror-comedy franchise where blue-collar weirdos take the supernatural like a day job. The brand thrives on banter, practical effects, and a “we can build it in the garage” confidence. Fans expect memorable creatures, quotable insults, and a third act that goes bigger than anyone admits is possible.',
  },
  {
    titlePatterns: ['Zombie Day', 'Dead Weekend', 'Outbreak City', 'Last Shelter'],
    genre: ['horror', 'thriller'],
    tone: 'dark',
    parodySource: 'Zombie Day',
    tags: ['zombies', 'outbreak', 'survivors', 'siege'],
    culturalWeight: 69,
    description:
      'A modern apocalypse brand built on tension, resource scarcity, and the slow realization that society is the first casualty. The best entries focus on containment—one location, one night, one choice that spirals. The fanbase wants grit, momentum, and human conflict that’s scarier than the infected.',
  },

  // Thriller / Crime
  {
    titlePatterns: ['Casino Caper', 'Ocean Crew', 'The Big Score', 'Perfect Heist'],
    genre: ['crime', 'thriller'],
    tone: 'light',
    parodySource: 'Casino Caper',
    tags: ['heists', 'teams', 'cons', 'twists'],
    culturalWeight: 75,
    description:
      'A slick heist franchise where competence is the fantasy: elaborate plans, stylish outfits, and a twist you only see in hindsight. The audience shows up for chemistry, banter, and the “reveal” montage that makes the whole plot click. Stakes can be high, but the tone should feel like a fun puzzle rather than misery.',
  },
  {
    titlePatterns: ['Consulting Detective', 'Baker Street', 'The Great Deduction', 'Casefile Zero'],
    genre: ['crime', 'drama'],
    tone: 'serious',
    parodySource: 'Consulting Detective',
    tags: ['mystery', 'genius detective', 'cases', 'rival'],
    culturalWeight: 81,
    description:
      'A mystery franchise built around a brilliant mind, a loyal partner, and cases that reward the audience for paying attention. The brand lives on clever reveals, character friction, and a recurring nemesis who feels like an equal. Fans want puzzles that play fair, plus personal stakes that don’t drown the mystery engine.',
  },

  // Romance / Drama
  {
    titlePatterns: ['Midnight Hearts', 'Blood Kiss', 'Eternal Night', 'Moonlit Lovers'],
    genre: ['romance', 'fantasy'],
    tone: 'serious',
    parodySource: 'Midnight Hearts',
    tags: ['vampires', 'romance', 'teen drama', 'forbidden love'],
    culturalWeight: 68,
    description:
      'A melodramatic romance franchise where the supernatural is just a lens for adolescent intensity. The hook is heightened emotion: longing, jealousy, and impossible choices dressed in gothic style. Fans expect moody aesthetics, clean love-triangle stakes, and enough sincerity to make the absurd feel personal.',
  },
  {
    titlePatterns: ['Arena Trials', 'District Fire', 'The Reaping', 'Survivor Games'],
    genre: ['thriller', 'drama'],
    tone: 'serious',
    parodySource: 'Arena Trials',
    tags: ['dystopia', 'survival games', 'rebellion', 'media spectacle'],
    culturalWeight: 82,
    description:
      'A dystopian thriller franchise powered by spectacle and outrage: a society that turns suffering into entertainment and heroes into symbols. The audience comes for tense action and moral anger, but stays for character resilience and political consequences. It plays best when the “show” machinery feels real and manipulative.',
  },

  // Superhero / Action
  {
    titlePatterns: ['Dark Vigil', 'Night Sentinel', 'Gotham Shadow', 'The Cowl'],
    genre: ['action', 'crime'],
    tone: 'dark',
    parodySource: 'Dark Vigil',
    tags: ['vigilante', 'city crime', 'gadgets', 'mythic hero'],
    culturalWeight: 91,
    description:
      'A brooding vigilante franchise where the city is a character and crime is both personal and systemic. Fans want noir mood, practical fight choreography, and villains with strong themes. The brand can tilt pulpy or prestige, but it must keep the central fantasy: one person choosing to become a symbol.',
  },

  // Fantasy / YA
  {
    titlePatterns: ['Olympian Bloodlines', 'Demigod Diaries', 'Storm of Myths', 'Camp of Heroes'],
    genre: ['fantasy', 'adventure'],
    tone: 'light',
    parodySource: 'Olympian Bloodlines',
    tags: ['mythology', 'teen heroes', 'quests', 'prophecies'],
    culturalWeight: 70,
    description:
      'A YA fantasy adventure built on modern kids colliding with ancient myths. The audience expects brisk quests, funny banter, and a clear “myth rules” framework that makes the world feel consistent. It works best when it treats destiny as pressure, not convenience—heroes win by growing up, not by being chosen.',
  },
  {
    titlePatterns: ['Frozen Edge', 'Whiteout Protocol', 'Arctic Pursuit', 'Cold Frontier'],
    genre: ['thriller', 'drama'],
    tone: 'serious',
    parodySource: 'Frozen Edge',
    tags: ['survival', 'isolation', 'mystery', 'extreme cold'],
    culturalWeight: 66,
    description:
      'A survival-thriller franchise where the environment is the antagonist and every decision has a cost. The appeal is pressure: limited supplies, unreliable communication, and mysteries that get worse the more you dig. Fans want grounded tactics, slow dread, and a payoff that feels inevitable rather than random.',
  },
];

function slugifyId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function originDateForIndex(index: number): string {
  const year = 1980 + (index % 40);
  const month = ((index * 7) % 12) + 1;
  const day = ((index * 13) % 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function franchiseStatusFromAge(ageYears: number): Franchise['status'] {
  if (ageYears <= 5) return 'active';
  if (ageYears <= 15) return 'dormant';
  if (ageYears <= 30) return 'rebooted';
  return 'retired';
}

function estimateFranchiseCost(culturalWeight: number): number {
  // Weight 0-100 -> 0-80M. (A simple, transparent curve; tuning can happen later.)
  const weight = Math.max(0, Math.min(100, culturalWeight));
  return Math.round((weight / 100) * 80_000_000);
}

function buildFranchise(template: FranchiseTemplate, index: number): Franchise {
  const originDate = originDateForIndex(index);
  const originYear = Number(originDate.slice(0, 4));
  const ageYears = 2024 - originYear;
  const culturalWeight = Math.max(10, Math.min(100, template.culturalWeight));

  const title = template.titlePatterns[0] ?? 'Untitled Franchise';

  return {
    id: `franchise-world-${slugifyId(template.parodySource)}`,
    title,
    originDate,
    creatorStudioId: 'world',
    genre: template.genre,
    tone: template.tone,
    parodySource: template.parodySource,
    inspirationLabel: template.inspirationLabel,
    entries: [],
    status: franchiseStatusFromAge(ageYears),
    franchiseTags: [...template.tags],
    culturalWeight,
    description: template.description,
    cost: estimateFranchiseCost(culturalWeight),
  };
}

function uniqueTemplatesByParodySource(templates: FranchiseTemplate[]): FranchiseTemplate[] {
  const out: FranchiseTemplate[] = [];
  const seen = new Set<string>();

  for (const t of templates) {
    const key = t.parodySource.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }

  return out;
}

const FRANCHISE_CATALOG: Franchise[] = uniqueTemplatesByParodySource(FRANCHISE_TEMPLATES).map((template, index) =>
  buildFranchise(template, index),
);

export const FranchiseGenerator = {
  // Seed is intentionally ignored: the initial world franchises are a fixed catalog.
  generateInitialFranchises(count: number, _seed = 'seed:franchises'): Franchise[] {
    const desired = Math.max(0, Math.floor(count));
    return FRANCHISE_CATALOG.slice(0, Math.min(desired, FRANCHISE_CATALOG.length));
  },
};
