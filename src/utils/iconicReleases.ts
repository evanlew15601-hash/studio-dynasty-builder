import type { BoxOfficeRelease, BoxOfficeWeek, GameState, Genre, Project, ProjectBudget, ProjectMetrics, Script, TalentAward, TalentPerson, TopFilmEntry, TopFilmsWeek, WorldHistoryEntry, WorldYearbookEntry } from '@/types/game';
import { CORE_TALENT_BIBLE } from '@/data/WorldBible';
import { WORLD_ICONIC_RELEASES, type IconicReleaseDefinition } from '@/data/WorldIconicReleases';
import { stableInt } from '@/utils/stableRandom';
import { pushWorldHistory } from '@/utils/worldHistory';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function dateForWeek(year: number, week: number): Date {
  return new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function canonKey(title: string, year: number): string {
  return `${title.trim().toLowerCase()}|${year}`;
}

const nameBySlug = (() => {
  const m = new Map<string, string>();
  for (const b of CORE_TALENT_BIBLE) m.set(b.slug, b.name);
  return m;
})();

const talentIdBySlug = (() => {
  const m = new Map<string, string>();
  for (const b of CORE_TALENT_BIBLE) m.set(b.slug, `core:${b.slug}`);
  return m;
})();

function creditNames(def: IconicReleaseDefinition): { directorName?: string; topCastNames: string[] } {
  const directorSlug = def.credits.find((c) => c.role.toLowerCase().includes('director'))?.slug;
  const directorName = directorSlug ? nameBySlug.get(directorSlug) : def.directorNameOverride;

  const castSlugs = def.credits
    .filter((c) => !c.role.toLowerCase().includes('director'))
    .map((c) => c.slug);

  const out: string[] = [];

  for (const slug of castSlugs) {
    const nm = nameBySlug.get(slug);
    if (nm) out.push(nm);
  }

  for (const nm of def.extraTopCastNames || []) out.push(nm);

  return {
    directorName,
    topCastNames: out.filter(Boolean).slice(0, 4),
  };
}

function collectCanonAwardBadges(def: IconicReleaseDefinition): string[] {
  type Row = { ceremony: string; category: string; prestige: number };
  const rows: Row[] = [];

  for (const b of CORE_TALENT_BIBLE) {
    for (const a of b.awards || []) {
      if (a.projectTitle !== def.title || a.year !== def.releaseYear) continue;
      rows.push({ ceremony: a.ceremony, category: a.category, prestige: a.prestige });
    }
  }

  const seen = new Set<string>();
  const sorted = rows
    .slice()
    .sort((a, b) => (b.prestige - a.prestige) || a.ceremony.localeCompare(b.ceremony) || a.category.localeCompare(b.category));

  const out: string[] = [];
  for (const r of sorted) {
    const k = `${r.ceremony}|${r.category}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(`${r.ceremony} — ${r.category}`);
  }

  return out.slice(0, 3);
}

function defaultCharacteristics(genre: Genre, criticsScore: number, audienceScore: number): Script['characteristics'] {
  const commercial = clamp(Math.round(audienceScore / 10), 1, 10);
  const critical = clamp(Math.round(criticsScore / 10), 1, 10);

  if (genre === 'action' || genre === 'superhero' || genre === 'adventure') {
    return {
      tone: 'balanced',
      pacing: 'fast-paced',
      dialogue: 'witty',
      visualStyle: 'epic',
      commercialAppeal: clamp(commercial + 2, 1, 10),
      criticalPotential: clamp(critical - 1, 1, 10),
      cgiIntensity: 'heavy',
    };
  }

  if (genre === 'comedy' || genre === 'romance') {
    return {
      tone: 'light',
      pacing: 'steady',
      dialogue: 'witty',
      visualStyle: 'realistic',
      commercialAppeal: clamp(commercial + 1, 1, 10),
      criticalPotential: clamp(critical, 1, 10),
      cgiIntensity: 'minimal',
    };
  }

  if (genre === 'sci-fi' || genre === 'fantasy') {
    return {
      tone: 'dramatic',
      pacing: 'steady',
      dialogue: 'stylized',
      visualStyle: 'epic',
      commercialAppeal: clamp(commercial + 1, 1, 10),
      criticalPotential: clamp(critical, 1, 10),
      cgiIntensity: 'moderate',
    };
  }

  return {
    tone: 'dramatic',
    pacing: 'slow-burn',
    dialogue: 'naturalistic',
    visualStyle: 'realistic',
    commercialAppeal: clamp(commercial, 1, 10),
    criticalPotential: clamp(critical + 1, 1, 10),
    cgiIntensity: 'minimal',
  };
}

function buildBudget(total: number): ProjectBudget {
  const alloc = {
    aboveTheLine: Math.round(total * 0.28),
    belowTheLine: Math.round(total * 0.42),
    postProduction: Math.round(total * 0.14),
    marketing: Math.round(total * 0.12),
    distribution: Math.round(total * 0.03),
    contingency: Math.max(0, total - (Math.round(total * 0.28) + Math.round(total * 0.42) + Math.round(total * 0.14) + Math.round(total * 0.12) + Math.round(total * 0.03))),
  };

  return {
    total,
    allocated: alloc,
    spent: { ...alloc },
    overages: {
      aboveTheLine: 0,
      belowTheLine: 0,
      postProduction: 0,
      marketing: 0,
      distribution: 0,
      contingency: 0,
    },
  };
}

function buildScript(def: IconicReleaseDefinition): Script {
  const quality = clamp(Math.round(def.criticsScore * 0.65 + def.audienceScore * 0.35), 35, 97);

  return {
    id: `script:${def.id}`,
    title: def.title,
    genre: def.genre,
    subgenre: def.subgenre,
    logline: def.logline,
    writer: 'Staff Writers',
    pages: Math.max(45, Math.round(def.runtimeMins * 0.9)),
    quality,
    budget: def.budget,
    developmentStage: 'final',
    themes: [],
    targetAudience: def.genre === 'family' ? 'family' : 'general',
    estimatedRuntime: def.runtimeMins,
    characteristics: defaultCharacteristics(def.genre, def.criticsScore, def.audienceScore),
    characters: [],
    sourceType: 'original',
  };
}

function buildMetrics(state: GameState, def: IconicReleaseDefinition, releaseWeek: number): ProjectMetrics {
  const nowAbs = absWeek(state.currentWeek, state.currentYear);
  const relAbs = absWeek(releaseWeek, def.releaseYear);

  const base: ProjectMetrics = {
    criticsScore: def.criticsScore,
    audienceScore: def.audienceScore,
    weeksSinceRelease: Math.max(0, nowAbs - relAbs),
    theatricalRunLocked: true,
  };

  if (typeof def.boxOfficeTotal === 'number') {
    const total = def.boxOfficeTotal;
    const opening = Math.round(total * 0.28);
    const domestic = Math.round(total * 0.45);
    const international = total - domestic;

    return {
      ...base,
      boxOfficeTotal: total,
      boxOfficeStatus: total >= 500_000_000 ? 'Blockbuster' : total >= 100_000_000 ? 'Hit' : total >= 30_000_000 ? 'Modest' : 'Flop',
      boxOffice: {
        openingWeekend: opening,
        domesticTotal: domestic,
        internationalTotal: international,
        production: Math.round(def.budget * 0.75),
        marketing: Math.round(def.budget * 0.2),
        profit: total - Math.round(def.budget * 0.95),
        theaters: total >= 250_000_000 ? 4200 : 2800,
        weeks: total >= 300_000_000 ? 14 : 10,
      },
    };
  }

  if (typeof def.streamingTotalViews === 'number') {
    const totalViews = def.streamingTotalViews;
    const viewsFirstWeek = Math.round(totalViews * 0.28);

    return {
      ...base,
      streamingViews: totalViews,
      streaming: {
        viewsFirstWeek,
        totalViews,
        completionRate: clamp(55 + Math.round((def.audienceScore - 50) * 0.6), 20, 95),
        audienceShare: clamp(6 + Math.round((def.audienceScore - 60) * 0.15), 1, 25),
        watchTimeHours: Math.round((totalViews * def.runtimeMins) / 60),
        subscriberGrowth: clamp(Math.round((def.audienceScore - 60) * 0.08), 0, 8),
      },
    };
  }

  return base;
}

function buildIconicProject(state: GameState, def: IconicReleaseDefinition): Project {
  const universeSeed = state.universeSeed ?? state.rngState ?? 0;
  const releaseWeek = stableInt(`${universeSeed}|iconicRelease|week|${def.id}`, 1, 52);
  const releaseDate = dateForWeek(def.releaseYear, releaseWeek);

  const { directorName, topCastNames } = creditNames(def);

  const type: Project['type'] = def.kind === 'tv' ? (def.tv?.type ?? 'limited-series') : 'feature';
  const episodeCount = def.kind === 'tv' ? def.tv?.episodeCount : undefined;
  const releaseFormat = def.kind === 'tv' ? def.tv?.releaseFormat : undefined;

  const script = buildScript(def);
  const budget = buildBudget(def.budget);

  const metrics: ProjectMetrics = {
    ...buildMetrics(state, def, releaseWeek),
    awards: collectCanonAwardBadges(def),
    sharedDirectorName: directorName,
    sharedTopCastNames: topCastNames,
  };

  // Give Metaboxd + DB stable enough timestamps for sorting.
  const pre = addDays(releaseDate, -140);
  const shoot = addDays(releaseDate, -70);
  const post = addDays(releaseDate, -30);

  return {
    id: def.id,
    title: def.title,
    script,
    type,
    status: 'released',
    currentPhase: 'distribution',
    phaseDuration: -1,
    studioName: def.studioName,
    episodeCount,
    releaseFormat,
    budget,
    cast: [],
    crew: [],
    locations: [],
    timeline: {
      preProduction: { start: pre, end: shoot },
      principalPhotography: { start: shoot, end: post },
      postProduction: { start: post, end: releaseDate },
      release: releaseDate,
      milestones: [],
    },
    distributionStrategy: {
      primary:
        def.kind === 'tv'
          ? { platform: 'Streamflix', type: 'streaming', revenue: { type: 'subscription-share', studioShare: 60 } }
          : { platform: 'Theaters', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } },
      international: [],
      windows: [],
      marketingBudget: budget.allocated.marketing,
    },
    contractedTalent: [],
    developmentProgress: {
      scriptCompletion: 100,
      budgetApproval: 100,
      talentAttached: 100,
      locationSecured: 100,
      completionThreshold: 100,
      issues: [],
    },
    metrics,
    releaseWeek,
    releaseYear: def.releaseYear,
  } as Project;
}

function collectCanonAwardRows(def: IconicReleaseDefinition): Array<{ ceremony: string; category: string; prestige: number; slug?: string }> {
  const rows: Array<{ ceremony: string; category: string; prestige: number; slug?: string }> = [];

  for (const b of CORE_TALENT_BIBLE) {
    for (const a of b.awards || []) {
      if (a.projectTitle !== def.title || a.year !== def.releaseYear) continue;
      rows.push({ ceremony: a.ceremony, category: a.category, prestige: a.prestige, slug: b.slug });
    }
  }

  return rows
    .slice()
    .sort((a, b) => (b.prestige - a.prestige) || a.ceremony.localeCompare(b.ceremony) || a.category.localeCompare(b.category));
}

function patchTalentLinks(t: TalentPerson, idByTitleYear: Map<string, string>): TalentPerson {
  const baseFilmography = t.filmography || [];
  const baseAwards = t.awards || [];

  let changed = false;

  const nextFilmography = baseFilmography.map((f) => {
    const y = typeof f.year === 'number' ? f.year : undefined;
    if (!y) return f;

    const canonId = idByTitleYear.get(canonKey(f.title, y));
    if (!canonId) return f;

    if (!f.projectId || f.projectId.startsWith('hist-project:')) {
      changed = true;
      return { ...f, projectId: canonId };
    }

    return f;
  });

  const nextAwards: TalentAward[] = baseAwards.map((a) => {
    const y = typeof a.year === 'number' ? a.year : undefined;
    const title = a.projectTitle;
    if (!y || !title) return a;

    const canonId = idByTitleYear.get(canonKey(title, y));
    if (!canonId) return a;

    if (!a.projectId || a.projectId.startsWith('hist-project:')) {
      changed = true;
      return { ...a, projectId: canonId };
    }

    return a;
  });

  if (!changed) return t;

  return {
    ...t,
    filmography: nextFilmography,
    awards: nextAwards,
  };
}

function ensureIconicProjectMetadata(project: Project, def: IconicReleaseDefinition, state: GameState): Project {
  const universeSeed = state.universeSeed ?? state.rngState ?? 0;
  const computedReleaseWeek = stableInt(`${universeSeed}|iconicRelease|week|${def.id}`, 1, 52);

  let changed = false;

  const releaseWeek = project.releaseWeek ?? computedReleaseWeek;
  const releaseYear = project.releaseYear ?? def.releaseYear;

  const metrics = { ...(project.metrics || {}) } as ProjectMetrics;

  if (project.releaseWeek == null) changed = true;
  if (project.releaseYear == null) changed = true;

  const badges = collectCanonAwardBadges(def);
  if (badges.length > 0) {
    const existing = metrics.awards || [];
    if (existing.length === 0) {
      metrics.awards = badges;
      changed = true;
    }
  }

  if (!changed) return project;

  return {
    ...(project as any),
    metrics,
    releaseWeek,
    releaseYear,
  } as Project;
}

function ensureCanonWorldYearbooks(
  yearbooks: WorldYearbookEntry[] | undefined,
  candidates: IconicReleaseDefinition[]
): WorldYearbookEntry[] {
  const base = yearbooks || [];
  const existingYears = new Set(base.map((y) => y.year));

  const byYear = new Map<number, IconicReleaseDefinition[]>();
  for (const def of candidates) {
    if (!byYear.has(def.releaseYear)) byYear.set(def.releaseYear, []);
    byYear.get(def.releaseYear)!.push(def);
  }

  const additions: WorldYearbookEntry[] = [];

  const years = [...byYear.keys()].sort((a, b) => a - b);
  for (const year of years) {
    if (existingYears.has(year)) continue;

    const defs = (byYear.get(year) || []).slice();
    defs.sort((a, b) => {
      const ao = a.boxOfficeTotal ?? 0;
      const bo = b.boxOfficeTotal ?? 0;
      return bo - ao || (b.criticsScore - a.criticsScore) || a.title.localeCompare(b.title);
    });

    const topBox = defs
      .filter((d) => typeof d.boxOfficeTotal === 'number')
      .sort((a, b) => (b.boxOfficeTotal ?? 0) - (a.boxOfficeTotal ?? 0))
      .slice(0, 3);

    const topCrit = defs
      .slice()
      .sort((a, b) => (b.criticsScore - a.criticsScore) || (b.audienceScore - a.audienceScore))
      .slice(0, 3);

    const flops = defs
      .filter((d) => typeof d.boxOfficeTotal === 'number')
      .filter((d) => (d.boxOfficeTotal as number) < d.budget * 0.65)
      .sort((a, b) => ((a.boxOfficeTotal ?? 0) / a.budget) - ((b.boxOfficeTotal ?? 0) / b.budget))
      .slice(0, 2);

    const awardLines = defs
      .flatMap((d) => collectCanonAwardBadges(d).map((badge) => ({ badge, prestige: collectCanonAwardRows(d)[0]?.prestige ?? 0, title: d.title })))
      .slice(0, 5)
      .map((x) => `• ${x.badge} ("${x.title}")`);

    const lines: string[] = [];
    lines.push('Major releases:');
    for (const d of defs.slice(0, 6)) {
      if (typeof d.boxOfficeTotal === 'number') {
        lines.push(`• ${d.title} — ${d.studioName} — ${Math.round((d.boxOfficeTotal || 0) / 1_000_000)}M BO • ${d.criticsScore}/${d.audienceScore}`);
      } else {
        lines.push(`• ${d.title} — ${d.studioName} — ${Math.round((d.streamingTotalViews || 0) / 1_000_000)}M views • ${d.criticsScore}/${d.audienceScore}`);
      }
    }

    if (topBox.length > 0) {
      lines.push('');
      lines.push('Top box office:');
      for (const d of topBox) {
        lines.push(`• ${d.title} — ${Math.round((d.boxOfficeTotal || 0) / 1_000_000)}M`);
      }
    }

    if (topCrit.length > 0) {
      lines.push('');
      lines.push('Critical conversation:');
      for (const d of topCrit) {
        lines.push(`• ${d.title} — Critics ${d.criticsScore} / Audience ${d.audienceScore}`);
      }
    }

    if (flops.length > 0) {
      lines.push('');
      lines.push('Notable flops:');
      for (const d of flops) {
        lines.push(`• ${d.title} — ${Math.round((d.boxOfficeTotal || 0) / 1_000_000)}M on a ${Math.round(d.budget / 1_000_000)}M budget`);
      }
    }

    if (awardLines.length > 0) {
      lines.push('');
      lines.push('Awards:');
      lines.push(...awardLines);
    }

    additions.push({
      id: `yearbook:canon:${year}`,
      year,
      title: `Archive: ${year}`,
      body: lines.join('\n'),
    });
  }

  if (additions.length === 0) return base;

  return [...base, ...additions];
}

function ensureCanonMarketHistory(params: {
  state: GameState;
  candidates: IconicReleaseDefinition[];
}): { boxOfficeHistory: BoxOfficeWeek[]; topFilmsHistory: TopFilmsWeek[] } {
  const { state, candidates } = params;

  const keepYears = 12;
  const minYear = (state.currentYear ?? 0) - keepYears;

  const universeSeed = state.universeSeed ?? state.rngState ?? 0;

  const baseBox = state.boxOfficeHistory || [];
  const baseTop = state.topFilmsHistory || [];

  let boxOfficeHistory: BoxOfficeWeek[] = baseBox;
  let topFilmsHistory: TopFilmsWeek[] = baseTop;

  let changedBox = false;
  let changedTop = false;

  const ensureBoxMutable = () => {
    if (!changedBox) {
      boxOfficeHistory = baseBox.slice();
      changedBox = true;
    }
  };

  const ensureTopMutable = () => {
    if (!changedTop) {
      topFilmsHistory = baseTop.slice();
      changedTop = true;
    }
  };

  const upsertBoxOfficeWeek = (week: BoxOfficeWeek) => {
    const idx = boxOfficeHistory.findIndex((w) => w.year === week.year && w.week === week.week);
    if (idx === -1) {
      ensureBoxMutable();
      boxOfficeHistory.push(week);
      return;
    }

    const existing = boxOfficeHistory[idx];
    const existingIds = new Set((existing.releases || []).map((r) => r.projectId));

    let any = false;
    const mergedReleases = [...(existing.releases || [])];
    for (const r of week.releases || []) {
      if (existingIds.has(r.projectId)) continue;
      mergedReleases.push(r);
      any = true;
    }

    if (!any) return;

    ensureBoxMutable();
    boxOfficeHistory[idx] = {
      ...existing,
      releases: mergedReleases,
      totalRevenue: (existing.totalRevenue || 0) + (week.totalRevenue || 0),
    };
  };

  const upsertTopFilmsWeek = (week: TopFilmsWeek) => {
    const idx = topFilmsHistory.findIndex((w) => w.year === week.year && w.week === week.week);
    if (idx === -1) {
      ensureTopMutable();
      topFilmsHistory.push(week);
      return;
    }

    const existing = topFilmsHistory[idx];
    const byId = new Map((existing.topFilms || []).map((t) => [t.projectId, t] as const));

    let any = false;
    for (const t of week.topFilms || []) {
      if (byId.has(t.projectId)) continue;
      byId.set(t.projectId, t);
      any = true;
    }

    if (!any) return;

    const merged = [...byId.values()].sort((a, b) => b.weeklyGross - a.weeklyGross).slice(0, 10);
    merged.forEach((t, i) => {
      (t as any).position = i + 1;
    });

    ensureTopMutable();
    topFilmsHistory[idx] = {
      ...existing,
      topFilms: merged,
    };
  };

  for (const def of candidates) {
    if (def.releaseYear < minYear) continue;
    if (typeof def.boxOfficeTotal !== 'number') continue;

    const releaseWeek = stableInt(`${universeSeed}|iconicRelease|week|${def.id}`, 1, 52);

    const total = def.boxOfficeTotal;
    const opening = Math.round(total * 0.28);
    const theaters = total >= 250_000_000 ? 4200 : 2800;

    const release: BoxOfficeRelease = {
      projectId: def.id,
      title: def.title,
      studio: def.studioName,
      weeklyRevenue: opening,
      totalRevenue: total,
      theaters,
      weekInRelease: 1,
    };

    upsertBoxOfficeWeek({
      week: releaseWeek,
      year: def.releaseYear,
      releases: [release],
      totalRevenue: opening,
    });

    const tags: string[] = [];
    if (def.criticsScore >= 80) tags.push('Critical Darling');
    if (def.audienceScore >= 85) tags.push('Crowd Pleaser');
    if (total >= def.budget * 3) tags.push('Blockbuster');
    if (total < def.budget * 0.65) tags.push('Box Office Bomb');

    const topFilm: TopFilmEntry = {
      projectId: def.id,
      title: def.title,
      studioName: def.studioName,
      weeklyGross: opening,
      totalGross: total,
      position: 1,
      trend: 'new',
      receptionTags: tags.slice(0, 2),
    };

    upsertTopFilmsWeek({
      week: releaseWeek,
      year: def.releaseYear,
      topFilms: [topFilm],
    });
  }

  if (changedBox) boxOfficeHistory.sort((a, b) => (a.year - b.year) || (a.week - b.week));
  if (changedTop) topFilmsHistory.sort((a, b) => (a.year - b.year) || (a.week - b.week));

  return { boxOfficeHistory, topFilmsHistory };
}

function ensureCanonWorldHistory(params: {
  state: GameState;
  candidates: IconicReleaseDefinition[];
}): WorldHistoryEntry[] | undefined {
  const { state, candidates } = params;

  const universeSeed = state.universeSeed ?? state.rngState ?? 0;
  const base = state.worldHistory || [];
  let worldHistory = base;

  for (const def of candidates) {
    const releaseWeek = stableInt(`${universeSeed}|iconicRelease|week|${def.id}`, 1, 52);

    if (typeof def.boxOfficeTotal === 'number') {
      const total = def.boxOfficeTotal;
      const mult = total / Math.max(1, def.budget);

      if (total >= 700_000_000 || (total >= 450_000_000 && mult >= 3)) {
        worldHistory = pushWorldHistory(worldHistory, {
          id: `hist:canon:boxoffice:${def.id}`,
          kind: 'box_office_record',
          week: releaseWeek,
          year: def.releaseYear,
          title: `"${def.title}" dominates the box office`,
          body: `${def.title} (${def.studioName}) becomes a defining commercial moment for the era, grossing roughly ${Math.round(total / 1_000_000)}M worldwide.`,
          entityIds: { projectIds: [def.id] },
          importance: total >= 900_000_000 ? 5 : 4,
        });
      }

      if (mult <= 0.65) {
        const directorSlug = def.credits.find((c) => c.role.toLowerCase().includes('director'))?.slug;
        const directorId = directorSlug ? talentIdBySlug.get(directorSlug) : undefined;

        worldHistory = pushWorldHistory(worldHistory, {
          id: `hist:canon:flop:${def.id}`,
          kind: 'talent_flop',
          week: clamp(releaseWeek + 3, 1, 52),
          year: def.releaseYear,
          title: `"${def.title}" stalls on release`,
          body: `${def.title} fails to connect with audiences, ending around ${Math.round((def.boxOfficeTotal || 0) / 1_000_000)}M on a ${Math.round(def.budget / 1_000_000)}M budget.`,
          entityIds: {
            projectIds: [def.id],
            talentIds: directorId ? [directorId] : undefined,
          },
          importance: mult <= 0.4 ? 4 : 3,
        });
      }
    }

    const awards = collectCanonAwardRows(def).filter((a) => a.prestige >= 7).slice(0, 2);
    for (const a of awards) {
      const talentId = a.slug ? talentIdBySlug.get(a.slug) : undefined;
      worldHistory = pushWorldHistory(worldHistory, {
        id: `hist:canon:award:${def.id}:${a.ceremony}:${a.category}`,
        kind: 'award_win',
        week: stableInt(`${universeSeed}|canonAward|${def.id}|${a.ceremony}|${a.category}`, 6, 14),
        year: def.releaseYear,
        title: `${a.ceremony} honors "${def.title}"`,
        body: `${def.title} takes home ${a.category} at ${a.ceremony}.`,
        entityIds: {
          projectIds: [def.id],
          talentIds: talentId ? [talentId] : undefined,
        },
        importance: a.prestige >= 9 ? 5 : 4,
      });
    }
  }

  return worldHistory === base ? state.worldHistory : worldHistory;
}

export function seedIconicReleasesState(state: GameState): GameState {
  if (state.mode === 'online') return state;

  const currentYear = state.currentYear ?? 0;
  const cutoffYear = currentYear - 2;

  const candidates = WORLD_ICONIC_RELEASES.filter((d) => d.releaseYear <= cutoffYear);
  if (candidates.length === 0) return state;

  const defById = new Map(candidates.map((d) => [d.id, d] as const));
  const idByTitleYear = new Map(candidates.map((d) => [canonKey(d.title, d.releaseYear), d.id] as const));

  const baseAllReleases = state.allReleases || [];
  const existingIds = new Set(
    baseAllReleases
      .map((r: any) => (r && typeof r === 'object' ? (r as any).id : undefined))
      .filter((id: any): id is string => typeof id === 'string')
  );

  const additions: Project[] = [];

  for (const def of candidates) {
    if (existingIds.has(def.id)) continue;
    additions.push(buildIconicProject(state, def));
  }

  let nextAllReleases: (Project | BoxOfficeRelease)[] = baseAllReleases;
  if (additions.length > 0) {
    nextAllReleases = [...baseAllReleases, ...additions];
  }

  // Patch older saves / injected states to include releaseWeek + award badges.
  let releasesChanged = additions.length > 0;
  const patchedReleases = nextAllReleases.map((r) => {
    if (!r || typeof r !== 'object') return r;
    if (!('script' in (r as any))) return r;
    const id = (r as any).id;
    const def = defById.get(id);
    if (!def) return r;

    const next = ensureIconicProjectMetadata(r as Project, def, state);
    if (next !== r) releasesChanged = true;
    return next;
  });

  // Canon links: filmography + awards should click through to seeded releases.
  const baseTalent = state.talent || [];
  let talentChanged = false;
  const patchedTalent = baseTalent.map((t) => {
    const next = patchTalentLinks(t, idByTitleYear);
    if (next !== t) talentChanged = true;
    return next;
  });

  const baseYearbooks = state.worldYearbooks || [];
  const nextYearbooks = ensureCanonWorldYearbooks(state.worldYearbooks, candidates);
  const yearbooksChanged = nextYearbooks.length !== baseYearbooks.length;

  const baseWorldHistory = state.worldHistory || [];
  const nextWorldHistory = ensureCanonWorldHistory({ state, candidates });
  const historyChanged = (nextWorldHistory || []).length !== baseWorldHistory.length;

  const market = ensureCanonMarketHistory({ state, candidates });
  const marketChanged = market.boxOfficeHistory !== state.boxOfficeHistory || market.topFilmsHistory !== state.topFilmsHistory;

  if (!releasesChanged && !talentChanged && !yearbooksChanged && !historyChanged && !marketChanged) return state;

  return {
    ...state,
    allReleases: patchedReleases,
    talent: talentChanged ? patchedTalent : state.talent,
    worldYearbooks: nextYearbooks,
    worldHistory: nextWorldHistory,
    boxOfficeHistory: market.boxOfficeHistory,
    topFilmsHistory: market.topFilmsHistory,
  };
}
