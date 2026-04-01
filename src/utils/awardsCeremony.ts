import type { AwardShowCeremony, AwardShowNomination } from '@/types/awardsShow';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import type { AwardCategoryDefinition } from '@/data/AwardsSchedule';
import type { GameState, Project, StudioAward } from '@/types/game';
import { getPlayerProjectIds, isPlayerOwnedProject } from '@/utils/playerProjects';
import { hashStringToUint32 } from '@/utils/stablePick';

function isTalentCategory(category: AwardCategoryDefinition | undefined): boolean {
  if (!category) return false;
  if (category.awardKind === 'talent') return true;
  if (category.talent) return true;
  return false;
}

export function buildAwardShowCeremonyForModal(
  gameState: GameState,
  showId: string,
  year: number
): AwardShowCeremony | null {
  const season = gameState.awardsSeason;
  if (!season || season.year !== year) return null;

  const record = season.ceremonyHistory?.[showId];
  if (!record) return null;

  const schedule = getAwardShowsForYear(year);
  const show = schedule.find((s) => s.id === showId) ?? schedule.find((s) => s.name === showId);

  const categoryDefByName = new Map<string, AwardCategoryDefinition>();
  for (const c of show?.categories || []) categoryDefByName.set(c.name, c);

  const allProjects = new Map<string, Project>();
  for (const p of gameState.projects || []) allProjects.set(p.id, p);
  for (const r of gameState.allReleases || []) {
    if ((r as any)?.script && !allProjects.has((r as any).id)) allProjects.set((r as any).id, r as any);
  }

  const playerProjectIds = getPlayerProjectIds(gameState);

  const labelProject = (project: Project) => {
    const isPlayer = isPlayerOwnedProject({ project, state: gameState, playerProjectIds });
    const studioName = isPlayer ? gameState.studio.name : (project.studioName || 'AI Studio');
    return { ...project, studioId: isPlayer ? 'player' : 'ai', studioName } as any;
  };

  const talentById = new Map((gameState.talent || []).map((t) => [t.id, t] as const));

  const nominations: Record<string, AwardShowNomination[]> = {};
  const winners: Record<string, AwardShowNomination> = {};

  for (const [category, storedNominees] of Object.entries(record.nominations || {})) {
    const categoryDef = categoryDefByName.get(category);

    const expanded: AwardShowNomination[] = [];
    for (const n of storedNominees) {
      const project = allProjects.get(n.projectId);
      if (!project) continue;

      expanded.push({
        project: labelProject(project),
        category,
        score: n.score,
        talentName: n.talentId ? talentById.get(n.talentId)?.name : undefined,
      });
    }

    if (expanded.length === 0) continue;

    nominations[category] = expanded;

    const w = record.winners?.[category];
    if (!w) continue;

    const winnerProject = allProjects.get(w.projectId);
    if (!winnerProject) continue;

    const isPlayer = isPlayerOwnedProject({ project: winnerProject, state: gameState, playerProjectIds });
    let award: StudioAward | undefined;

    if (isPlayer && !isTalentCategory(categoryDef)) {
      const catKey = hashStringToUint32(category).toString(36);
      award = {
        id: `award:${showId}:${year}:${catKey}:${winnerProject.id}`,
        projectId: winnerProject.id,
        category,
        ceremony: record.ceremonyName,
        year,
        prestige: record.prestige,
        reputationBoost: record.prestige * 2,
        revenueBoost: winnerProject.budget.total * (record.prestige / 100),
      };
    }

    winners[category] = {
      project: labelProject(winnerProject),
      category,
      score: w.score,
      won: true,
      award,
      talentName: w.talentId ? talentById.get(w.talentId)?.name : undefined,
    };
  }

  if (Object.keys(nominations).length === 0) return null;

  return {
    ceremonyName: record.ceremonyName,
    year: record.year,
    nominations,
    winners,
  };
}
