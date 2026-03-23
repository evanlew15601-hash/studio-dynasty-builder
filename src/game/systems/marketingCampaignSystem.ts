import type { GameState, MarketingActivity, Project } from '@/types/game';
import { isProjectLike } from '@/utils/playerProjects';
import type { TickSystem } from '../core/types';

function isTvProject(project: Project): boolean {
  return project.type === 'series' || project.type === 'limited-series';
}

export const MarketingCampaignSystem: TickSystem = {
  id: 'marketingCampaigns',
  label: 'Marketing campaigns',
  onTick: (state) => {
    const projects = state.projects || [];

    let changed = false;

    const updatedById = new Map<string, Project>();

    const nextProjects = projects.map((p0) => {
      if (!isProjectLike(p0)) return p0;

      const campaign0 = (p0 as any).marketingCampaign;
      if (!campaign0) return p0;

      const weeksRemaining0 = typeof campaign0.weeksRemaining === 'number' ? campaign0.weeksRemaining : 0;
      if (weeksRemaining0 <= 0) return p0;

      const duration = Math.max(1, Math.floor(campaign0.duration || weeksRemaining0 || 1));
      const campaignBudget = Math.max(0, Math.floor(campaign0.budgetAllocated || 0));
      const weeklySpend = campaignBudget > 0 ? campaignBudget / duration : 0;
      const weeklyBuzzGrowth = Math.max(2, Math.floor(weeklySpend / 500000));

      const buzzCap = isTvProject(p0) ? 250 : 150;
      const buzz0 = typeof campaign0.buzz === 'number' ? campaign0.buzz : 0;
      const newBuzz = Math.min(buzzCap, buzz0 + weeklyBuzzGrowth);

      const newWeeksRemaining = Math.max(0, weeksRemaining0 - 1);
      const newBudgetSpent = Math.min(campaignBudget, (campaign0.budgetSpent || 0) + weeklySpend);

      const updatedActivities = (campaign0.activities || []).map((a: MarketingActivity) => {
        const wr0 = typeof a.weeksRemaining === 'number' ? a.weeksRemaining : 0;
        const wr = Math.max(0, wr0 - 1);
        const status = wr0 <= 1 ? ('completed' as const) : a.status;
        return { ...a, weeksRemaining: wr, status };
      });

      let p: Project = {
        ...p0,
        marketingCampaign: {
          ...campaign0,
          activities: updatedActivities,
          weeksRemaining: newWeeksRemaining,
          buzz: newBuzz,
          budgetSpent: newBudgetSpent,
          effectiveness: Math.min(100, (campaign0.effectiveness || 50) + 2),
        },
        marketingData: {
          ...(p0 as any).marketingData,
          currentBuzz: newBuzz,
          totalSpent: (p0 as any).marketingData?.totalSpent || campaignBudget,
          campaigns: (p0 as any).marketingData?.campaigns || [],
        },
        phaseDuration:
          typeof p0.phaseDuration === 'number' && p0.phaseDuration > 0
            ? Math.max(0, p0.phaseDuration - 1)
            : p0.phaseDuration,
      };

      if (newWeeksRemaining === 0) {
        const hasScheduledRelease = typeof p.scheduledReleaseWeek === 'number' && typeof p.scheduledReleaseYear === 'number';

        p = {
          ...p,
          currentPhase: 'release' as any,
          status: (hasScheduledRelease ? 'scheduled-for-release' : 'ready-for-release') as any,
          readyForRelease: !hasScheduledRelease,
          phaseDuration: hasScheduledRelease ? -1 : 0,
        };
      }

      if (p !== p0) {
        updatedById.set(p0.id, p);
        changed = true;
      }
      return p;
    });

    if (!changed) return state;

    const patch = (value: any): any => {
      if (!isProjectLike(value)) return value;
      return updatedById.get(value.id) || value;
    };

    return {
      ...(state as GameState),
      projects: nextProjects as Project[],
      aiStudioProjects: ((state.aiStudioProjects as any) || []).map(patch) as Project[],
      allReleases: (state.allReleases || []).map(patch) as Array<Project | any>,
    };
  },
};
