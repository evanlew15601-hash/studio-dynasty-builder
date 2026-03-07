import type { GameState, Genre, TalentAward, TalentPerson } from '@/types/game';
import { TalentGenerator } from '@/data/TalentGenerator';
import { CORE_TALENT_BIBLE, WorldTalentBlueprint } from '@/data/WorldBible';

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

function awardToTalentAward(talentId: string, a: NonNullable<WorldTalentBlueprint['awards']>[number]): TalentAward {
  return {
    id: `hist-award:${talentId}:${a.ceremony}:${a.category}:${a.year}:${a.projectTitle}`,
    talentId,
    projectId: `hist-project:${a.projectTitle}:${a.year}`,
    projectTitle: a.projectTitle,
    category: a.category,
    ceremony: a.ceremony,
    year: a.year,
    prestige: a.prestige,
    reputationBoost: Math.max(1, Math.round(a.prestige * 0.6)),
    marketValueBoost: Math.max(0, Math.round(a.prestige * 0.4)),
  };
}

function relationshipToChemistry(type: NonNullable<TalentPerson['relationships']>[string]): number {
  switch (type) {
    case 'romantic':
      return 60;
    case 'friendly':
      return 25;
    case 'mentor-mentee':
      return 30;
    case 'professional':
      return 12;
    case 'rivals':
      return -35;
    case 'hostile':
      return -65;
    default:
      return 0;
  }
}

function ensureGenres(genres: Genre[]): Genre[] {
  // Defensive: make sure genres are unique and non-empty.
  const unique = Array.from(new Set(genres));
  return unique.length > 0 ? unique : (['drama'] as Genre[]);
}

function generateLightFilmography(t: WorldTalentBlueprint, currentYear: number): NonNullable<TalentPerson['filmography']> {
  const start = Math.max(t.careerStartYear, currentYear - 25);
  const end = currentYear - 1;
  const years = [start, Math.min(end, start + 4), Math.min(end, start + 9), Math.min(end, currentYear - 3)].filter(
    (y, i, arr) => y >= 1980 && arr.indexOf(y) === i
  );

  const mkTitle = (y: number, i: number) => {
    const key = t.genres[i % t.genres.length] || 'drama';
    const base = {
      drama: ['Quiet', 'River', 'House', 'Promise', 'Ashes'],
      thriller: ['Edge', 'Trap', 'Signal', 'Shadow', 'Witness'],
      crime: ['Razor', 'Ledger', 'City', 'Heist', 'Syndicate'],
      comedy: ['Weekend', 'Lucky', 'Roommate', 'Mistake', 'Recipe'],
      horror: ['Candle', 'Hollow', 'Grave', 'Mirror', 'Night'],
      'sci-fi': ['Nova', 'Orbit', 'Code', 'Echo', 'Future'],
      romance: ['Kiss', 'Letters', 'Dance', 'Forever', 'Moonlight'],
      historical: ['Crown', 'Empire', 'Banner', 'Oath', 'March'],
      action: ['Strike', 'Fury', 'Steel', 'Thunder', 'Vigil'],
      adventure: ['Frontier', 'Quest', 'Isle', 'Trail', 'Compass'],
      fantasy: ['Spell', 'Realm', 'Dragon', 'Myth', 'Crown'],
      documentary: ['Portrait', 'Voices', 'Archive', 'Still', 'Witness'],
      animation: ['Starlight', 'Clockwork', 'Garden', 'Skyship', 'Dream'],
      musical: ['Encore', 'Spotlight', 'Harmony', 'Overture', 'Rhythm'],
      western: ['Dust', 'Outrider', 'Canyon', 'Saddle', 'Reckoning'],
      war: ['Trench', 'Signal', 'Letters', 'Front', 'Armistice'],
      biography: ['The Life of', 'Blueprint', 'Legacy', 'Firebrand', 'Chapters'],
      mystery: ['The Case of', 'Missing', 'Cipher', 'The Third Door', 'Cold Room'],
      superhero: ['Guardian', 'Vanguard', 'Sentinel', 'Apex', 'Dawn'],
      family: ['Homeward', 'Wonder Park', 'The Great Day', 'Best Friends', 'Starlit'],
      sports: ['Final Match', 'Underdog', 'Overtime', 'The Run', 'Champions'],
    } as const;

    const words = (base as any)[key] || base.drama;
    const w = words[(y + i + t.name.length) % words.length];
    if (w === 'The Life of') return `The Life of ${t.name.split(' ')[0]}`;
    if (w === 'The Case of') return `The Case of ${t.name.split(' ')[1]}`;
    return `${w} (${y})`;
  };

  return years.map((y, i) => ({
    projectId: `hist-project:${t.slug}:${y}:${i}`,
    title: mkTitle(y, i),
    role: t.type === 'director' ? 'Director' : 'Lead Actor',
    year: y,
    boxOffice: t.type === 'director' ? 60_000_000 + (i * 20_000_000) : 35_000_000 + (i * 15_000_000),
  }));
}

function buildCoreTalent(currentYear: number): TalentPerson[] {
  const idForSlug = (slug: string) => `core:${slug}`;

  // First pass: create base people.
  const people: TalentPerson[] = CORE_TALENT_BIBLE.map((b) => {
    const id = idForSlug(b.slug);
    const age = Math.max(18, currentYear - b.birthYear);
    const experience = Math.max(0, currentYear - b.careerStartYear);
    const careerStage = determineCareerStage(age, experience, b.reputation);

    const filmography = (b.filmography || generateLightFilmography(b, currentYear)).map((f) => ({
      projectId: f.projectId || `hist-project:${f.title}:${f.year}`,
      title: f.title,
      role: f.role,
      year: f.year,
      boxOffice: f.boxOffice,
    }));

    const awards = (b.awards || []).map((a) => awardToTalentAward(id, a));

    const baseBio = `${b.archetype}. ${b.narratives.join(' · ')}.`;

    return {
      id,
      name: b.name,
      type: b.type,
      age,
      gender: b.gender,
      race: b.race,
      nationality: b.nationality,
      experience,
      reputation: b.reputation,
      marketValue: generateMarketValue(age, experience, b.reputation, b.type),
      contractStatus: 'available',
      genres: ensureGenres(b.genres),
      specialties: ensureGenres(b.genres).slice(0, Math.min(3, b.genres.length)),
      awards,
      traits: [...(b.quirks || []), ...b.narratives].slice(0, 8),
      careerStage,
      availability: {
        start: new Date(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      burnoutLevel: b.tier === 'marquee' ? 10 : 15,
      studioLoyalty: {},
      chemistry: {},
      futureHolds: [],
      recentProjects: [],
      biography: baseBio,
      archetype: b.archetype,
      narratives: b.narratives,
      movementTags: b.movementTags,
      careerStartYear: b.careerStartYear,
      quirks: b.quirks,
      isNotable: true,
      publicImage: b.publicImage,
      fame: b.type === 'actor' ? (b.fame ?? Math.min(100, Math.round(b.reputation * 0.75))) : undefined,
      filmography,
    };
  });

  const bySlug = new Map(CORE_TALENT_BIBLE.map((b) => [b.slug, idForSlug(b.slug)]));
  const byId = new Map(people.map((p) => [p.id, p] as const));

  // Second pass: relationships + chemistry
  for (const b of CORE_TALENT_BIBLE) {
    const id = idForSlug(b.slug);
    const person = byId.get(id);
    if (!person || !b.relationships || b.relationships.length === 0) continue;

    person.relationships = person.relationships || {};
    person.relationshipNotes = person.relationshipNotes || {};
    person.chemistry = person.chemistry || {};

    for (const rel of b.relationships) {
      const otherId = bySlug.get(rel.with);
      if (!otherId) continue;

      person.relationships[otherId] = rel.type;
      person.relationshipNotes[otherId] = rel.note;
      person.chemistry[otherId] = relationshipToChemistry(rel.type);

      // Make it (mostly) bidirectional to avoid one-sided UI holes.
      const other = byId.get(otherId);
      if (other) {
        other.relationships = other.relationships || {};
        other.relationshipNotes = other.relationshipNotes || {};
        other.chemistry = other.chemistry || {};

        if (!other.relationships[id]) other.relationships[id] = rel.type;
        if (!other.relationshipNotes[id]) other.relationshipNotes[id] = rel.note;
        if (!other.chemistry[id]) other.chemistry[id] = relationshipToChemistry(rel.type);
      }
    }
  }

  return people;
}

export function generateInitialTalentPool(options: {
  currentYear: number;
  actorCount?: number;
  directorCount?: number;
}): TalentPerson[] {
  const { currentYear } = options;

  // Core: 100-200 anchor figures.
  const core = buildCoreTalent(currentYear);

  // Procedural filler: smaller, primarily to give the market depth.
  const fillerActorCount = Math.max(0, (options.actorCount ?? 80));
  const fillerDirectorCount = Math.max(0, (options.directorCount ?? 20));

  const gen = new TalentGenerator();
  const filler = gen.generateTalentPool(fillerActorCount, fillerDirectorCount).map((t) => ({
    ...t,
    isNotable: false,
    // Ensure filler never silently wipes our lore fields.
    narratives: t.narratives || [],
  }));

  return [...core, ...filler];
}

/**
 * Convenience: construct a new GameState with a rebuilt core universe.
 * Useful for dev tools / future "restart universe" UI.
 */
export function rebuildWorldCharacters(state: GameState): GameState {
  return {
    ...state,
    talent: generateInitialTalentPool({ currentYear: state.currentYear }),
  };
}
