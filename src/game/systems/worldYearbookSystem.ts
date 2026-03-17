import type { GameState, StudioAward, TalentAward, WorldYearbookEntry } from '@/types/game';
import type { TickSystem } from '../core/types';

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

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
  talentAwards: TalentAward[];
} {
  const studioAwards = (state.studio.awards || []).filter((a) => a.year === year);

  const talentAwards: TalentAward[] = [];
  for (const t of state.talent || []) {
    for (const a of t.awards || []) {
      if (a.year !== year) continue;
      talentAwards.push(a);
    }
  }

  return { studioAwards, talentAwards };
}

function buildYearbookBody(params: {
  year: number;
  topBoxOffice: Array<{ title: string; studio: string; totalRevenue: number }>;
  studioAwardCount: number;
  talentAwardCount: number;
  retirements: Array<{ name: string; type: string }>;
}): string {
  const lines: string[] = [];

  lines.push(`Top Box Office:`);
  if (params.topBoxOffice.length === 0) {
    lines.push('• (no major releases tracked)');
  } else {
    for (const r of params.topBoxOffice.slice(0, 3)) {
      lines.push(`• ${r.title} (${r.studio}) — ${formatMoney(r.totalRevenue)}`);
    }
  }

  lines.push('');
  lines.push(`Awards:`);
  lines.push(`• Studio wins: ${params.studioAwardCount}`);
  lines.push(`• Talent wins: ${params.talentAwardCount}`);

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
  dependsOn: ['talentRetirements'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const previousYear = ctx.year - 1;
    const existing = state.worldYearbooks || [];
    if (existing.some((y) => y.year === previousYear)) return state;

    const topBoxOffice = computeTopBoxOffice(state, previousYear);
    const { studioAwards, talentAwards } = computeAwardsSummary(state, previousYear);

    const retirements = (state.talent || [])
      .filter((t) => t.retired?.year === previousYear)
      .map((t) => ({ name: t.name, type: t.type }));

    const entry: WorldYearbookEntry = {
      id: `yearbook:${previousYear}`,
      year: previousYear,
      title: `${previousYear} — Year in Review`,
      body: buildYearbookBody({
        year: previousYear,
        topBoxOffice,
        studioAwardCount: studioAwards.length,
        talentAwardCount: talentAwards.length,
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
