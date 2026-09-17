import { Project, ScriptCharacter, TalentPerson } from '@/types/game';
import { getActingSkillAverage, getDirectingSkillAverage } from '@/utils/talentSkills';

const getBaseScreenTime = (character: ScriptCharacter): number => {
  const baseMap: Record<ScriptCharacter['importance'], number> = {
    lead: 90,
    supporting: 45,
    minor: 15,
    crew: 5
  };

  return baseMap[character.importance] ?? 15;
};

/**
 * Estimate screen time in minutes for a character within a project.
 * Used as an input into hidden performance/acting evaluations.
 */
export const estimateScreenTimeMinutes = (
  character: ScriptCharacter,
  project: Project
): number => {
  const baseTime = getBaseScreenTime(character);
  const budgetMultiplier = Math.min(
    1.5,
    (project.budget.total / 50_000_000) * 0.5 + 0.5
  );

  return Math.round(baseTime * budgetMultiplier);
};

/**
 * Calculate a 0-100 acting performance score for a specific
 * talent portraying a character in a given project.
 *
 * This mirrors the internal character popularity logic but is
 * factored out so systems like awards can make non-cosmetic
 * decisions about acting categories. The score is intended to
 * remain hidden from the main UI.
 */
export const calculateActingPerformanceScore = (
  project: Project,
  character: ScriptCharacter,
  talent: TalentPerson
): number => {
  const actingSkill = getActingSkillAverage(talent, project.script?.genre);
  const basePerformance = actingSkill * 0.72 + (talent.reputation || 50) * 0.18 + (talent.experience || 0) * 0.1;

  const profit = project.metrics?.boxOffice?.profit ?? 0;
  const projectSuccess = profit > 0 ? 75 : 50;

  const screenTimeMinutes = estimateScreenTimeMinutes(character, project);
  const screenTimeBonus = Math.min(20, screenTimeMinutes / 10);

  const rawScore = basePerformance + projectSuccess * 0.3 + screenTimeBonus;

  return Math.max(0, Math.min(100, rawScore));
};

/** Calculate the director's contribution to the film's execution and quality. */
export const calculateDirectingPerformanceScore = (
  project: Project,
  talent: TalentPerson,
): number => {
  const directingSkill = getDirectingSkillAverage(talent, project.script?.genre);
  const reputation = talent.reputation || 50;
  const experience = talent.experience || 0;
  const rawScore = directingSkill * 0.72 + reputation * 0.18 + experience * 0.1;

  return Math.max(0, Math.min(100, rawScore));
};