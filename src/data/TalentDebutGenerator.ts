import type { Genre, TalentPerson } from '@/types/game';
import { TalentGenerator } from '@/data/TalentGenerator';

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function buildDebutBiography(t: TalentPerson, year: number, rng: () => number): string {
  const primary = (t.genres?.[0] || 'drama') as Genre;
  const they = t.gender === 'Female' ? 'she' : t.gender === 'Male' ? 'he' : 'they';
  const them = t.gender === 'Female' ? 'her' : t.gender === 'Male' ? 'him' : 'them';

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
          `${they[0].toUpperCase()}${they.slice(1)} has an editor’s sense of rhythm and an actor-friendly way of giving notes.`,
          `${they[0].toUpperCase()}${they.slice(1)} plans cleanly and cuts ruthlessly—scenes end exactly when the story has said enough.`,
          `${they[0].toUpperCase()}${they.slice(1)} is still more rumor than filmography, but the buzz keeps repeating.`,
        ]
      : [
          `${they[0].toUpperCase()}${they.slice(1)} reads as camera-ready without feeling rehearsed.`,
          `${they[0].toUpperCase()}${they.slice(1)} has the kind of focus crews notice even on small auditions.`,
          `${they[0].toUpperCase()}${they.slice(1)} is still more rumor than résumé, but the buzz keeps repeating.`,
        ];

  const closes =
    t.type === 'director'
      ? [
          `Nobody’s calling ${them} a name yet—but one clean debut feature could lock it in.`,
          `Right now ${they}’re unproven, hungry, and cheap—exactly the kind of hire that can shift a studio’s identity in a year.`,
          `If the right project lands in ${them}’s lap, ${they} won’t stay “new” for long.`,
        ]
      : [
          `Nobody’s calling ${them} a star yet—but the first good role could make the leap feel inevitable.`,
          `Right now ${they}’re cheap, hungry, and unclaimed—exactly the kind of talent that can change a slate with one breakout.`,
          `If the right director spots ${them}, ${they} won’t stay “new” for long.`,
        ];

  return `${pick(rng, openings)} ${pick(rng, hooks)} ${pick(rng, closes)}`;
}

export function generateProceduralDebuts(options: {
  existingTalent: TalentPerson[];
  year: number;
  actorCount: number;
  directorCount: number;
}): TalentPerson[] {
  const gen = new TalentGenerator();
  const rng = Math.random;

  const usedIds = new Set(options.existingTalent.map((t) => t.id));
  const usedNames = new Set(options.existingTalent.map((t) => t.name));

  const out: TalentPerson[] = [];

  const makeUnique = <T extends TalentPerson>(factory: () => T): T => {
    for (let i = 0; i < 120; i++) {
      const t = factory();
      if (!usedIds.has(t.id) && !usedNames.has(t.name)) {
        usedIds.add(t.id);
        usedNames.add(t.name);
        return t;
      }
    }
    return factory();
  };

  for (let i = 0; i < options.actorCount; i++) {
    const base = makeUnique(() => gen.generateActor());

    const age = 18 + Math.floor(rng() * 11); // 18-28
    const experience = rng() < 0.85 ? 0 : 1;
    const reputation = 18 + Math.floor(rng() * 28); // 18-45

    out.push({
      ...base,
      age,
      experience,
      reputation,
      careerStartYear: options.year,
      careerStage: gen.determineCareerStage(age, experience, reputation),
      marketValue: gen.generateMarketValue(age, experience, reputation, 'actor'),
      filmography: [],
      biography: buildDebutBiography({ ...base, age, experience, reputation }, options.year, rng),
      isNotable: false,
      contractStatus: 'available',
    });
  }

  for (let i = 0; i < options.directorCount; i++) {
    const base = makeUnique(() => gen.generateDirector());

    const age = 25 + Math.floor(rng() * 13); // 25-37
    const experience = rng() < 0.75 ? 0 : 1;
    const reputation = 22 + Math.floor(rng() * 26); // 22-47

    out.push({
      ...base,
      age,
      experience,
      reputation,
      careerStartYear: options.year,
      careerStage: gen.determineCareerStage(age, experience, reputation),
      marketValue: gen.generateMarketValue(age, experience, reputation, 'director'),
      filmography: [],
      biography: buildDebutBiography({ ...base, age, experience, reputation }, options.year, rng),
      isNotable: false,
      contractStatus: 'available',
    });
  }

  return out;
}
