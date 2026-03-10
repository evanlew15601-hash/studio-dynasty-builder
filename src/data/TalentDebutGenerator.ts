import type { Genre, Race, TalentPerson } from '@/types/game';
import { stableInt } from '@/utils/stableRandom';
import { stablePick } from '@/utils/stablePick';

function determineCareerStage(age: number, experience: number, reputation: number): TalentPerson['careerStage'] {
  if (experience < 2 || reputation < 30) return 'unknown';
  if (experience < 8 && age < 30) return 'rising';
  if (experience < 15 && reputation < 80) return 'established';
  if (experience >= 15 || age > 50) return 'veteran';
  if (reputation > 90 && experience > 20) return 'legend';
  return 'established';
}

function generateMarketValue(age: number, experience: number, reputation: number, type: 'actor' | 'director'): number {
  let baseValue = type === 'director' ? 2_000_000 : 1_000_000;
  baseValue *= Math.pow(1.15, Math.max(0, experience));
  baseValue *= (Math.max(10, reputation) / 50);

  const optimalAge = type === 'director' ? 45 : 35;
  const ageFactor = 1 - Math.abs(age - optimalAge) * 0.01;
  baseValue *= Math.max(0.3, ageFactor);

  return Math.min(baseValue, type === 'director' ? 15_000_000 : 20_000_000);
}

function mustPick<T>(items: T[], seed: string): T {
  const v = stablePick(items, seed);
  return (v === undefined ? items[0] : v) as T;
}

function toTitleCase(s: string): string {
  return s.length === 0 ? s : `${s[0].toUpperCase()}${s.slice(1)}`;
}

function buildDebutBiography(t: TalentPerson, year: number, seed: string): string {
  const primary = (t.genres?.[0] || 'drama') as Genre;
  const they = t.gender === 'Female' ? 'she' : t.gender === 'Male' ? 'he' : 'they';
  const them = t.gender === 'Female' ? 'her' : t.gender === 'Male' ? 'him' : 'them';
  const theyAre = t.gender === 'Female' ? 'she’s' : t.gender === 'Male' ? 'he’s' : 'they’re';

  const openings =
    t.type === 'director'
      ? [
          `${t.name} emerged in ${year} as a new director with unusually clear instincts for ${primary}.`,
          `A fresh voice in ${year}, ${t.name} is already getting quiet attention for ${primary}.`,
          `${t.name} is a ${year} debut directors’ reps keep tagging as “worth a meeting.”`,
        ]
      : [
          `${t.name} hit casting boards in ${year} as a new face with unusually clear instincts for ${primary}.`,
          `A fresh arrival in ${year}, ${t.name} is already getting quiet attention in the ${primary} lane.`,
          `${t.name} is a ${year} debut that agents keep slipping into “worth a look” emails, especially for ${primary}.`,
        ];

  const hooks =
    t.type === 'director'
      ? [
          `${toTitleCase(they)} has an editor’s sense of rhythm and an actor-friendly way of giving notes.`,
          `${toTitleCase(they)} plans cleanly and cuts ruthlessly—scenes end exactly when the story has said enough.`,
          `${toTitleCase(they)} is still more rumor than filmography, but the buzz keeps repeating.`,
        ]
      : [
          `${toTitleCase(they)} reads as camera-ready without feeling rehearsed.`,
          `${toTitleCase(they)} has the kind of focus crews notice even on small auditions.`,
          `${toTitleCase(they)} is still more rumor than résumé, but the buzz keeps repeating.`,
        ];

  const closes =
    t.type === 'director'
      ? [
          `Nobody’s calling ${them} a name yet—but one clean debut feature could lock it in.`,
          `Right now ${theyAre} unproven, hungry, and cheap—exactly the kind of hire that can shift a studio’s identity in a year.`,
          `If the right project lands in ${them}’s lap, ${they} won’t stay “new” for long.`,
        ]
      : [
          `Nobody’s calling ${them} a star yet—but the first good role could make the leap feel inevitable.`,
          `Right now ${theyAre} cheap, hungry, and unclaimed—exactly the kind of talent that can change a slate with one breakout.`,
          `If the right director spots ${them}, ${they} won’t stay “new” for long.`,
        ];

  return `${mustPick(openings, `${seed}|open`)} ${mustPick(hooks, `${seed}|hook`)} ${mustPick(closes, `${seed}|close`)}`;
}

const ACTOR_GENRES: Genre[] = [
  'drama',
  'comedy',
  'thriller',
  'action',
  'romance',
  'horror',
  'sci-fi',
  'fantasy',
  'mystery',
  'family',
  'historical',
  'biography',
];

const DIRECTOR_GENRES: Genre[] = [
  'drama',
  'thriller',
  'action',
  'horror',
  'sci-fi',
  'comedy',
  'romance',
  'historical',
  'biography',
  'mystery',
  'family',
];

const FIRST_NAMES_FEMALE = [
  'Ava', 'Maya', 'Nina', 'Elena', 'Sofia', 'Layla', 'Iris', 'Naomi', 'Zoe', 'Clara',
  'Jade', 'Aaliyah', 'Priya', 'Hana', 'Camila', 'Lucia', 'Renee', 'Talia', 'Morgan', 'Quinn',
];

const FIRST_NAMES_MALE = [
  'Ethan', 'Noah', 'Miles', 'Julian', 'Leo', 'Omar', 'Jonah', 'Caleb', 'Diego', 'Arjun',
  'Kai', 'Darius', 'Felix', 'Micah', 'Rowan', 'Hector', 'Theo', 'Malik', 'Graham', 'Logan',
];

const LAST_NAMES = [
  'Parker', 'Reed', 'Hayes', 'Collins', 'Nguyen', 'Patel', 'Morales', 'Kim', 'Jackson', 'Cruz',
  'Bennett', 'Flores', 'Chen', 'Martinez', 'Singh', 'Brooks', 'Wright', 'Lopez', 'Hughes', 'Santos',
  'Stone', 'Foster', 'Rivera', 'Ward', 'Coleman', 'Diaz', 'Rahman', 'Baker', 'Price', 'Adler',
];

const NATIONALITIES = [
  'American',
  'Canadian',
  'British',
  'Irish',
  'Australian',
  'New Zealander',
  'Mexican',
  'Brazilian',
  'Colombian',
  'French',
  'German',
  'Italian',
  'Spanish',
  'Nigerian',
  'Ghanaian',
  'Kenyan',
  'Egyptian',
  'Lebanese',
  'Indian',
  'Pakistani',
  'Filipino',
  'Japanese',
  'Korean',
  'Chinese',
];

const RACES: Race[] = ['White', 'Black', 'Asian', 'Latino', 'Middle Eastern', 'Indigenous', 'Mixed', 'Other'];

function buildName(gender: 'Male' | 'Female', seed: string): string {
  const first =
    gender === 'Female'
      ? mustPick(FIRST_NAMES_FEMALE, `${seed}|first`)
      : mustPick(FIRST_NAMES_MALE, `${seed}|first`);
  const last = mustPick(LAST_NAMES, `${seed}|last`);
  return `${first} ${last}`;
}

function buildGenres(type: 'actor' | 'director', seed: string): Genre[] {
  const pool = type === 'director' ? DIRECTOR_GENRES : ACTOR_GENRES;
  const count = stableInt(`${seed}|count`, 2, 3);
  const out: Genre[] = [];

  // Stable sample without replacement.
  const available = [...pool];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = stableInt(`${seed}|g|${i}`, 0, available.length - 1);
    out.push(available.splice(idx, 1)[0]);
  }

  return out.length > 0 ? out : (['drama'] as Genre[]);
}

function availabilityForYear(year: number) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  return { start, end };
}

export function generateProceduralDebuts(options: {
  existingTalent: TalentPerson[];
  year: number;
  actorCount: number;
  directorCount: number;
  /** Optional seed to keep debuts stable across runs and saves. */
  seed?: string;
}): TalentPerson[] {
  const seedBase = options.seed ?? `procedural-debuts:${options.year}`;

  const usedIds = new Set(options.existingTalent.map((t) => t.id));
  const usedNames = new Set(options.existingTalent.map((t) => t.name));

  const out: TalentPerson[] = [];

  const makeDebut = (type: 'actor' | 'director', index: number): TalentPerson => {
    for (let attempt = 0; attempt < 80; attempt++) {
      const seed = `${seedBase}|${type}|${index}|${attempt}`;

      const gender: 'Male' | 'Female' = stableInt(`${seed}|gender`, 0, 1) === 0 ? 'Male' : 'Female';
      const name = buildName(gender, seed);
      const id = `rookie:${options.year}:${type}:${index}:${attempt}`;

      if (usedNames.has(name) || usedIds.has(id)) continue;

      const genres = buildGenres(type, seed);
      const nationality = mustPick(NATIONALITIES, `${seed}|nation`);
      const race = mustPick(RACES, `${seed}|race`);

      const age =
        type === 'actor'
          ? stableInt(`${seed}|age`, 18, 28)
          : stableInt(`${seed}|age`, 25, 37);

      const experience = stableInt(`${seed}|xpRoll`, 0, 99) < (type === 'actor' ? 85 : 75) ? 0 : 1;
      const reputation =
        type === 'actor'
          ? stableInt(`${seed}|rep`, 18, 45)
          : stableInt(`${seed}|rep`, 22, 47);

      const careerStage = determineCareerStage(age, experience, reputation);
      const marketValue = generateMarketValue(age, experience, reputation, type);

      const debut: TalentPerson = {
        id,
        name,
        type,
        age,
        gender,
        race,
        nationality,
        experience,
        reputation,
        marketValue,
        contractStatus: 'available',
        genres,
        specialties: genres.slice(0, Math.min(3, genres.length)),
        careerStage,
        availability: availabilityForYear(options.year),
        filmography: [],
        biography: '',
        archetype: type === 'director' ? 'Debut director' : 'Newcomer actor',
        narratives: [],
        movementTags: [],
        quirks: [],
        isNotable: false,
        careerStartYear: options.year,
        publicImage: Math.min(100, Math.round(reputation * 0.9)),
        fame: type === 'actor' ? Math.min(100, Math.round(reputation * 0.6)) : undefined,
        burnoutLevel: 0,
        studioLoyalty: {},
        chemistry: {},
        futureHolds: [],
        recentProjects: [],
      };

      debut.biography = buildDebutBiography(debut, options.year, seed);

      usedNames.add(name);
      usedIds.add(id);
      return debut;
    }

    // Fallback (should be extremely unlikely).
    const seed = `${seedBase}|${type}|${index}|fallback`;
    const gender: 'Male' | 'Female' = stableInt(`${seed}|gender`, 0, 1) === 0 ? 'Male' : 'Female';
    const name = buildName(gender, seed);
    const id = `rookie:${options.year}:${type}:${index}:fallback`;

    const genres = buildGenres(type, seed);
    const nationality = mustPick(NATIONALITIES, `${seed}|nation`);
    const race = mustPick(RACES, `${seed}|race`);

    const age = type === 'actor' ? stableInt(`${seed}|age`, 18, 28) : stableInt(`${seed}|age`, 25, 37);
    const experience = 0;
    const reputation = type === 'actor' ? stableInt(`${seed}|rep`, 18, 45) : stableInt(`${seed}|rep`, 22, 47);

    const careerStage = determineCareerStage(age, experience, reputation);

    const debut: TalentPerson = {
      id,
      name,
      type,
      age,
      gender,
      race,
      nationality,
      experience,
      reputation,
      marketValue: generateMarketValue(age, experience, reputation, type),
      contractStatus: 'available',
      genres,
      specialties: genres.slice(0, Math.min(3, genres.length)),
      careerStage,
      availability: availabilityForYear(options.year),
      filmography: [],
      biography: '',
      archetype: type === 'director' ? 'Debut director' : 'Newcomer actor',
      narratives: [],
      movementTags: [],
      quirks: [],
      isNotable: false,
      careerStartYear: options.year,
    };

    debut.biography = buildDebutBiography(debut, options.year, seed);

    usedNames.add(name);
    usedIds.add(id);
    return debut;
  };

  for (let i = 0; i < options.actorCount; i++) {
    out.push(makeDebut('actor', i));
  }

  for (let i = 0; i < options.directorCount; i++) {
    out.push(makeDebut('director', i));
  }

  return out;
}
