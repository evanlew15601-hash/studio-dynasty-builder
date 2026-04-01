import type { GameState, Project } from '@/types/game';
import { TVEpisodeSystem } from '@/game/sim/tvEpisodeSystem';
import { TVRatingsSystem } from '@/game/sim/tvRatingsSystem';
import { StudioGenerator } from '@/data/StudioGenerator';
import { attachBasicCastForAI } from '@/utils/attachBasicCastForAI';
import { stableInt } from '@/utils/stableRandom';

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function absToWeekYear(abs: number): { week: number; year: number } {
  const year = Math.floor((abs - 1) / 52);
  const week = ((abs - 1) % 52) + 1;
  return { week, year };
}

function isTvProject(p: Project): boolean {
  return p.type === 'series' || p.type === 'limited-series';
}

function processTvToCurrent(project: Project, currentWeek: number, currentYear: number): Project {
  let next = TVEpisodeSystem.ensureSeason(project);
  next = TVEpisodeSystem.autoReleaseEpisodesIfDue(next, currentWeek, currentYear);
  next = TVEpisodeSystem.processWeeklyEpisodeDecay(next, currentWeek, currentYear);
  next = TVRatingsSystem.processWeeklyRatings(next, currentWeek, currentYear);
  return next;
}

function isAiringNow(project: Project, currentWeek: number, currentYear: number): boolean {
  if (!project.releaseWeek || !project.releaseYear) return false;
  if (absWeek(project.releaseWeek, project.releaseYear) > absWeek(currentWeek, currentYear)) return false;

  const season = project.seasons?.[0];
  const aired = season?.episodesAired || 0;
  const total = season?.totalEpisodes || project.episodeCount || 0;
  return aired > 0 && total > 0 && aired < total;
}

/**
 * Ensures competitor TV projects are fully initialized (season/episodes/metrics) up to the current game week.
 * Also seeds a minimum number of already-airing competitor shows at game start.
 */
export function primeCompetitorTelevision(gameState: GameState, opts?: { minAiring?: number }): GameState {
  const allReleases = gameState.allReleases || [];

  const minAiring = opts?.minAiring ?? 2;

  const currentAbs = absWeek(gameState.currentWeek, gameState.currentYear);

  const competitorNames = new Set((gameState.competitorStudios || []).map((s) => s.name));
  const playerProjectIds = new Set((gameState.projects || []).map((p) => p.id));

  let changed = false;

  let nextAllReleases = allReleases.map((r) => {
    if (!('script' in (r as any))) return r;

    const p = r as Project;

    if (playerProjectIds.has(p.id)) return r;
    if (!p.studioName || !competitorNames.has(p.studioName)) return r;
    if (!isTvProject(p)) return r;
    if (!p.releaseWeek || !p.releaseYear) return r;

    // Only prime already-released shows.
    if (absWeek(p.releaseWeek, p.releaseYear) > currentAbs) return r;

    const next = processTvToCurrent(p, gameState.currentWeek, gameState.currentYear);
    if (next !== p) changed = true;
    return next;
  });

  const getAiringCount = (pool: Array<Project | any>) =>
    pool
      .filter((r): r is Project => typeof (r as any)?.script !== 'undefined')
      .filter((p) => !playerProjectIds.has(p.id))
      .filter((p) => !!p.studioName && competitorNames.has(p.studioName))
      .filter((p) => isTvProject(p))
      .filter((p) => isAiringNow(p, gameState.currentWeek, gameState.currentYear)).length;

  let airingCount = getAiringCount(nextAllReleases as any);

  if (airingCount < minAiring && (gameState.competitorStudios || []).length > 0) {
    const sg = new StudioGenerator();
    const seeded: Project[] = [];

    for (let i = airingCount; i < minAiring; i += 1) {
      const studioIdx = stableInt(`${gameState.universeSeed ?? 0}|seedTv|studio|${i}`, 0, gameState.competitorStudios.length - 1);
      const studio = gameState.competitorStudios[studioIdx];

      const desiredBackWeeks = stableInt(`${gameState.universeSeed ?? 0}|seedTv|backWeeks|${studio.name}|${i}`, 2, 8);

      const profile = sg.getStudioProfile(studio.name);
      if (!profile) continue;

      // Generate first to know episode count, then clamp premiere so the show is mid-season (airing).
      let rel = sg.generateDeterministicStudioTvRelease(profile, gameState.currentWeek, gameState.currentYear, gameState.universeSeed ?? 0);

      const totalEpisodes = rel.episodeCount || 13;
      const maxBackWeeks = Math.min(8, Math.max(0, totalEpisodes - 2));
      const backWeeks = Math.min(desiredBackWeeks, maxBackWeeks);
      const premiere = absToWeekYear(currentAbs - backWeeks);

      const stableId = `ai-tv-seed-${studio.id}-${premiere.year}-${premiere.week}-${i}`;

      rel = {
        ...rel,
        id: stableId,
        studioName: studio.name,
        releaseWeek: premiere.week,
        releaseYear: premiere.year,
        releaseFormat: 'weekly',
        phaseDuration: -1,
        status: 'released',
        currentPhase: 'distribution',
        script: {
          ...rel.script,
          id: `script-${stableId}`,
          title: rel.title,
        },
      } as Project;

      rel = attachBasicCastForAI(rel, gameState.talent || []);
      rel = processTvToCurrent(rel, gameState.currentWeek, gameState.currentYear);

      seeded.push(rel);
    }

    if (seeded.length > 0) {
      nextAllReleases = [...nextAllReleases, ...seeded];
      changed = true;
      airingCount = getAiringCount(nextAllReleases as any);
    }
  }

  if (!changed) return gameState;

  return {
    ...gameState,
    allReleases: nextAllReleases as any,
  };
}
