import { Project, ScriptCharacter, TalentPerson } from '@/types/game';

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
  const basePerformance = talent.reputation || 50;

  const profit = project.metrics?.boxOffice?.profit ?? 0;
  const projectSuccess = profit > 0 ? 75 : 50;

  const screenTimeMinutes = estimateScreenTimeMinutes(character, project);
  const screenTimeBonus = Math.min(20, screenTimeMinutes / 10);

  const rawScore = basePerformance + projectSuccess * 0.3 + screenTimeBonus;

  return Math.max(0, Math.min(100, rawScore));
};