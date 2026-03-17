import type { AwardsCampaign, Project } from '@/types/game';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import { getAwardsCampaignTargetTokens } from '@/utils/awardsCampaign';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isTvProject(project: Project): boolean {
  return project.type === 'series' || project.type === 'limited-series';
}

function isActive(c: AwardsCampaign | undefined): c is AwardsCampaign {
  if (!c) return false;
  return (c.weeksRemaining ?? 0) > 0 && (c.budget ?? 0) > 0;
}

function tickCampaign(c: AwardsCampaign): AwardsCampaign {
  const budget = c.budget ?? 0;
  const spent0 = clamp(c.budgetSpent ?? 0, 0, budget);
  const remainingBudget = Math.max(0, budget - spent0);

  const weeksRemaining0 = Math.max(0, c.weeksRemaining ?? 0);
  const duration = Math.max(1, (c.duration ?? weeksRemaining0) || 1);

  const plannedWeekly = budget / duration;

  const spend = weeksRemaining0 <= 1
    ? remainingBudget
    : Math.min(remainingBudget, plannedWeekly);

  return {
    ...c,
    budgetSpent: clamp(Math.round(spent0 + spend), 0, budget),
    weeksRemaining: Math.max(0, weeksRemaining0 - 1),
  };
}

function pickAiFocus(project: Project): 'prestige' | 'acting' | 'craft' {
  const genre = (project.script?.genre || '').toLowerCase();
  if (genre === 'drama' || genre === 'biography' || genre === 'historical') return 'prestige';
  if (genre === 'action' || genre === 'sci-fi' || genre === 'fantasy' || genre === 'superhero' || genre === 'animation') return 'craft';
  return 'acting';
}

function shouldAutoCampaign(project: Project, year: number, medium: 'film' | 'tv'): boolean {
  if (!project || typeof project !== 'object') return false;
  if (project.status !== 'released') return false;
  if (project.releaseYear !== year - 1) return false;

  const critics = project.metrics?.criticsScore;
  if (typeof critics !== 'number' || critics < 65) return false;

  const matches = medium === 'tv' ? isTvProject(project) : !isTvProject(project);
  if (!matches) return false;

  // Avoid stacking campaigns; AI will run one push per contender.
  if (isActive(project.awardsCampaign)) return false;

  return true;
}

function buildAiCampaign(project: Project, week: number, year: number, medium: 'film' | 'tv'): AwardsCampaign {
  const critics = project.metrics?.criticsScore ?? 65;

  const focus = pickAiFocus(project);
  const targetCategories = getAwardsCampaignTargetTokens(focus, medium);

  const budget = clamp(250_000 + Math.round((critics - 65) * 50_000), 250_000, 1_500_000);
  const effectiveness = clamp(Math.round(55 + (critics - 60) * 0.5), 55, 85);

  return {
    projectId: project.id,
    focus,
    targetCategories,
    budget,
    budgetSpent: 0,
    duration: 8,
    weeksRemaining: 8,
    effectiveness,
    startedWeek: week,
    startedYear: year,
    activities: [
      {
        type: 'advertising',
        name: 'For Your Consideration',
        cost: budget,
        effectivenessBoost: 0,
        prestigeBoost: 0,
      },
    ],
  };
}

export const AwardsCampaignSystem: TickSystem = {
  id: 'awardsCampaign',
  label: 'Awards campaigns',
  onTick: (state, ctx) => {
    const playerProjects = state.projects || [];
    const allReleases = state.allReleases || [];

    let changed = false;
    let ended: Array<{ projectId: string; title: string }> = [];

    const playerProjectIds = new Set(playerProjects.map((p) => p.id));

    // ---------------------------------------------------------------------
    // 1) Tick existing campaigns (player projects)
    // ---------------------------------------------------------------------

    const nextProjects = playerProjects.map((p) => {
      if (!isActive(p.awardsCampaign)) return p;

      const after = tickCampaign(p.awardsCampaign);

      if (after.weeksRemaining <= 0) {
        ended = [...ended, { projectId: p.id, title: p.title }];
      }

      changed = true;
      return { ...p, awardsCampaign: after } as Project;
    });

    // ---------------------------------------------------------------------
    // 2) Tick existing campaigns on AI releases too (so they have a timeline)
    // ---------------------------------------------------------------------

    let nextAllReleases = allReleases;
    if (allReleases.length > 0) {
      const updated = allReleases.map((r) => {
        if (!r || typeof r !== 'object') return r;
        if (!('script' in r)) return r;

        const p = r as Project;
        if (!isActive(p.awardsCampaign)) return r;

        const after = tickCampaign(p.awardsCampaign);

        if (after.weeksRemaining <= 0) {
          ended = [...ended, { projectId: p.id, title: p.title }];
        }

        changed = true;
        return { ...p, awardsCampaign: after };
      });

      nextAllReleases = updated as any;
    }

    // ---------------------------------------------------------------------
    // 3) Light AI auto-campaigning (keeps the race competitive)
    // ---------------------------------------------------------------------

    const shows = getAwardShowsForYear(ctx.year);
    const tvNomWeeks = shows.filter((s) => s.medium === 'tv').map((s) => s.nominationWeek);
    const tvStartWeek = tvNomWeeks.length > 0 ? Math.max(1, Math.min(...tvNomWeeks) - 7) : null;

    const shouldSeedFilm = ctx.week === 1;
    const shouldSeedTv = tvStartWeek !== null && ctx.week === tvStartWeek;

    if (shouldSeedFilm || shouldSeedTv) {
      const medium: 'film' | 'tv' = shouldSeedTv ? 'tv' : 'film';
      const cap = medium === 'tv' ? 4 : 6;

      const eligible = (nextAllReleases as any[])
        .filter((r) => r && typeof r === 'object' && ('script' in r))
        .map((r) => r as Project)
        .filter((p) => !playerProjectIds.has(p.id))
        .filter((p) => shouldAutoCampaign(p, ctx.year, medium))
        .slice()
        .sort((a, b) => {
          const ca = a.metrics?.criticsScore ?? 0;
          const cb = b.metrics?.criticsScore ?? 0;
          return (cb - ca) || a.id.localeCompare(b.id);
        })
        .slice(0, cap);

      if (eligible.length > 0) {
        const byId = new Map(eligible.map((p) => [p.id, p] as const));

        nextAllReleases = (nextAllReleases as any[]).map((r) => {
          if (!r || typeof r !== 'object') return r;
          if (!('script' in r)) return r;

          const p = r as Project;
          const next = byId.get(p.id);
          if (!next) return r;

          changed = true;
          return { ...p, awardsCampaign: buildAiCampaign(p, ctx.week, ctx.year, medium) };
        }) as any;
      }
    }

    if (!changed) return state;

    if (ended.length > 0) {
      const top = ended.slice(0, 3);
      ctx.recap.push({
        type: 'award',
        title: 'Awards campaigns wrap up',
        body: top.map((e) => `• ${e.title}`).join('\n'),
        severity: 'info',
      });
    }

    return {
      ...state,
      projects: nextProjects,
      allReleases: nextAllReleases,
    };
  },
};
