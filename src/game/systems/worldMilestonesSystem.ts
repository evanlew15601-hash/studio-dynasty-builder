import type { GameState, StudioAward, TalentAward, WorldHistoryEntry } from '@/types/game';
import { pushWorldHistory } from '@/utils/worldHistory';
import { formatMoneyCompact } from '@/utils/money';
import type { TickSystem } from '../core/types';

function buildProjectTitleIndex(state: GameState): Map<string, string> {
  const m = new Map<string, string>();

  for (const p of state.projects || []) {
    m.set(p.id, p.title);
  }

  for (const r of state.allReleases || []) {
    if (!r) continue;
    if ('id' in (r as any) && 'title' in (r as any)) {
      m.set((r as any).id, (r as any).title);
    }
    if ('projectId' in (r as any) && 'title' in (r as any)) {
      m.set((r as any).projectId, (r as any).title);
    }
  }

  for (const week of state.boxOfficeHistory || []) {
    for (const rel of week.releases || []) {
      m.set(rel.projectId, rel.title);
    }
  }

  return m;
}

function computeBestTotalRevenueByProject(state: GameState, year: number): Array<{ projectId: string; title: string; studio: string; totalRevenue: number }> {
  const best = new Map<string, { projectId: string; title: string; studio: string; totalRevenue: number }>();

  for (const week of state.boxOfficeHistory || []) {
    if (week.year !== year) continue;
    for (const r of week.releases || []) {
      const existing = best.get(r.projectId);
      if (!existing || (r.totalRevenue ?? 0) > existing.totalRevenue) {
        best.set(r.projectId, {
          projectId: r.projectId,
          title: r.title,
          studio: r.studio,
          totalRevenue: r.totalRevenue ?? 0,
        });
      }
    }
  }

  return [...best.values()].sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function computeAllTimeBoxOfficeRecordBeforeYear(state: GameState, beforeYear: number): { projectId: string; title: string; studio: string; totalRevenue: number } | null {
  const bestByProject = new Map<string, { projectId: string; title: string; studio: string; totalRevenue: number; year: number }>();

  for (const week of state.boxOfficeHistory || []) {
    if (week.year >= beforeYear) continue;

    for (const r of week.releases || []) {
      const existing = bestByProject.get(r.projectId);
      const total = r.totalRevenue ?? 0;
      if (!existing || total > existing.totalRevenue) {
        bestByProject.set(r.projectId, {
          projectId: r.projectId,
          title: r.title,
          studio: r.studio,
          totalRevenue: total,
          year: week.year,
        });
      }
    }
  }

  const list = [...bestByProject.values()].sort((a, b) => b.totalRevenue - a.totalRevenue);
  return list[0] || null;
}

function awardImportance(award: { prestige: number }): 3 | 4 | 5 {
  if (award.prestige >= 10) return 5;
  if (award.prestige >= 8) return 4;
  return 3;
}

function stableSortAwards<T extends { ceremony: string; category: string; prestige: number; id: string }>(items: T[]): T[] {
  return items
    .slice()
    .sort((a, b) =>
      b.prestige - a.prestige ||
      a.ceremony.localeCompare(b.ceremony) ||
      a.category.localeCompare(b.category) ||
      a.id.localeCompare(b.id)
    );
}

/**
 * Annual notable events derived from authoritative state.
 *
 * This intentionally logs only a small number of high-signal entries.
 */
export const WorldMilestonesSystem: TickSystem = {
  id: 'worldMilestones',
  label: 'World milestones',
  dependsOn: ['worldYearbook'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const previousYear = ctx.year - 1;
    const titleById = buildProjectTitleIndex(state);

    const baseHistory = state.worldHistory || [];
    let worldHistory = baseHistory;
    let changed = false;

    // ------------------------------------------------------------------
    // 1) Awards (high signal only)
    // ------------------------------------------------------------------

    const studioAwards = (state.studio.awards || []).filter((a) => a.year === previousYear);

    const talentAwards: Array<{ award: TalentAward; talentId: string; talentName: string }> = [];
    for (const t of state.talent || []) {
      for (const a of t.awards || []) {
        if (a.year !== previousYear) continue;
        talentAwards.push({ award: a, talentId: t.id, talentName: t.name });
      }
    }

    const notableStudioAwards = stableSortAwards(studioAwards.filter((a) => a.prestige >= 8));

    const notableTalentAwards = talentAwards
      .filter((x) => x.award.prestige >= 8)
      .slice()
      .sort((a, b) =>
        b.award.prestige - a.award.prestige ||
        a.award.ceremony.localeCompare(b.award.ceremony) ||
        a.award.category.localeCompare(b.award.category) ||
        a.award.id.localeCompare(b.award.id) ||
        a.talentId.localeCompare(b.talentId)
      );

    // Limit total award events per year to avoid history spam.
    const MAX_AWARD_EVENTS = 6;

    const awardEntries: WorldHistoryEntry[] = [];

    for (const a of notableStudioAwards.slice(0, MAX_AWARD_EVENTS)) {
      const projectTitle = a.projectTitle ?? titleById.get(a.projectId) ?? 'Unknown project';

      awardEntries.push({
        id: `hist:award_win:${previousYear}:${a.id}`,
        kind: 'award_win',
        year: previousYear,
        week: 52,
        title: `${a.ceremony} — ${a.category}`,
        body: `"${projectTitle}" won ${a.category} at ${a.ceremony}.`,
        entityIds: { studioIds: [state.studio.id], projectIds: [a.projectId] },
        importance: awardImportance(a),
      });
    }

    const remaining = MAX_AWARD_EVENTS - awardEntries.length;

    if (remaining > 0) {
      for (const row of notableTalentAwards.slice(0, remaining)) {
        const a = row.award;
        const projectTitle = a.projectTitle ?? titleById.get(a.projectId) ?? 'Unknown project';

        awardEntries.push({
          id: `hist:award_win:${previousYear}:${a.id}`,
          kind: 'award_win',
          year: previousYear,
          week: 52,
          title: `${a.ceremony} — ${a.category}`,
          body: `${row.talentName} won ${a.category} at ${a.ceremony} for \"${projectTitle}\".`,
          entityIds: {
            talentIds: [row.talentId],
            projectIds: [a.projectId],
          },
          importance: awardImportance(a),
        });
      }
    }

    for (const e of awardEntries) {
      const next = pushWorldHistory(worldHistory, e);
      if (next !== worldHistory) {
        worldHistory = next;
        changed = true;
      }
    }

    // ------------------------------------------------------------------
    // 2) Box office record (all-time)
    // ------------------------------------------------------------------

    const yearBest = computeBestTotalRevenueByProject(state, previousYear)[0];
    if (yearBest && yearBest.totalRevenue > 0) {
      const prior = computeAllTimeBoxOfficeRecordBeforeYear(state, previousYear);
      const isRecord = !prior || yearBest.totalRevenue > prior.totalRevenue;

      if (isRecord) {
        const next = pushWorldHistory(worldHistory, {
          id: `hist:box_office_record:${previousYear}:${yearBest.projectId}`,
          kind: 'box_office_record',
          year: previousYear,
          week: 52,
          title: `Box office record: ${yearBest.title}`,
          body: `"${yearBest.title}" (${yearBest.studio}) set a new all-time box office record at ${formatMoneyCompact(yearBest.totalRevenue)}.`,
          entityIds: { projectIds: [yearBest.projectId] },
          importance: 5,
        });
        if (next !== worldHistory) {
          worldHistory = next;
          changed = true;
        }
      }
    }

    // ------------------------------------------------------------------
    // 3) Studio milestone: first major award (prestige 10)
    // ------------------------------------------------------------------

    const hadMajorBefore = (state.studio.awards || []).some((a) => a.prestige >= 10 && a.year < previousYear);
    const wonMajorThisYear = (state.studio.awards || []).some((a) => a.prestige >= 10 && a.year === previousYear);

    if (!hadMajorBefore && wonMajorThisYear) {
      const next = pushWorldHistory(worldHistory, {
        id: `hist:studio_milestone:first_major_award:${previousYear}:${state.studio.id}`,
        kind: 'studio_milestone',
        year: previousYear,
        week: 52,
        title: `${state.studio.name} breaks through at the top tier`,
        body: `${state.studio.name} won its first major top-tier award.`,
        entityIds: { studioIds: [state.studio.id] },
        importance: 4,
      });
      if (next !== worldHistory) {
        worldHistory = next;
        changed = true;
      }
    }

    if (!changed) return state;

    return {
      ...state,
      worldHistory,
    };
  },
};
