import type { Project } from '@/types/game';
import { stableInt } from '@/utils/stableRandom';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class StreamingFilmSystem {
  static initializeRelease(project: Project, releaseWeek: number, releaseYear: number): Project {
    const criticsScore =
      project.metrics?.criticsScore ?? stableInt(`${project.id}|critics|${releaseYear}|${releaseWeek}`, 50, 90);

    const audienceScore =
      project.metrics?.audienceScore ?? stableInt(`${project.id}|audience|${releaseYear}|${releaseWeek}`, 50, 90);

    const avgScore = (criticsScore + audienceScore) / 2;

    const buzz = project.marketingData?.currentBuzz ?? project.marketingCampaign?.buzz ?? 0;
    const runtimeMinutes = project.script?.estimatedRuntime || 110;

    const baseViews = Math.max(250_000, Math.floor(project.budget.total * 0.03));
    const qualityMultiplier = clamp(avgScore / 70, 0.35, 1.25);
    const buzzMultiplier = 1 + clamp(buzz / 200, 0, 0.9);
    const starMultiplier = 1 + clamp(project.starPowerBonus ?? 0, 0, 0.5);

    const viewsFirstWeek = Math.max(100_000, Math.floor(baseViews * qualityMultiplier * buzzMultiplier * starMultiplier));
    const completionRate = clamp(Math.floor(45 + (avgScore - 50) * 0.6), 35, 90);
    const audienceShare = clamp(Math.floor((viewsFirstWeek / 1_000_000) * 2.5), 1, 35);

    const totalViews = viewsFirstWeek;
    const watchTimeHours = Math.floor(totalViews * (runtimeMinutes / 60) * (completionRate / 100));
    const subscriberGrowth = Math.floor(totalViews * 0.012);

    return {
      ...project,
      status: 'released' as any,
      currentPhase: 'distribution' as any,
      phaseDuration: -1,
      releaseWeek,
      releaseYear,
      metrics: {
        ...project.metrics,
        criticsScore,
        audienceScore,
        inTheaters: false,
        theaterCount: 0,
        theatricalRunLocked: true,
        boxOfficeStatus: 'Streaming Premiere',
        boxOfficeTotal: project.metrics?.boxOfficeTotal ?? 0,
        weeksSinceRelease: 0,
        streamingViews: totalViews,
        streaming: {
          viewsFirstWeek,
          totalViews,
          completionRate,
          audienceShare,
          watchTimeHours,
          subscriberGrowth,
        },
      },
    };
  }

  static processWeeklyPerformance(project: Project, currentWeek: number, currentYear: number): Project {
    if (!project.releaseWeek || !project.releaseYear) return project;

    const currentAbs = (currentYear * 52) + currentWeek;
    const releaseAbs = (project.releaseYear * 52) + project.releaseWeek;

    if (currentAbs < releaseAbs) return project;

    const weeksSinceRelease = Math.max(0, currentAbs - releaseAbs);

    const existingFirstWeek = project.metrics?.streaming?.viewsFirstWeek;
    const viewsFirstWeek =
      typeof existingFirstWeek === 'number' && existingFirstWeek > 0
        ? existingFirstWeek
        : Math.max(100_000, Math.floor(project.budget.total * 0.03));

    // Decay curve for weekly streaming viewership.
    const weeklyDecay = 0.72;

    const totalViews = Math.floor(
      viewsFirstWeek * (1 - Math.pow(weeklyDecay, weeksSinceRelease + 1)) / (1 - weeklyDecay)
    );

    const completionRate = project.metrics?.streaming?.completionRate ?? 60;
    const audienceShare = project.metrics?.streaming?.audienceShare ?? clamp(Math.floor((viewsFirstWeek / 1_000_000) * 2.5), 1, 35);

    const runtimeMinutes = project.script?.estimatedRuntime || 110;
    const watchTimeHours = Math.floor(totalViews * (runtimeMinutes / 60) * (completionRate / 100));
    const subscriberGrowth = Math.floor(totalViews * 0.012);

    return {
      ...project,
      metrics: {
        ...project.metrics,
        weeksSinceRelease,
        streamingViews: totalViews,
        streaming: {
          viewsFirstWeek,
          totalViews,
          completionRate,
          audienceShare,
          watchTimeHours,
          subscriberGrowth,
        },
      },
    };
  }
}
