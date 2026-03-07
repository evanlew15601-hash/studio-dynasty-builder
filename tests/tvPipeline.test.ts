import { describe, expect, it } from 'vitest';
import { TVRatingsSystem } from '@/components/game/TVRatingsSystem';
import { TVEpisodeSystem } from '@/components/game/TVEpisodeSystem';
import type { Project } from '@/types/game';

function makeBaseTvProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'tv-1',
    title: 'Test Show',
    type: 'series',
    genre: 'drama' as any,
    status: 'released' as any,
    currentPhase: 'distribution' as any,
    budget: {
      total: 10_000_000,
      allocated: {
        aboveTheLine: 0,
        belowTheLine: 0,
        postProduction: 0,
        marketing: 0,
        distribution: 0,
        contingency: 0,
      },
      spent: {
        aboveTheLine: 0,
        belowTheLine: 0,
        postProduction: 0,
        marketing: 0,
        distribution: 0,
        contingency: 0,
      },
      overages: {
        aboveTheLine: 0,
        belowTheLine: 0,
        postProduction: 0,
        marketing: 0,
        distribution: 0,
        contingency: 0,
      },
    },
    distributionStrategy: {
      primary: {
        platform: 'netflix',
        type: 'streaming',
        revenue: { type: 'subscription-share', studioShare: 60 },
      },
      international: [],
      windows: [],
      marketingBudget: 0,
    },
    script: {
      id: 's1',
      title: 'Test Show',
      genre: 'drama' as any,
      logline: '',
      writer: '',
      pages: 1,
      quality: 50,
      budget: 10_000_000,
      developmentStage: 'polish' as any,
      themes: [],
      targetAudience: 'general' as any,
      estimatedRuntime: 45,
      characteristics: {
        tone: 'balanced' as any,
        pacing: 'steady' as any,
        dialogue: 'naturalistic' as any,
        visualStyle: 'realistic' as any,
        commercialAppeal: 5,
        criticalPotential: 5,
        cgiIntensity: 'minimal' as any,
      },
      characters: [],
    } as any,
    releaseWeek: 10,
    releaseYear: 2024,
    ...overrides,
  } as Project;
}

describe('TV pipeline guardrails', () => {
  it('TVRatingsSystem does not accrue streaming metrics until at least one episode has aired', () => {
    const project = makeBaseTvProject({
      metrics: {
        criticsScore: 70,
        audienceScore: 75,
      },
      seasons: [
        {
          seasonNumber: 1,
          totalEpisodes: 10,
          episodesAired: 0,
          releaseFormat: 'weekly',
          averageViewers: 0,
          seasonCompletionRate: 0,
          seasonDropoffRate: 0,
          totalBudget: 0,
          spentBudget: 0,
          productionStatus: 'complete',
          episodes: [],
        } as any,
      ],
    });

    const result = TVRatingsSystem.processWeeklyRatings(project, 11, 2024);
    expect(result).toBe(project);
  });

  it('TVEpisodeSystem weekly decay adds week-1 views without off-by-one inflation', () => {
    const project = makeBaseTvProject({
      seasons: [
        {
          seasonNumber: 1,
          totalEpisodes: 1,
          episodesAired: 1,
          releaseFormat: 'weekly',
          averageViewers: 0,
          seasonCompletionRate: 0,
          seasonDropoffRate: 0,
          totalBudget: 0,
          spentBudget: 0,
          productionStatus: 'complete',
          episodes: [
            {
              episodeNumber: 1,
              seasonNumber: 1,
              title: 'Ep1',
              runtime: 45,
              airDate: { week: 10, year: 2024 },
              viewers: 1000,
              completionRate: 80,
              averageWatchTime: 36,
              replayViews: 0,
              weeklyViews: [1000],
              cumulativeViews: 1000,
              viewerRetention: 100,
              productionCost: 0,
              socialMentions: 0,
            },
          ],
        } as any,
      ],
    });

    const updated = TVEpisodeSystem.processWeeklyEpisodeDecay(project, 11, 2024);
    expect(updated).not.toBe(project);

    const ep = updated.seasons?.[0].episodes[0];
    expect(ep.weeklyViews).toHaveLength(2);
    expect(ep.weeklyViews[1]).toBe(850); // 1000 * (1 - 0.15)
    expect(ep.cumulativeViews).toBe(1850);
  });

  it('TVEpisodeSystem.ensureSeason uses project episodeCount when provided', () => {
    const project = makeBaseTvProject({
      seasons: [],
      episodeCount: 13,
    });

    const updated = TVEpisodeSystem.ensureSeason(project);
    expect(updated.seasons?.[0]?.totalEpisodes).toBe(13);
  });
});
