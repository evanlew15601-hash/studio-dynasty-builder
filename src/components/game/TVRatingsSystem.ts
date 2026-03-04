import { Project, GameState } from '@/types/game';
import { loadIndustryDatabase } from '@/utils/industryDatabase';
import { findDefaultProviderById } from '@/data/Providers';

export class TVRatingsSystem {
  // Initialize airing for a TV series: compute first-week views and set metrics
  static initializeAiring(project: Project, releaseWeek: number, releaseYear: number): Project {
    // If streaming metrics already exist for this released project, avoid resetting them
    // when additional episodes are dropped.
    if (project.metrics?.streaming && project.status === 'released') {
      return project;
    }

    const viewsFirstWeek = this.calculateWeeklyViews(project, 0);

    return {
      ...project,
      status: 'released' as const,
      releaseWeek,
      releaseYear,
      metrics: {
        ...project.metrics,
        streaming: {
          viewsFirstWeek,
          totalViews: viewsFirstWeek,
          completionRate: this.getInitialCompletionRate(project),
          audienceShare: this.getInitialAudienceShare(project),
          watchTimeHours: Math.max(1000, Math.floor(viewsFirstWeek * (project.script?.estimatedRuntime || 45) / 60)),
          subscriberGrowth: this.getInitialSubscriberGrowth(project)
        },
        weeksSinceRelease: 0,
        criticsScore: project.metrics?.criticsScore ?? Math.floor(Math.random() * 40) + 50,
        audienceScore: project.metrics?.audienceScore ?? Math.floor(Math.random() * 40) + 50
      }
    };
  }

  // Weekly processing for TV ratings
  static processWeeklyRatings(project: Project, currentWeek: number, currentYear: number): Project {
    if (!project.releaseWeek || !project.releaseYear) return project;

    // Prime-level guardrail: don't accrue streaming metrics until at least one episode has actually aired.
    const hasAiredEpisodes = project.seasons?.some(s => (s.episodesAired || 0) > 0) || false;
    if (!hasAiredEpisodes) return project;

    // If airing hasn't been initialized yet (no streaming metrics), wait for episode release to trigger initializeAiring().
    if (!project.metrics?.streaming) return project;

    const currentAbs = currentYear * 52 + currentWeek;
    const releaseAbs = project.releaseYear * 52 + project.releaseWeek;
    const weeksSinceRelease = Math.max(0, currentAbs - releaseAbs);

    // Calculate this week's views
    const weeklyViews = this.calculateWeeklyViews(project, weeksSinceRelease);
    const prevTotal = project.metrics?.streaming?.totalViews || 0;
    const newTotal = prevTotal + weeklyViews;

    const completionRate = this.updateCompletionRate(project, weeksSinceRelease);
    const audienceShare = this.updateAudienceShare(project, weeksSinceRelease);
    const subscriberGrowth = this.updateSubscriberGrowth(project, weeklyViews);

    return {
      ...project,
      metrics: {
        ...project.metrics,
        streaming: {
          viewsFirstWeek: project.metrics?.streaming?.viewsFirstWeek || weeklyViews,
          totalViews: newTotal,
          completionRate,
          audienceShare,
          watchTimeHours: Math.max(1000, Math.floor(newTotal * (project.script?.estimatedRuntime || 45) / 60)),
          subscriberGrowth
        },
        weeksSinceRelease
      }
    };
  }

  private static getProviderReachMultiplier(project: Project): number {
    const providerId = project.providerId || project.distributionStrategy?.primary?.platform;
    if (!providerId) return 1.0;

    // Best-effort: pull provider reach from persisted industry DB slot1 (matches the modding panel).
    // Falls back to the built-in defaults if the DB isn't available.
    const dbProvider = (() => {
      if (typeof window === 'undefined') return undefined;
      const db = loadIndustryDatabase('slot1');
      return db.providers?.find((p) => p.id === providerId);
    })();

    const reach = Math.max(0, Math.min(100, (dbProvider?.reach ?? findDefaultProviderById(providerId)?.reach) ?? 70));

    // Keep impact meaningful but not game-breaking.
    // reach 0 => 0.85, reach 100 => 1.15
    return 0.85 + (reach / 100) * 0.3;
  }

  // Core calculation reused from film revenue logic but adapted to views
  private static calculateWeeklyViews(project: Project, weekIndex: number): number {
    // Base views potential from budget (bigger budget, more promo/quality), ensure minimum
    const baseViews = Math.max(Math.floor(project.budget.total / 20), 100_000); // 1 view per $20, min 100k

    // Critics/audience influence
    const criticsMultiplier = Math.max(0.5, (project.metrics?.criticsScore || 50) / 100);
    const audienceMultiplier = Math.max(0.5, (project.metrics?.audienceScore || 50) / 100);

    // Marketing influence
    let marketingMultiplier = 1.0;
    if (project.marketingCampaign) {
      const buzzBonus = Math.max(0, (project.marketingCampaign.buzz || 0) / 100);
      const budgetBonus = Math.max(0, (project.marketingCampaign.budgetSpent || 0) / 1_000_000 * 0.05);
      marketingMultiplier = 1 + buzzBonus + budgetBonus;
    }

    // Star power
    const starPowerMultiplier = 1 + Math.min(0.4, project.starPowerBonus || 0);

    // Weekly curve for TV (slower decay than box office; binge tail)
    const curve = [
      1.0, 0.8, 0.7, 0.6, 0.55, 0.5, 0.45, 0.4, 0.36, 0.33,
      0.30, 0.28, 0.26, 0.24, 0.22, 0.20, 0.18, 0.16, 0.15, 0.14,
      0.13, 0.12, 0.11, 0.10
    ];
    const weeklyMultiplier = curve[weekIndex] ?? 0.08;

    const providerMultiplier = this.getProviderReachMultiplier(project);

    const totalViews = baseViews * criticsMultiplier * audienceMultiplier * marketingMultiplier * starPowerMultiplier * providerMultiplier * weeklyMultiplier;
    return Math.max(50_000, Math.floor(totalViews));
  }

  private static getInitialCompletionRate(project: Project): number {
    const base = 55;
    const critics = project.metrics?.criticsScore ?? 50;
    const audience = project.metrics?.audienceScore ?? 50;
    const quality = (critics + audience) / 2;
    return Math.min(95, Math.max(35, Math.floor(base + (quality - 50) * 0.3)));
  }

  private static getInitialAudienceShare(project: Project): number {
    const base = 5; // %
    const marketing = project.marketingCampaign ? 3 : 0;
    return Math.min(40, base + marketing + Math.floor((project.starPowerBonus || 0) * 10));
  }

  private static getInitialSubscriberGrowth(project: Project): number {
    const budgetFactor = Math.min(200_000, Math.floor(project.budget.total / 5));
    return Math.max(1_000, budgetFactor);
  }

  private static updateCompletionRate(project: Project, weekIndex: number): number {
    const initial = project.metrics?.streaming?.completionRate || this.getInitialCompletionRate(project);
    return Math.max(30, Math.floor(initial - weekIndex * 0.5));
  }

  private static updateAudienceShare(project: Project, weekIndex: number): number {
    const initial = project.metrics?.streaming?.audienceShare || this.getInitialAudienceShare(project);
    return Math.max(3, Math.floor(initial - weekIndex * 0.3));
  }

  private static updateSubscriberGrowth(project: Project, weeklyViews: number): number {
    // Rough proxy: a fraction of weekly views correlate to subscriptions
    return Math.floor(weeklyViews * 0.02);
  }
}
