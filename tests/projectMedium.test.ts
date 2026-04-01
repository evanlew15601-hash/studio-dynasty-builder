import { describe, expect, it } from 'vitest';
import { isPrimaryStreamingFilm, isTheatricalFilm, isTvProject } from '@/utils/projectMedium';

function baseProject(overrides: any = {}): any {
  return {
    id: 'p1',
    title: 'Project',
    type: 'feature',
    script: { id: 's1', title: 'Script', genre: 'drama' },
    budget: { total: 1 },
    cast: [],
    crew: [],
    contractedTalent: [],
    developmentProgress: { scriptCompletion: 0, budgetApproval: 0, talentAttached: 0, locationSecured: 0, completionThreshold: 0, issues: [] },
    distributionStrategy: { primary: { platform: 'Theaters', type: 'theatrical', revenue: { type: 'box-office', studioShare: 55 } }, international: [], windows: [], marketingBudget: 0 },
    metrics: {},
    currentPhase: 'development',
    status: 'development',
    phaseDuration: 0,
    ...overrides,
  };
}

describe('projectMedium', () => {
  it('detects TV projects', () => {
    expect(isTvProject(baseProject({ type: 'series' }))).toBe(true);
    expect(isTvProject(baseProject({ type: 'limited-series' }))).toBe(true);
    expect(isTvProject(baseProject({ type: 'feature' }))).toBe(false);
  });

  it('detects streaming films via releaseStrategy', () => {
    const p = baseProject({ releaseStrategy: { type: 'streaming' } });
    expect(isPrimaryStreamingFilm(p)).toBe(true);
    expect(isTheatricalFilm(p)).toBe(false);
  });

  it('detects streaming films via streamingPremiereDeal (legacy)', () => {
    const p = baseProject({ streamingPremiereDeal: { providerId: 'streamflix', signedWeek: 1, signedYear: 2024, upfrontPayment: 0, marketingSupport: 0 } });
    expect(isPrimaryStreamingFilm(p)).toBe(true);
  });

  it('detects streaming films via distributionStrategy.primary.type (legacy)', () => {
    const p = baseProject({ distributionStrategy: { primary: { platform: 'StreamFlix', type: 'streaming', revenue: { type: 'subscription-share', studioShare: 60 } }, international: [], windows: [], marketingBudget: 0 } });
    expect(isPrimaryStreamingFilm(p)).toBe(true);
  });

  it('does not classify TV projects as streaming films', () => {
    const p = baseProject({ type: 'series', distributionStrategy: { primary: { platform: 'StreamFlix', type: 'streaming', revenue: { type: 'subscription-share', studioShare: 60 } }, international: [], windows: [], marketingBudget: 0 } });
    expect(isPrimaryStreamingFilm(p)).toBe(false);
  });
});
