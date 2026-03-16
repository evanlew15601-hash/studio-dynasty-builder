import type { BoxOfficeWeek, GameState, Project, StudioAward, TalentAward, TalentPerson } from '@/types/game';
import type { TickRecapCard, TickReport, TickSystemReport } from '@/types/tickReport';
import { formatMoneyCompact } from '@/utils/money';

function isProjectReleased(p: Project): boolean {
  return p.status === 'released' || p.status === ('distribution' as any) || p.status === ('archived' as any);
}

function countAwards(state: GameState): number {
  const studioAwards = state.studio.awards?.length ?? 0;
  const talentAwards = (state.talent || []).reduce((sum, t) => sum + ((t as any).awards?.length ?? 0), 0);
  return studioAwards + talentAwards;
}

function newlyReleasedProjects(prev: GameState, next: GameState): Project[] {
  const prevById = new Map(prev.projects.map((p) => [p.id, p] as const));
  const released: Project[] = [];

  for (const p of next.projects) {
    const before = prevById.get(p.id);
    if (!before) continue;
    if (!isProjectReleased(before) && isProjectReleased(p)) {
      released.push(p);
    }
  }

  // AI releases: detect newly added releases by id (best-effort)
  const prevIds = new Set(prev.allReleases?.map((r: any) => r?.id).filter(Boolean));
  const nextAi = (next.allReleases || []).filter((r: any) => r && r.id && !prevIds.has(r.id));
  const nextAiProjects = nextAi.filter((r: any): r is Project => 'script' in r) as Project[];

  return [...released, ...nextAiProjects.filter(isProjectReleased)];
}

function sameStringSet(a?: string[], b?: string[]): boolean {
  const sa = new Set(a ?? []);
  const sb = new Set(b ?? []);
  if (sa.size !== sb.size) return false;
  for (const v of sa) {
    if (!sb.has(v)) return false;
  }
  return true;
}

function findBoxOfficeWeek(state: GameState, week: number, year: number): BoxOfficeWeek | undefined {
  const all = state.boxOfficeHistory || [];
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const row = all[i];
    if (row.week === week && row.year === year) return row;
  }
  return undefined;
}

function getNewStudioAwards(prev: GameState, next: GameState): StudioAward[] {
  const prevIds = new Set((prev.studio.awards || []).map((a) => a.id));
  return (next.studio.awards || []).filter((a) => !prevIds.has(a.id));
}

function getNewTalentAwards(prev: GameState, next: GameState): Array<{ award: TalentAward; talent: TalentPerson }> {
  const prevAwardIds = new Set(
    (prev.talent || []).flatMap((t) => ((t as any).awards || []).map((a: TalentAward) => a.id))
  );

  const out: Array<{ award: TalentAward; talent: TalentPerson }> = [];
  for (const t of next.talent || []) {
    const awards = ((t as any).awards || []) as TalentAward[];
    for (const a of awards) {
      if (!prevAwardIds.has(a.id)) out.push({ award: a, talent: t });
    }
  }

  return out;
}

function hasRecapType(cards: TickRecapCard[], type: TickRecapCard['type']): boolean {
  return cards.some((c) => c.type === type);
}

function buildFinancialRecap(params: {
  prev: GameState;
  next: GameState;
  budgetDelta: number;
  reputationDelta: number;
}): TickRecapCard | null {
  const { prev, next, budgetDelta, reputationDelta } = params;

  const boxOffice = findBoxOfficeWeek(next, next.currentWeek, next.currentYear);
  const debtDelta = (next.studio.debt ?? 0) - (prev.studio.debt ?? 0);

  // If nothing visible happened, avoid adding noise.
  if (!boxOffice && budgetDelta === 0 && debtDelta === 0 && reputationDelta === 0) return null;

  const lines: string[] = [];

  if (budgetDelta !== 0) {
    const sign = budgetDelta > 0 ? '+' : '';
    lines.push(`Budget: ${sign}${formatMoneyCompact(budgetDelta)}`);
  }

  if (boxOffice) {
    lines.push(`Box office recorded: ${formatMoneyCompact(boxOffice.totalRevenue)}`);

    const top = [...(boxOffice.releases || [])]
      .sort((a, b) => (b.weeklyRevenue || 0) - (a.weeklyRevenue || 0))
      .slice(0, 5);

    if (top.length > 0) {
      lines.push('Top weekly grosses:');
      for (const r of top) {
        lines.push(`• ${r.title} (${r.studio}) — ${formatMoneyCompact(r.weeklyRevenue)} this week`);
      }
    }
  }

  if (debtDelta !== 0) {
    const sign = debtDelta > 0 ? '+' : '';
    const now = formatMoneyCompact(next.studio.debt ?? 0);
    lines.push(`Debt: ${sign}${formatMoneyCompact(debtDelta)} (now ${now})`);
  }

  if (reputationDelta !== 0) {
    const sign = reputationDelta > 0 ? '+' : '';
    lines.push(`Reputation: ${sign}${reputationDelta}`);
  }

  const severity: TickRecapCard['severity'] =
    budgetDelta > 0
      ? 'good'
      : budgetDelta < 0
        ? 'bad'
        : debtDelta > 0
          ? 'bad'
          : debtDelta < 0
            ? 'good'
            : 'info';

  return {
    type: 'financial',
    title: 'Finance & performance',
    body: lines.join('\n'),
    severity,
  };
}

function buildReleaseRecap(releases: Project[], week: number, year: number): TickRecapCard | null {
  if (releases.length === 0) return null;

  const head = releases.length === 1 ? 'New release' : `${releases.length} new releases`;
  const lines = releases.slice(0, 8).map((p) => {
    const critics = typeof p.metrics?.criticsScore === 'number' ? Math.round(p.metrics.criticsScore) : null;
    const audience = typeof p.metrics?.audienceScore === 'number' ? Math.round(p.metrics.audienceScore) : null;

    const bits: string[] = [];
    if (critics !== null) bits.push(`Critics ${critics}`);
    if (audience !== null) bits.push(`Audience ${audience}`);
    const suffix = bits.length > 0 ? ` — ${bits.join(' / ')}` : '';

    return `• ${p.title}${suffix}`;
  });

  const tail = releases.length > 8 ? `\n…and ${releases.length - 8} more` : '';

  return {
    type: 'release',
    title: `${head} (Y${year}W${week})`,
    body: lines.join('\n') + tail,
    severity: 'info',
    relatedIds: releases.length === 1 ? { projectId: releases[0].id } : undefined,
  };
}

function buildAwardsRecap(params: {
  studioAwards: StudioAward[];
  talentAwards: Array<{ award: TalentAward; talent: TalentPerson }>;
  next: GameState;
}): TickRecapCard | null {
  const { studioAwards, talentAwards, next } = params;
  const total = studioAwards.length + talentAwards.length;
  if (total === 0) return null;

  const projectTitleById = new Map(next.projects.map((p) => [p.id, p.title] as const));

  const lines: string[] = [];

  for (const a of studioAwards.slice(0, 10)) {
    const title = a.projectTitle ?? projectTitleById.get(a.projectId) ?? 'Unknown project';
    lines.push(`• ${a.ceremony} — ${a.category} (${title})`);
  }

  const remainingSlots = Math.max(0, 10 - lines.length);
  for (const item of talentAwards.slice(0, remainingSlots)) {
    const a = item.award;
    const title = a.projectTitle ?? projectTitleById.get(a.projectId) ?? 'Unknown project';
    lines.push(`• ${a.ceremony} — ${a.category} (${item.talent.name}, ${title})`);
  }

  const remaining = total - lines.length;
  const tail = remaining > 0 ? `\n…and ${remaining} more` : '';

  return {
    type: 'award',
    title: `${total} award${total === 1 ? '' : 's'} won`,
    body: lines.join('\n') + tail,
    severity: 'good',
  };
}

function buildMarketRecap(prev: GameState, next: GameState): TickRecapCard | null {
  const prevGenres = prev.marketConditions?.trendingGenres as unknown as string[] | undefined;
  const nextGenres = next.marketConditions?.trendingGenres as unknown as string[] | undefined;

  if (sameStringSet(prevGenres, nextGenres)) return null;

  const body = `Trending genres: ${(nextGenres || []).join(', ') || '—'}`;

  return {
    type: 'market',
    title: 'Market trends shifted',
    body,
    severity: 'info',
  };
}

export function createTickReport(params: {
  prev: GameState;
  next: GameState;
  systems: TickSystemReport[];
  recap: TickRecapCard[];
  startedAtIso: string;
  finishedAtIso: string;
  totalMs: number;
}): TickReport {
  const { prev, next, systems, recap, startedAtIso, finishedAtIso, totalMs } = params;

  const budgetDelta = (next.studio.budget ?? 0) - (prev.studio.budget ?? 0);
  const reputationDelta = (next.studio.reputation ?? 0) - (prev.studio.reputation ?? 0);

  const releases = newlyReleasedProjects(prev, next);
  const awardsWon = Math.max(0, countAwards(next) - countAwards(prev));

  const mergedRecap: TickRecapCard[] = [...recap];

  const isDefaultSystemOnly =
    mergedRecap.length === 1 &&
    mergedRecap[0].type === 'system' &&
    mergedRecap[0].title === 'Week advanced' &&
    mergedRecap[0].body.includes('Simulation progressed to Week');

  if (isDefaultSystemOnly) {
    mergedRecap.splice(0, mergedRecap.length);
  }

  if (!hasRecapType(mergedRecap, 'financial')) {
    const finance = buildFinancialRecap({ prev, next, budgetDelta, reputationDelta });
    if (finance) mergedRecap.push(finance);
  }

  if (!hasRecapType(mergedRecap, 'release')) {
    const rel = buildReleaseRecap(releases, next.currentWeek, next.currentYear);
    if (rel) mergedRecap.push(rel);
  }

  if (!hasRecapType(mergedRecap, 'award')) {
    const awards = buildAwardsRecap({
      studioAwards: getNewStudioAwards(prev, next),
      talentAwards: getNewTalentAwards(prev, next),
      next,
    });
    if (awards) mergedRecap.push(awards);
  }

  if (!hasRecapType(mergedRecap, 'market')) {
    const market = buildMarketRecap(prev, next);
    if (market) mergedRecap.push(market);
  }

  if (mergedRecap.length === 0) {
    mergedRecap.push({
      type: 'system',
      title: 'Week advanced',
      body: `Simulation progressed to Week ${next.currentWeek}, ${next.currentYear}.`,
      severity: 'info',
    });
  }

  return {
    week: next.currentWeek,
    year: next.currentYear,
    startedAtIso,
    finishedAtIso,
    totalMs,
    systems,
    recap: mergedRecap,
    summary: {
      budgetDelta,
      reputationDelta,
      newReleases: releases.length,
      awardsWon,
    },
  };
}
