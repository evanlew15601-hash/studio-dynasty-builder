import type { AwardsCampaign, Project } from '@/types/game';
import type { TickSystem } from '../core/types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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
  const duration = Math.max(1, c.duration ?? weeksRemaining0 || 1);

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

export const AwardsCampaignSystem: TickSystem = {
  id: 'awardsCampaign',
  label: 'Awards campaigns',
  onTick: (state, ctx) => {
    const projects = state.projects || [];
    if (projects.length === 0) return state;

    let changed = false;
    let ended: Array<{ projectId: string; title: string }> = [];

    const nextProjects = projects.map((p) => {
      if (!isActive(p.awardsCampaign)) return p;

      const before = p.awardsCampaign;
      const after = tickCampaign(before);

      if (after.weeksRemaining <= 0) {
        ended = [...ended, { projectId: p.id, title: p.title }];
      }

      changed = true;
      return { ...p, awardsCampaign: after } as Project;
    });

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
    };
  },
};
