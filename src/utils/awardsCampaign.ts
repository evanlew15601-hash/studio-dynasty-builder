import type { AwardCategoryDefinition, AwardShowMedium } from '@/data/AwardsSchedule';
import type { AwardsCampaign, Project } from '@/types/game';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function absWeekIndex(week: number, year: number): number {
  return (year * 52) + week;
}

function isTvProject(project: Project): boolean {
  return project.type === 'series' || project.type === 'limited-series';
}

export function getAwardsCampaignTargetTokens(
  focus: AwardsCampaign['focus'],
  medium: AwardShowMedium
): string[] {
  if (focus === 'acting') {
    return ['actor', 'actress', 'supporting'];
  }

  if (focus === 'craft') {
    return [
      'cinematography',
      'editing',
      'sound',
      'visual',
      'effects',
      'production design',
      'costume',
      'makeup',
      'hairstyl',
      'score',
      'song',
    ];
  }

  // prestige (default)
  return medium === 'tv'
    ? ['best drama series', 'best comedy series', 'best limited series', 'director', 'directing', 'writing']
    : ['best picture', 'best film', 'picture', 'director', 'directing', 'writing', 'screenplay'];
}

function isCategoryTargeted(campaign: AwardsCampaign, categoryName: string): boolean {
  const targets = campaign.targetCategories || [];
  if (targets.length === 0) return false;

  const categoryLower = categoryName.toLowerCase();

  return targets.some((t) => {
    const tl = String(t || '').toLowerCase().trim();
    if (!tl) return false;
    return categoryLower.includes(tl);
  });
}

function isAboveTheLineCategory(categoryLower: string): boolean {
  return (
    categoryLower.includes('picture') ||
    categoryLower.includes('film') ||
    categoryLower.includes('director') ||
    categoryLower.includes('directing') ||
    categoryLower.includes('actor') ||
    categoryLower.includes('actress') ||
    categoryLower.includes('screenplay') ||
    categoryLower.includes('writing')
  );
}

function computeVoterInterest(params: {
  project: Project;
  categoryDef: AwardCategoryDefinition;
  medium: AwardShowMedium;
}): number {
  const { project, categoryDef, medium } = params;

  // Voters usually care more about above-the-line categories; for technical categories
  // campaigns can move the needle a bit more consistently.
  const categoryLower = categoryDef.name.toLowerCase();
  const aboveTheLine = isAboveTheLineCategory(categoryLower);

  const critics = project.metrics?.criticsScore ?? 0;
  const criticsInterest = clamp((critics - 55) / 35, 0, 1);

  const criticalPotential = project.script?.characteristics?.criticalPotential ?? 5;
  const cpInterest = clamp((criticalPotential - 4) / 6, 0, 1);

  let genreInterest = 1;

  if (aboveTheLine) {
    const genre = (project.script?.genre || '').toLowerCase();

    if (medium === 'tv') {
      // TV voters reward prestige drama and acclaimed comedy.
      if (genre === 'drama') genreInterest = 1;
      else if (genre === 'comedy') genreInterest = categoryLower.includes('comedy') ? 1 : 0.75;
      else genreInterest = 0.7;
    } else {
      // Film voters have a strong prestige bias.
      if (genre === 'drama' || genre === 'biography' || genre === 'historical') genreInterest = 1;
      else if (genre === 'comedy') genreInterest = categoryLower.includes('comedy') ? 1 : 0.7;
      else if (genre === 'animation') genreInterest = categoryLower.includes('animated') ? 1 : 0.65;
      else genreInterest = 0.55;
    }
  }

  const base = 0.2 + (criticsInterest * 0.55) + (cpInterest * 0.25);
  return clamp(base, 0, 1) * genreInterest;
}

export function computeAwardsCampaignBoost(params: {
  project: Project;
  categoryDef: AwardCategoryDefinition;
  medium: AwardShowMedium;
  week: number;
  year: number;
}): number {
  const { project, categoryDef, medium, week, year } = params;

  const campaign = project.awardsCampaign;
  if (!campaign) return 0;
  if ((campaign.weeksRemaining ?? 0) <= 0) return 0;

  const mediumOk = medium === 'tv' ? isTvProject(project) : !isTvProject(project);
  if (!mediumOk) return 0;

  const budget = campaign.budget ?? 0;
  if (!Number.isFinite(budget) || budget <= 0) return 0;

  const budgetSpent = clamp(campaign.budgetSpent ?? 0, 0, budget);
  const effectiveSpent = clamp(Math.max(budgetSpent, budget * 0.05), 0, budget);

  // Diminishing returns: normalize to a 0..1 signal with a soft cap around $5M.
  const budgetNorm = clamp(
    Math.log1p(effectiveSpent / 250_000) / Math.log1p(5_000_000 / 250_000),
    0,
    1
  );

  const effectiveness = clamp((campaign.effectiveness ?? 50) / 100, 0, 1);

  // Timing: starting late is heavily penalized (ballots form early).
  // If startedWeek/Year are missing (legacy saves), infer from duration progress.
  const inferredActiveWeeks = Math.max(0, (campaign.duration ?? 0) - (campaign.weeksRemaining ?? 0));

  const activeWeeks = (typeof campaign.startedWeek === 'number' && typeof campaign.startedYear === 'number')
    ? Math.max(0, absWeekIndex(week, year) - absWeekIndex(campaign.startedWeek, campaign.startedYear))
    : inferredActiveWeeks;

  const timeFactor = clamp(activeWeeks / 4, 0, 1);

  const targeted = isCategoryTargeted(campaign, categoryDef.name);
  const targetMultiplier = targeted ? 1 : 0.25;

  const voterInterest = computeVoterInterest({ project, categoryDef, medium });

  // Max boost is modest; campaigns should help good contenders rather than create them.
  const maxBoost = 12;
  const boost = maxBoost * budgetNorm * effectiveness * timeFactor * targetMultiplier * voterInterest;

  return clamp(boost, 0, maxBoost);
}
