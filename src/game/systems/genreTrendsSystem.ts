import type { GameState, Genre, Project, WorldHistoryEntry } from '@/types/game';
import { pushWorldHistory } from '@/utils/worldHistory';
import type { TickSystem } from '../core/types';

function buildProjectGenreIndex(state: GameState): Map<string, Genre> {
  const m = new Map<string, Genre>();

  for (const p of state.projects || []) {
    const g = p.script?.genre as Genre | undefined;
    if (g) m.set(p.id, g);
  }

  for (const r of state.allReleases || []) {
    if (!r) continue;
    if (!('script' in (r as any))) continue;
    const p = r as Project;
    const g = p.script?.genre as Genre | undefined;
    if (g) m.set(p.id, g);
  }

  return m;
}

function computeTopGenreForYear(state: GameState, year: number): { genre: Genre; count: number } | null {
  const genreByProjectId = buildProjectGenreIndex(state);
  const counts = new Map<Genre, number>();

  for (const w of state.boxOfficeHistory || []) {
    if (w.year !== year) continue;
    for (const rel of w.releases || []) {
      const g = genreByProjectId.get(rel.projectId);
      if (!g) continue;
      counts.set(g, (counts.get(g) || 0) + 1);
    }
  }

  let best: { genre: Genre; count: number } | null = null;
  for (const [genre, count] of counts.entries()) {
    if (!best || count > best.count) best = { genre, count };
  }

  return best;
}

function genreLabel(g: Genre): string {
  return g.charAt(0).toUpperCase() + g.slice(1);
}

export const GenreTrendsSystem: TickSystem = {
  id: 'genreTrends',
  label: 'Genre trends',
  dependsOn: ['worldMilestones'],
  onTick: (state, ctx) => {
    if (ctx.week !== 1) return state;
    if (state.mode === 'online') return state;

    const previousYear = ctx.year - 1;

    const top = computeTopGenreForYear(state, previousYear);
    if (!top) return state;

    const currentTop = state.marketConditions?.trendingGenres?.[0];
    if (currentTop === top.genre) return state;

    const current = state.marketConditions?.trendingGenres || [];
    const nextTrending: Genre[] = [top.genre, ...current.filter((g) => g !== top.genre)].slice(0, 3);

    const entry: WorldHistoryEntry = {
      id: `hist:genre_shift:${previousYear}:${top.genre}`,
      kind: 'genre_shift',
      year: previousYear,
      week: 52,
      title: `${genreLabel(top.genre)} surges`,
      body: `In ${previousYear}, ${genreLabel(top.genre)} projects dominated the release conversation.`,
      importance: 3,
    };

    ctx.recap.push({
      type: 'market',
      title: 'Genre shift',
      body: `Trending genre: ${genreLabel(top.genre)}`,
      severity: 'info',
    });

    return {
      ...state,
      marketConditions: {
        ...state.marketConditions,
        trendingGenres: nextTrending,
      },
      worldHistory: pushWorldHistory(state.worldHistory, entry),
    };
  },
};
