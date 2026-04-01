import type { GameState, TalentPerson } from '@/types/game';
import { stablePick } from '@/utils/stablePick';
import { stableInt } from '@/utils/stableRandom';
import { determineCareerStage } from '@/utils/careerStage';

function careerStageFor(t: TalentPerson): NonNullable<TalentPerson['careerStage']> {
  const age = t.age || 30;
  const experience = t.experience || 0;
  const reputation = t.reputation || 50;
  return determineCareerStage(age, experience, reputation) ?? 'established';
}

function pronounsFor(t: TalentPerson): { subject: string; object: string; possessive: string } {
  if (t.gender === 'Male') return { subject: 'he', object: 'him', possessive: 'his' };
  if (t.gender === 'Female') return { subject: 'she', object: 'her', possessive: 'her' };
  return { subject: 'they', object: 'them', possessive: 'their' };
}

function buildFallbackBiography(t: TalentPerson): string {
  const seed = `${t.id}|bio`;

  const typeLabel = t.type === 'director' ? 'director' : t.type === 'actor' ? 'actor' : 'talent';
  const primaryGenre = (t.genres || [])[0] || 'drama';
  const secondaryGenre = (t.genres || [])[1];

  const stage = t.careerStage || careerStageFor(t);
  const p = pronounsFor(t);

  const intros = [
    `${t.name} is a ${typeLabel} best known for ${p.possessive} work in ${primaryGenre}.`,
    `In the ${primaryGenre} lane, ${t.name} built a reputation as a ${typeLabel} with sharp instincts.`,
    `${t.name} has been working steadily for years, carving out a place in ${primaryGenre} projects.`,
  ];

  const descriptors = [
    'critically admired',
    'audience-approved',
    'festival-favorite',
    'surprisingly mainstream',
    'risk-taking',
    'quietly devastating',
    'unexpectedly funny',
  ];

  const specialtiesActor = [
    'small choices that land on camera',
    'controlled intensity under pressure',
    'natural rhythm and timing',
    'emotional clarity without overselling it',
    'making thin roles feel specific',
  ];

  const specialtiesDirector = [
    'tone control and clean storytelling',
    'performance-first direction',
    'tight pacing and decisive edits',
    'strong pre-production planning',
    'making limited resources look intentional',
  ];

  const struggleLines = [
    `${p.subject[0].toUpperCase()}${p.subject.slice(1)} is known for being prepared, fast, and hard to rattle.`,
    `Casting teams trust ${p.object} because the work shows up on the day.`,
    `Colleagues describe ${p.object} as demanding about craft, not attention.`,
    `${p.subject[0].toUpperCase()}${p.subject.slice(1)} tends to pick material with a clear point of view rather than chasing trends.`,
  ];

  const stageLines: Record<string, string[]> = {
    unknown: [`For now, ${p.subject} is still more rumor than résumé, but the momentum is real.`],
    rising: [`These days, ${p.subject} is widely seen as a name-to-watch.`],
    established: [`These days, ${p.subject} is a steady presence studios feel safe building around.`],
    veteran: [`These days, ${p.subject} brings veteran discipline crews quietly lean on.`],
    legend: [`These days, ${p.subject} is spoken about like a living reference point.`],
  };

  const intro = stablePick(intros, `${seed}|intro`) ?? intros[0];
  const descriptor = stablePick(descriptors, `${seed}|desc`) ?? descriptors[0];

  const specPool = t.type === 'director' ? specialtiesDirector : specialtiesActor;
  const specialty = stablePick(specPool, `${seed}|spec`) ?? specPool[0];

  const struggle = stablePick(struggleLines, `${seed}|struggle`) ?? struggleLines[0];
  const stageLine = stablePick(stageLines[stage] || stageLines.established, `${seed}|stage`) ?? stageLines.established[0];

  const secondGenreLine = secondaryGenre
    ? `Most at home in ${primaryGenre} and ${secondaryGenre}, ${t.name.split(' ')[0]} tends to avoid projects that don’t know what they are.`
    : undefined;

  const rep = t.reputation ?? 50;
  const repLine =
    rep >= 80
      ? `Awards talk tends to follow ${p.object} whether ${p.subject} wants it or not.`
      : rep <= 40
        ? `${p.subject[0].toUpperCase()}${p.subject.slice(1)} has had to rebuild momentum after a few high-profile misses.`
        : undefined;

  const closerOptions = [
    `In industry terms, ${p.subject} is a ${descriptor} ${typeLabel} with a reputation for ${specialty}.`,
    `In industry terms, ${p.subject} is a ${descriptor} ${typeLabel} who keeps finding the note that makes a scene work.`,
    `In industry terms, ${p.subject} is a ${descriptor} ${typeLabel}—reliable, specific, and hard to replace once cast.`,
  ];

  const closer = stablePick(closerOptions, `${seed}|closer`) ?? closerOptions[0];

  const parts = [intro, secondGenreLine, struggle, repLine, stageLine, closer].filter(Boolean) as string[];

  // Keep bios to 3–5 sentences.
  const targetCount = 3 + stableInt(`${seed}|sentences`, 0, 2);
  return parts.slice(0, targetCount).join(' ');
}

export function ensureTalentLore(gameState: GameState): GameState {
  const patchTalent = (t: TalentPerson): TalentPerson => {
    if (typeof t.biography === 'string' && t.biography.trim().length > 0) return t;

    return {
      ...t,
      biography: buildFallbackBiography(t),
    };
  };

  return {
    ...gameState,
    talent: (gameState.talent || []).map(patchTalent),
  };
}
