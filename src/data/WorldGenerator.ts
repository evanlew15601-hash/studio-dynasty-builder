import type { GameState, Genre, TalentAward, TalentPerson } from '@/types/game';
import { TalentGenerator } from '@/data/TalentGenerator';
import { CORE_TALENT_BIBLE, WorldTalentBlueprint } from '@/data/WorldBible';
import { stableInt } from '@/utils/stableRandom';
import { stablePick } from '@/utils/stablePick';
import { determineCareerStage } from '@/utils/careerStage';

const idForSlug = (slug: string) => `core:${slug}`;

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

function generateImpliedWorldAwards(
  b: WorldTalentBlueprint,
  filmography: NonNullable<TalentPerson['filmography']>,
  currentYear: number
): NonNullable<WorldTalentBlueprint['awards']> {
  const isMarquee = b.tier === 'marquee';
  if (!isMarquee && b.reputation < 78) return [];

  const maxCount = isMarquee ? 3 : 1;
  const count = (() => {
    if (!isMarquee) return 1;
    if (b.reputation >= 88) return 3;
    if (b.reputation >= 78) return 2;
    return 1;
  })();

  const seed = `${b.slug}|impliedAwards`;
  const eligibleEnd = Math.min(currentYear - 1, b.careerStartYear + stableInt(`${seed}|end`, 6, 26));
  const eligibleStart = Math.max(b.careerStartYear + 1, eligibleEnd - 20);

  if (eligibleEnd < eligibleStart) return [];

  const ceremonies = (b.type === 'director'
    ? (['Crown', 'Critics Circle', 'Directors Circle', 'Crystal Ring', 'Britannia Screen'] as const)
    : (['Crown', 'Critics Circle', 'Performers Guild', 'Crystal Ring', 'Britannia Screen'] as const))
    .slice(0);

  const categories = (b.type === 'director'
    ? ['Best Director', 'Directing Achievement', 'Vision in Direction']
    : [
        b.gender === 'Female' ? 'Best Actress' : 'Best Actor',
        'Outstanding Performance',
        'Breakthrough Performance',
        'Ensemble Performance'
      ]);

  const prestigeMin = isMarquee ? 6 : 5;
  const prestigeMax = isMarquee ? 10 : 7;

  const pickProjectTitle = (year: number, suffix: string) => {
    const candidates = filmography
      .filter((c) => typeof c.year === 'number')
      .filter((c) => (c.year as number) <= year);

    const pool = candidates.length > 0 ? candidates : filmography;
    const chosen = stablePick(pool, `${seed}|project|${suffix}|${year}`);
    return chosen?.title || filmography[0]?.title || `${b.name.split(' ')[0]} Project`;
  };

  const out: NonNullable<WorldTalentBlueprint['awards']> = [];

  for (let i = 0; i < Math.min(maxCount, count); i++) {
    const year = stableInt(`${seed}|year|${i}`, eligibleStart, eligibleEnd);
    const ceremony = stablePick(ceremonies, `${seed}|ceremony|${i}`) || ceremonies[0];
    const category = stablePick(categories, `${seed}|category|${i}`) || categories[0];

    out.push({
      year,
      ceremony,
      category,
      prestige: stableInt(`${seed}|prestige|${i}`, prestigeMin, prestigeMax),
      projectTitle: pickProjectTitle(year, String(i)),
    });
  }

  return out.sort((a, b) => a.year - b.year);
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

function joinNatural(items: string[]): string {
  const cleaned = items.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
}

function stableSample<T>(items: T[], count: number, seed: string): T[] {
  const pool = [...items];
  const out: T[] = [];

  const n = Math.max(0, Math.min(count, pool.length));
  for (let i = 0; i < n; i++) {
    const idx = stableInt(`${seed}|${i}`, 0, pool.length - 1);
    out.push(pool.splice(idx, 1)[0]);
  }

  return out;
}

function buildCoreBiography(b: WorldTalentBlueprint): string {
  const genres = ensureGenres(b.genres);
  const primary = genres[0];
  const secondary = genres[1];
  const roleLabel = b.type === 'director' ? 'director' : 'actor';

  const introTemplates = [
    `${b.name} is a ${roleLabel} best known for ${b.archetype.toLowerCase()}.`,
    `In the ${primary} lane, ${b.name} built a reputation as ${b.archetype.toLowerCase()}.`,
    `${b.name} has been working steadily since ${b.careerStartYear}, carving out a niche as ${b.archetype.toLowerCase()}.`,
    `${b.name} is one of the more recognizable names in modern ${primary}, with a reputation for being ${b.archetype.toLowerCase()}.`,
  ];

  const intro = stablePick(introTemplates, `${b.slug}|intro`) ?? introTemplates[0];

  const narrativeCount = Math.max(1, Math.min(3, stableInt(`${b.slug}|narrCount`, 1, 3)));
  const chosenNarratives = stableSample(b.narratives || [], narrativeCount, `${b.slug}|narr`);

  const quirksCount = Math.min(2, Math.max(0, stableInt(`${b.slug}|quirkCount`, 0, 2)));
  const chosenQuirks = stableSample(b.quirks || [], quirksCount, `${b.slug}|quirk`);

  const movement = (b.movementTags || []).length > 0 ? (stablePick(b.movementTags || [], `${b.slug}|movement`) as string) : undefined;

  const bits: string[] = [intro];

  if (chosenNarratives.length > 0) {
    bits.push(`Industry shorthand: ${joinNatural(chosenNarratives)}.`);
  }

  if (movement) {
    bits.push(`Often associated with the ${movement}.`);
  }

  if (secondary) {
    bits.push(`Most at home in ${primary} and ${secondary}, ${b.name.split(' ')[0]} tends to pick projects with a clear point of view.`);
  }

  if (chosenQuirks.length > 0) {
    bits.push(`On set, ${joinNatural(chosenQuirks).toLowerCase()}.`);
  }

  return bits.join(' ');
}

function generateLightFilmography(t: WorldTalentBlueprint, currentYear: number): NonNullable<TalentPerson['filmography']> {
  const start = Math.max(t.careerStartYear, currentYear - 25);
  const end = currentYear - 1;

  // If the talent is debuting this year (or later), they have no historical credits yet.
  if (start > end) return [];

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
  const activeBible = CORE_TALENT_BIBLE.filter((b) => b.careerStartYear <= currentYear);

  // First pass: create base people.
  const people: TalentPerson[] = activeBible.map((b) => {
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

    const worldAwards = (b.awards && b.awards.length > 0)
      ? b.awards
      : generateImpliedWorldAwards(b, filmography, currentYear);

    const awards = worldAwards.map((a) => awardToTalentAward(id, a));

    const baseBio = b.biography || buildCoreBiography(b);

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
        start: new Date(Date.UTC(currentYear, 0, 1)),
        end: new Date(Date.UTC(currentYear + 1, 0, 1)),
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

  return ensureCoreTalentRelationships(people);
}

export function ensureCoreTalentRelationships(people: TalentPerson[]): TalentPerson[] {
  const bySlug = new Map(CORE_TALENT_BIBLE.map((b) => [b.slug, idForSlug(b.slug)]));
  const byId = new Map(people.map((p) => [p.id, p] as const));

  // Ensure any relationship declared in the world bible is wired up for any core talent
  // that exists in the current pool (useful for future debuts / live patching).
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

      // Only wire the relationship if the other party exists in the pool.
      const other = byId.get(otherId);
      if (!other) continue;

      if (!person.relationships[otherId]) person.relationships[otherId] = rel.type;
      if (!person.relationshipNotes[otherId]) person.relationshipNotes[otherId] = rel.note;
      if (typeof person.chemistry[otherId] !== 'number') person.chemistry[otherId] = relationshipToChemistry(rel.type);

      // Make it (mostly) bidirectional to avoid one-sided UI holes.
      other.relationships = other.relationships || {};
      other.relationshipNotes = other.relationshipNotes || {};
      other.chemistry = other.chemistry || {};

      if (!other.relationships[id]) other.relationships[id] = rel.type;
      if (!other.relationshipNotes[id]) other.relationshipNotes[id] = rel.note;
      if (typeof other.chemistry[id] !== 'number') other.chemistry[id] = relationshipToChemistry(rel.type);
    }
  }

  return people;
}

export function buildCoreTalentDebutsForYear(year: number): TalentPerson[] {
  const debuts = CORE_TALENT_BIBLE.filter((b) => b.careerStartYear === year);

  return ensureCoreTalentRelationships(
    debuts.map((b) => {
      const id = idForSlug(b.slug);
      const age = Math.max(18, year - b.birthYear);
      const experience = 0;
      const careerStage = determineCareerStage(age, experience, b.reputation);

      const filmography = (b.filmography || generateLightFilmography(b, year)).map((f) => ({
        projectId: f.projectId || `hist-project:${f.title}:${f.year}`,
        title: f.title,
        role: f.role,
        year: f.year,
        boxOffice: f.boxOffice,
      }));

      const worldAwards = (b.awards && b.awards.length > 0)
        ? b.awards
        : generateImpliedWorldAwards(b, filmography, year);

      const awards = worldAwards.map((a) => awardToTalentAward(id, a));

      const baseBio = b.biography || buildCoreBiography(b);

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
          start: new Date(Date.UTC(year, 0, 1)),
          end: new Date(Date.UTC(year + 1, 0, 1)),
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
    })
  );
}

export function generateInitialTalentPool(options: {
  currentYear: number;
  actorCount?: number;
  directorCount?: number;
}): TalentPerson[] {
  const { currentYear } = options;

  // Core: 100-200 anchor figures.
  const core = buildCoreTalent(currentYear);

  // Procedural filler: optional (Cornellverse defaults to core-only).
  const fillerActorCount = Math.max(0, (options.actorCount ?? 0));
  const fillerDirectorCount = Math.max(0, (options.directorCount ?? 0));

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
