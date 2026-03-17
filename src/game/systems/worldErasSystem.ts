import type { GameState, Genre, Project, WorldHistoryEntry } from '@/types/game';
import type { TickSystem } from '../core/types';
import { pushWorldHistory } from '@/utils/worldHistory';
import { stableInt } from '@/utils/stableRandom';

function computeDecadeRange(previousYear: number): { start: number; end: number } {
  const end = previousYear;
  const start = end - 9;
  return { start, end };
}

function isProjectRelease(p: Project, year: number): boolean {
  return p.releaseYear === year;
}

function getReleasedProjectsInRange(state: GameState, startYear: number, endYear: number): Project[] {
  const out: Project[] = [];

  for (const r of state.allReleases || []) {
    const p = r as any;
    if (!p || typeof p !== 'object') continue;
    if (!p.script) continue;
    const yr = p.releaseYear;
    if (typeof yr !== 'number') continue;
    if (yr < startYear || yr > endYear) continue;
    out.push(p as Project);
  }

  for (const p of state.projects || []) {
    for (let y = startYear; y <= endYear; y++) {
      if (isProjectRelease(p, y)) {
        out.push(p);
        break;
      }
    }
  }

  // De-dupe by id.
  const seen = new Set<string>();
  return out.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function computeDominantGenre(projects: Project[]): Genre | null {
  const counts = new Map<Genre, number>();

  for (const p of projects) {
    const g = p.script?.genre as Genre | undefined;
    if (!g) continue;
    counts.set(g, (counts.get(g) || 0) + 1);
  }

  let best: { g: Genre; n: number } | null = null;
  for (const [g, n] of counts.entries()) {
    if (!best || n > best.n) best = { g, n };
  }

  return best?.g || null;
}

function computeDecadeTopTitles(state: GameState, startYear: number, endYear: number): string[] {
  const bestByProject = new Map<string, { title: string; total: number }>();

  for (const week of state.boxOfficeHistory || []) {
    if (week.year < startYear || week.year > endYear) continue;
    for (const r of week.releases || []) {
      const total = r.totalRevenue ?? 0;
      const existing = bestByProject.get(r.projectId);
      if (!existing || total > existing.total) {
        bestByProject.set(r.projectId, { title: r.title, total });
      }
    }
  }

  return [...bestByProject.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((x) => x.title);
}

function eraTitle(params: { dominantGenre: Genre | null; startYear: number; endYear: number }): string {
  const { dominantGenre, startYear, endYear } = params;

  if (!dominantGenre) return `${startYear}s — The Quiet Decade`;

  const genreLabel = dominantGenre.charAt(0).toUpperCase() + dominantGenre.slice(1);
  return `${startYear}s — The ${genreLabel} Wave`;
}

function eraBody(params: { dominantGenre: Genre | null; startYear: number; endYear: number; topTitles: string[]; seed: string }): string {
  const { dominantGenre, startYear, endYear, topTitles, seed } = params;

  const lines: string[] = [];

  if (!dominantGenre) {
    lines.push(`The ${startYear}s were defined less by dominance and more by unpredictability.`);
  } else {
    const g = dominantGenre;
    const genreLabel = g.charAt(0).toUpperCase() + g.slice(1);

    const flavor = stableInt(`${seed}|flavor`, 0, 2);
    if (flavor === 0) lines.push(`The ${startYear}s belonged to ${genreLabel} — a decade of audience appetite and studio imitation.`);
    if (flavor === 1) lines.push(`${genreLabel} reshaped the ${startYear}s, driving budgets, marketing, and the talent pipeline.`);
    if (flavor === 2) lines.push(`In the ${startYear}s, ${genreLabel} became the industry's default language.`);
  }

  if (topTitles.length > 0) {
    lines.push('');
    lines.push('Defining hits:');
    for (const t of topTitles.slice(0, 3)) lines.push(`• ${t}`);
  }

  lines.push('');
  lines.push(`(${startYear}–${endYear})`);

  return lines.join('\n');
}

/**
 * Decade-level "era" entries that give players a sense of time passing.
 */
export const WorldErasSystem: TickSystem = {
  id: 'worldEras',
  label: 'World eras',
  dependsOn: ['talentRetirements', 'worldMilestones'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const previousYear = ctx.year - 1;

    // Only stamp eras at decade boundaries: 2029 -> stamp the 2020s.
    if (previousYear % 10 !== 9) return state;

    const { start, end } = computeDecadeRange(previousYear);
    const id = `hist:industry_era:${start}:${end}`;

    if ((state.worldHistory || []).some((e) => e.id === id)) return state;

    const projects = getReleasedProjectsInRange(state, start, end);
    const dominantGenre = computeDominantGenre(projects);

    const topTitles = computeDecadeTopTitles(state, start, end);

    const entry: WorldHistoryEntry = {
      id,
      kind: 'industry_era',
      year: end,
      week: 52,
      title: eraTitle({ dominantGenre, startYear: start, endYear: end }),
      body: eraBody({ dominantGenre, startYear: start, endYear: end, topTitles, seed: `${state.universeSeed ?? 0}|era|${start}:${end}` }),
      importance: 4,
    };

    ctx.recap.push({
      type: 'system',
      title: 'A new era',
      body: entry.title,
      severity: 'info',
    });

    return {
      ...state,
      worldHistory: pushWorldHistory(state.worldHistory, entry),
    };
  },
};
