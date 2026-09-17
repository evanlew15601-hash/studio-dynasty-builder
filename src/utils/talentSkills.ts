import type { ActingSkills, DirectingSkills, Genre, Project, ScriptCharacter, TalentPerson } from '@/types/game';
import { isDirectorRole } from '@/utils/scriptRoles';
import { stableInt } from '@/utils/stableRandom';

export const ACTING_SKILL_LABELS: Array<{ key: keyof ActingSkills; label: string }> = [
  { key: 'dramaticRange', label: 'Dramatic Range' }, { key: 'emotionalDepth', label: 'Emotional Depth' },
  { key: 'subtlety', label: 'Subtlety' }, { key: 'comedicTiming', label: 'Comedic Timing' },
  { key: 'physicality', label: 'Physicality' }, { key: 'improvisation', label: 'Improvisation' },
  { key: 'voiceAndDiction', label: 'Voice & Diction' }, { key: 'chemistry', label: 'Chemistry' },
  { key: 'screenPresence', label: 'Screen Presence' }, { key: 'consistency', label: 'Consistency' },
  { key: 'professionalism', label: 'Professionalism' }, { key: 'genreVersatility', label: 'Genre Versatility' },
];

export const DIRECTING_SKILL_LABELS: Array<{ key: keyof DirectingSkills; label: string }> = [
  { key: 'visualStorytelling', label: 'Visual Storytelling' }, { key: 'performanceDirection', label: 'Performance Direction' },
  { key: 'blocking', label: 'Blocking' }, { key: 'pacing', label: 'Pacing' },
  { key: 'toneControl', label: 'Tone Control' }, { key: 'shotDesign', label: 'Shot Design' },
  { key: 'editingRhythm', label: 'Editing Rhythm' }, { key: 'productionManagement', label: 'Production Management' },
  { key: 'budgetDiscipline', label: 'Budget Discipline' }, { key: 'collaboration', label: 'Collaboration' },
  { key: 'genreFluency', label: 'Genre Fluency' }, { key: 'consistency', label: 'Consistency' },
];

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

type SkillContext = Pick<TalentPerson, 'reputation' | 'experience'> & {
  age?: number;
  genres?: Genre[];
  specialties?: Genre[];
  archetype?: string;
  traits?: string[];
  narratives?: string[];
  quirks?: string[];
  directingStyle?: string;
  temperament?: string;
  budgetApproach?: string;
};

const skillBase = (talent: SkillContext) =>
  clamp(16 + (talent.reputation || 50) * 0.58 + (talent.experience || 0) * 1.55);

function contextText(talent: SkillContext): string {
  return [
    ...(talent.genres || []),
    ...(talent.specialties || []),
    talent.archetype,
    ...(talent.traits || []),
    ...(talent.narratives || []),
    ...(talent.quirks || []),
    talent.directingStyle,
    talent.temperament,
    talent.budgetApproach,
  ].filter(Boolean).join(' ').toLowerCase();
}

function addProfileBonuses<T extends string>(keys: T[], text: string, profiles: Array<{ terms: string[]; bonuses: Partial<Record<T, number>> }>): Record<T, number> {
  const bonuses = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  for (const profile of profiles) {
    if (profile.terms.some((term) => text.includes(term))) {
      for (const [key, value] of Object.entries(profile.bonuses) as Array<[T, number]>) {
        bonuses[key] += value;
      }
    }
  }
  return bonuses;
}

function makeSkillSet<T extends string>(
  keys: T[],
  talent: SkillContext,
  seed: string,
  profiles: Array<{ terms: string[]; bonuses: Partial<Record<T, number>> }>,
): Record<T, number> {
  const base = skillBase(talent);
  const bonuses = addProfileBonuses(keys, contextText(talent), profiles);
  return Object.fromEntries(keys.map((key, index) => [
    key,
    clamp(base + bonuses[key] + stableInt(`${seed}|${key}|${index}`, -4, 4)),
  ])) as Record<T, number>;
}

const ACTING_KEYS: Array<keyof ActingSkills> = [
  'dramaticRange', 'emotionalDepth', 'subtlety', 'comedicTiming', 'physicality', 'improvisation',
  'voiceAndDiction', 'chemistry', 'screenPresence', 'consistency', 'professionalism', 'genreVersatility',
];

const DIRECTING_KEYS: Array<keyof DirectingSkills> = [
  'visualStorytelling', 'performanceDirection', 'blocking', 'pacing', 'toneControl', 'shotDesign',
  'editingRhythm', 'productionManagement', 'budgetDiscipline', 'collaboration', 'genreFluency', 'consistency',
];

const ACTING_PROFILES = [
  { terms: ['drama', 'historical', 'biography', 'classical', 'prestige', 'theater'], bonuses: { dramaticRange: 8, emotionalDepth: 10, subtlety: 8, voiceAndDiction: 6 } },
  { terms: ['comedy', 'comic', 'improv', 'funny', 'wry'], bonuses: { comedicTiming: 12, improvisation: 9, chemistry: 5, dramaticRange: -3 } },
  { terms: ['action', 'adventure', 'physical', 'athlete', 'stunt', 'bruiser'], bonuses: { physicality: 12, screenPresence: 6, consistency: 4, subtlety: -3 } },
  { terms: ['romance', 'romantic', 'warm', 'heart'], bonuses: { chemistry: 10, emotionalDepth: 6, screenPresence: 4 } },
  { terms: ['horror', 'thriller', 'mystery', 'noir', 'unnerving', 'intense'], bonuses: { subtlety: 8, screenPresence: 7, emotionalDepth: 5, comedicTiming: -2 } },
  { terms: ['charismatic', 'star', 'leading', 'box office', 'effervescent'], bonuses: { screenPresence: 12, chemistry: 7, professionalism: 3 } },
  { terms: ['method', 'intense', 'raw', 'powerhouse'], bonuses: { emotionalDepth: 11, dramaticRange: 6, professionalism: 3, consistency: -2 } },
  { terms: ['professional', 'collaborative', 'reliable', 'disciplined'], bonuses: { professionalism: 10, consistency: 8, chemistry: 4 } },
  { terms: ['versatile', 'range', 'adaptable'], bonuses: { genreVersatility: 12, dramaticRange: 6, improvisation: 4 } },
  { terms: ['unpredictable', 'volatile', 'eccentric'], bonuses: { improvisation: 8, consistency: -7, professionalism: -4 } },
  { terms: ['voice', 'music', 'musical', 'linguistic'], bonuses: { voiceAndDiction: 11, comedicTiming: 4, genreVersatility: 4 } },
];

const DIRECTING_PROFILES = [
  { terms: ['visual', 'auteur', 'surreal', 'experimental', 'epic', 'maximalist'], bonuses: { visualStorytelling: 12, shotDesign: 10, toneControl: 5, budgetDiscipline: -4 } },
  { terms: ['actor', 'performance', 'humanist', 'character-driven', 'character driven'], bonuses: { performanceDirection: 12, collaboration: 9, toneControl: 5 } },
  { terms: ['action', 'blockbuster', 'setpiece', 'practical', 'adventure'], bonuses: { blocking: 9, shotDesign: 9, pacing: 8, productionManagement: 4 } },
  { terms: ['comedy', 'comic', 'punchline', 'funny'], bonuses: { pacing: 10, toneControl: 9, collaboration: 5, editingRhythm: 6 } },
  { terms: ['thriller', 'mystery', 'noir', 'horror'], bonuses: { pacing: 8, editingRhythm: 9, toneControl: 8, visualStorytelling: 4 } },
  { terms: ['technical', 'detail-oriented', 'technical perfectionist'], bonuses: { shotDesign: 10, blocking: 8, consistency: 8, productionManagement: 5 } },
  { terms: ['disciplined', 'fixer', 'efficient', 'practical problem-solver', 'fiscally responsible'], bonuses: { productionManagement: 12, budgetDiscipline: 11, consistency: 8 } },
  { terms: ['undisciplined', 'runaway', 'refuses test', 'dreamer'], bonuses: { visualStorytelling: 7, toneControl: 5, productionManagement: -10, budgetDiscipline: -8, consistency: -6 } },
  { terms: ['genre specialist', 'genre', 'specialist'], bonuses: { genreFluency: 12, toneControl: 6, consistency: 4 } },
  { terms: ['collaborative', 'inspiring', 'patient teacher'], bonuses: { collaboration: 11, performanceDirection: 7, consistency: 4 } },
  { terms: ['fast-rising', 'sharp pacing', 'tight, twisty'], bonuses: { pacing: 10, editingRhythm: 8 } },
];

export function buildTalentSkills(type: 'actor', talent: SkillContext, seed: string): ActingSkills;
export function buildTalentSkills(type: 'director', talent: SkillContext, seed: string): DirectingSkills;
export function buildTalentSkills(type: 'actor' | 'director', talent: SkillContext, seed: string): ActingSkills | DirectingSkills {
  if (type === 'director') {
    return makeSkillSet(DIRECTING_KEYS, talent, seed, DIRECTING_PROFILES) as DirectingSkills;
  }
  return makeSkillSet(ACTING_KEYS, talent, seed, ACTING_PROFILES) as ActingSkills;
}

export function getActingSkills(talent: TalentPerson): ActingSkills {
  return talent.actingSkills || buildTalentSkills('actor', talent, talent.id) as ActingSkills;
}

export function getDirectingSkills(talent: TalentPerson): DirectingSkills {
  return talent.directingSkills || buildTalentSkills('director', talent, talent.id) as DirectingSkills;
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 50;
}

export function getActingSkillAverage(talent: TalentPerson, genre?: Genre): number {
  const genreBonus = genre && talent.genres?.includes(genre) ? 4 : 0;
  return clamp(average(Object.values(getActingSkills(talent))) + genreBonus);
}

export function getDirectingSkillAverage(talent: TalentPerson, genre?: Genre): number {
  const genreBonus = genre && talent.genres?.includes(genre) ? 4 : 0;
  return clamp(average(Object.values(getDirectingSkills(talent))) + genreBonus);
}

function assignedTalentIds(project: Project, role: 'actor' | 'director'): string[] {
  return (project.script?.characters || [])
    .filter((character: ScriptCharacter) => role === 'director' ? isDirectorRole(character) : !isDirectorRole(character) && character.requiredType === 'actor')
    .map((character) => character.assignedTalentId)
    .filter((id): id is string => !!id);
}

export function getProjectTalentPerformance(project: Project, talentPool: TalentPerson[]): { acting: number; directing: number } {
  const findTalent = (id: string) => talentPool.find((talent) => talent.id === id);
  const actors = assignedTalentIds(project, 'actor').map(findTalent).filter((talent): talent is TalentPerson => !!talent && talent.type === 'actor');
  const directors = assignedTalentIds(project, 'director').map(findTalent).filter((talent): talent is TalentPerson => !!talent && talent.type === 'director');
  return {
    acting: average(actors.map((talent) => getActingSkillAverage(talent, project.script?.genre))),
    directing: average(directors.map((talent) => getDirectingSkillAverage(talent, project.script?.genre))),
  };
}