import type { CareerEvent, GameState, StudioAward, TalentAward, TalentPerson, WorldYearbookEntry } from '@/types/game';
import { formatMoneyCompact } from '@/utils/money';
import type { TickSystem } from '../core/types';

function computeTopBoxOffice(state: GameState, year: number): Array<{ projectId: string; title: string; studio: string; totalRevenue: number }> {
  const bestByProject = new Map<string, { projectId: string; title: string; studio: string; totalRevenue: number }>();

  for (const week of state.boxOfficeHistory || []) {
    if (week.year !== year) continue;

    for (const r of week.releases || []) {
      const existing = bestByProject.get(r.projectId);
      const total = r.totalRevenue ?? 0;
      if (!existing || total > existing.totalRevenue) {
        bestByProject.set(r.projectId, {
          projectId: r.projectId,
          title: r.title,
          studio: r.studio,
          totalRevenue: total,
        });
      }
    }
  }

  return [...bestByProject.values()].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
}

function computeAwardsSummary(state: GameState, year: number): {
  studioAwards: StudioAward[];
  talentAwards: Array<{ award: TalentAward; talentId: string; talentName: string }>;
} {
  const studioAwards = (state.studio.awards || []).filter((a) => a.year === year);

  const talentAwards: Array<{ award: TalentAward; talentId: string; talentName: string }> = [];
  for (const t of state.talent || []) {
    for (const a of t.awards || []) {
      if (a.year !== year) continue;
      talentAwards.push({ award: a, talentId: t.id, talentName: t.name });
    }
  }

  return { studioAwards, talentAwards };
}

function awardSortKey(a: { prestige: number; ceremony: string; category: string; id: string }): string {
  return `${String(100 - a.prestige).padStart(3, '0')}|${a.ceremony}|${a.category}|${a.id}`;
}

function computeAwardHighlights(params: {
  studioAwards: StudioAward[];
  talentAwards: Array<{ award: TalentAward; talentName: string }>;
  projectTitleById: Map<string, string>;
}): string[] {
  const { studioAwards, talentAwards, projectTitleById } = params;

  const out: string[] = [];

  const notableStudio = studioAwards
    .filter((a) => a.prestige >= 8)
    .slice()
    .sort((a, b) => awardSortKey(a).localeCompare(awardSortKey(b)));

  for (const a of notableStudio.slice(0, 3)) {
    const title = a.projectTitle ?? projectTitleById.get(a.projectId) ?? 'Unknown project';
    out.push(`${a.ceremony} — ${a.category} ("${title}")`);
  }

  const remaining = 3 - out.length;
  if (remaining > 0) {
    const notableTalent = talentAwards
      .filter((x) => x.award.prestige >= 8)
      .slice()
      .sort((a, b) => awardSortKey(a.award).localeCompare(awardSortKey(b.award)) || a.talentName.localeCompare(b.talentName));

    for (const x of notableTalent.slice(0, remaining)) {
      const a = x.award;
      const title = a.projectTitle ?? projectTitleById.get(a.projectId) ?? 'Unknown project';
      out.push(`${a.ceremony} — ${a.category} (${x.talentName}, "${title}")`);
    }
  }

  return out;
}

function computeNotableWorldEvents(state: GameState, year: number): string[] {
  const events = (state.worldHistory || [])
    .filter((e) => e.year === year)
    .filter((e) => (e.importance || 0) >= 4)
    .slice()
    .sort((a, b) => (b.importance || 0) - (a.importance || 0) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));

  return events.slice(0, 5).map((e) => e.title);
}

function computeCareerHighlights(state: GameState, year: number, projectTitleById: Map<string, string>): string[] {
  type Row = { score: number; talentId: string; name: string; type: string; ev: CareerEvent };

  const rows: Row[] = [];

  for (const t of state.talent || []) {
    for (const ev of t.careerEvolution || []) {
      if (ev.year !== year) continue;
      if (ev.type !== 'breakthrough' && ev.type !== 'comeback' && ev.type !== 'flop') continue;

      const rep = t.reputation ?? 50;
      const w = ev.type === 'comeback' ? 3 : ev.type === 'breakthrough' ? 2 : 1;
      const score = w * 100 + rep;

      rows.push({ score, talentId: t.id, name: t.name, type: t.type, ev });
    }
  }

  rows.sort((a, b) =>
    b.score - a.score ||
    (b.ev.year || 0) - (a.ev.year || 0) ||
    (b.ev.week || 0) - (a.ev.week || 0) ||
    a.talentId.localeCompare(b.talentId) ||
    a.ev.type.localeCompare(b.ev.type) ||
    a.ev.description.localeCompare(b.ev.description)
  );

  const out: string[] = [];

  for (const r of rows.slice(0, 5)) {
    const projectId = r.ev.sourceProjectId;
    const title = projectId ? projectTitleById.get(projectId) : undefined;
    const suffix = title ? ` — "${title}"` : '';
    out.push(`${r.ev.type.charAt(0).toUpperCase() + r.ev.type.slice(1)}: ${r.name} (${r.type})${suffix}`);
  }

  return out;
}

function buildProjectTitleIndex(state: GameState): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of state.projects || []) m.set(p.id, p.title);
  for (const w of state.boxOfficeHistory || []) {
    for (const r of w.releases || []) m.set(r.projectId, r.title);
  }
  for (const r of state.allReleases || []) {
    if (!r) continue;
    if ('id' in (r as any) && 'title' in (r as any)) {
      m.set((r as any).id, (r as any).title);
    }
  }
  return m;
}

function isRetiredInYear(t: TalentPerson, year: number): boolean {
  return t.retired?.year === year;
}

function buildYearbookBody(params: {
  year: number;
  topBoxOffice: Array<{ title: string; studio: string; totalRevenue: number }>;
  studioAwardCount: number;
  talentAwardCount: number;
  awardHighlights: string[];
  careerHighlights: string[];
  notableEvents: string[];
  retirements: Array<{ name: string; type: string }>;
}): string {
  const lines: string[] = [];

  lines.push(`Top Box Office:`);
  if (params.topBoxOffice.length === 0) {
    lines.push('• (no major releases tracked)');
  } else {
    for (const r of params.topBoxOffice.slice(0, 3)) {
      lines.push(`• ${r.title} (${r.studio}) — ${formatMoneyCompact(r.totalRevenue)}`);
    }
  }

  lines.push('');
  lines.push(`Awards:`);
  lines.push(`• Studio wins: ${params.studioAwardCount}`);
  lines.push(`• Talent wins: ${params.talentAwardCount}`);

  if (params.awardHighlights.length > 0) {
    lines.push('• Highlights:');
    for (const h of params.awardHighlights.slice(0, 3)) {
      lines.push(`  - ${h}`);
    }
  }

  if (params.careerHighlights.length > 0) {
    lines.push('');
    lines.push('Career moments:');
    for (const h of params.careerHighlights.slice(0, 5)) {
      lines.push(`• ${h}`);
    }
  }

  lines.push('');
  lines.push(`Industry Retirements:`);
  if (params.retirements.length === 0) {
    lines.push('• (none)');
  } else {
    for (const t of params.retirements.slice(0, 8)) {
      lines.push(`• ${t.name} (${t.type})`);
    }
    if (params.retirements.length > 8) {
      lines.push(`• …and ${params.retirements.length - 8} more`);
    }
  }

  return lines.join('\n');
}

/**
 * Annual "Year in Review" entry.
 *
 * Writes one entry per year into GameState.worldYearbooks.
 */
export const WorldYearbookSystem: TickSystem = {
  id: 'worldYearbook',
  label: 'World yearbook',
  dependsOn: ['talentRetirements', 'worldMilestones'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const previousYear = ctx.year - 1;
    const existing = state.worldYearbooks || [];
    if (existing.some((y) => y.year === previousYear)) return state;

    const projectTitleById = buildProjectTitleIndex(state);

    const topBoxOffice = computeTopBoxOffice(state, previousYear);
    const { studioAwards, talentAwards } = computeAwardsSummary(state, previousYear);

    const retirements = (state.talent || [])
      .filter((t) => isRetiredInYear(t, previousYear))
      .map((t) => ({ name: t.name, type: t.type }));

    const awardHighlights = computeAwardHighlights({
      studioAwards,
      talentAwards: talentAwards.map((x) => ({ award: x.award, talentName: x.talentName })),
      projectTitleById,
    });

    const careerHighlights = computeCareerHighlights(state, previousYear, projectTitleById);

    const entry: WorldYearbookEntry = {
      id: `yearbook:${previousYear}`,
      year: previousYear,
      title: `${previousYear} — Year in Review`,
      body: buildYearbookBody({
        year: previousYear,
        topBoxOffice,
        studioAwardCount: studioAwards.length,
        talentAwardCount: talentAwards.length,
        awardHighlights,
        careerHighlights,
        notableEvents,
        retirements,
      }),
    };

    ctx.recap.push({
      type: 'system',
      title: `Year in Review: ${previousYear}`,
      body: entry.body,
      severity: 'info',
    });

    return {
      ...state,
      worldYearbooks: [...existing, entry],
    };
  },
};
