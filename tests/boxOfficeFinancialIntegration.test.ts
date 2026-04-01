import { describe, expect, it, beforeEach } from 'vitest';
import { BoxOfficeSystem } from '@/components/game/BoxOfficeSystem';
import { FinancialEngine } from '@/components/game/FinancialEngine';
import type { Project } from '@/types/game';

describe('BoxOfficeSystem + FinancialEngine integration', () => {
  beforeEach(() => {
    FinancialEngine.clearLedger();
  });

  it('records opening week box office into the ledger and does not double-count week 0', () => {
    const project = {
      id: 'film-1',
      title: 'Test Film',
      type: 'film',
      status: 'post-production',
      currentPhase: 'post-production',
      budget: { total: 10_000_000, spent: 0 },
      script: { id: 's-1', title: 'Test Film', genre: 'drama', logline: '', pages: 100, quality: 50, budget: 10_000_000, writer: 'Test', developmentStage: 'polish', themes: [], targetAudience: 'general', estimatedRuntime: 100, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 5, cgiIntensity: 'minimal' }, characters: [] },
      cast: [],
      contractedTalent: [],
      marketingData: { currentBuzz: 50, totalSpent: 0, campaigns: [] },
      metrics: { criticsScore: 70, audienceScore: 75 },
    } as unknown as Project;

    const released = BoxOfficeSystem.initializeRelease(project, 10, 2024);
    const openingTotal = released.metrics?.boxOfficeTotal || 0;
    expect(openingTotal).toBeGreaterThan(0);

    const openingFinancials = FinancialEngine.getFilmFinancials(project.id);
    expect(openingFinancials.revenue).toBe(openingTotal);

    // If processWeeklyRevenue is called on the release week, it should not add additional revenue.
    const week0 = BoxOfficeSystem.processWeeklyRevenue(released, 10, 2024);
    expect(week0.metrics?.boxOfficeTotal).toBe(openingTotal);
    expect(FinancialEngine.getFilmFinancials(project.id).revenue).toBe(openingTotal);
  });

  it('records each post-release week revenue into the ledger', () => {
    const project = {
      id: 'film-2',
      title: 'Test Film 2',
      type: 'film',
      status: 'post-production',
      currentPhase: 'post-production',
      budget: { total: 20_000_000, spent: 0 },
      script: { id: 's-2', title: 'Test Film 2', genre: 'action', logline: '', pages: 110, quality: 60, budget: 20_000_000, writer: 'Test', developmentStage: 'polish', themes: [], targetAudience: 'general', estimatedRuntime: 110, characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 5, cgiIntensity: 'minimal' }, characters: [] },
      cast: [],
      contractedTalent: [],
      marketingData: { currentBuzz: 50, totalSpent: 0, campaigns: [] },
      metrics: { criticsScore: 70, audienceScore: 75 },
    } as unknown as Project;

    const released = BoxOfficeSystem.initializeRelease(project, 10, 2024);
    const openingTotal = released.metrics?.boxOfficeTotal || 0;

    const week1 = BoxOfficeSystem.processWeeklyRevenue(released, 11, 2024);
    const week1Total = week1.metrics?.boxOfficeTotal || 0;

    expect(week1Total).toBeGreaterThan(openingTotal);
    expect(FinancialEngine.getFilmFinancials(project.id).revenue).toBe(week1Total);
  });
});
