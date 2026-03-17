import { describe, expect, it } from 'vitest';
import type { GameState, Script } from '@/types/game';
import { normalizeStudioGovernanceState } from '@/utils/studioGovernanceNormalization';
import { getGreenlightGateReport } from '@/utils/studioGovernance';
import { StudioGovernanceSystem } from '@/game/systems/studioGovernanceSystem';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';

function makeBaseState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    studio: {
      id: 'studio-1',
      name: 'Player Studio',
      reputation: 50,
      budget: 1_000_000,
      founded: 2000,
      specialties: ['drama'],
      awards: [],
      debt: 0,
    },
    currentYear: 2027,
    currentWeek: 10,
    currentQuarter: 1,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios: [],
    marketConditions: {
      trendingGenres: ['drama'],
      audiencePreferences: [],
      economicClimate: 'stable',
      technologicalAdvances: [],
      regulatoryChanges: [],
      seasonalTrends: [],
      competitorReleases: [],
    },
    eventQueue: [],
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
    mode: 'single',
  };

  return { ...base, ...(overrides || {}) };
}

function makeScript(overrides?: Partial<Script>): Script {
  return {
    id: 's1',
    title: 'Test Script',
    genre: 'drama',
    logline: 'x',
    writer: 'x',
    pages: 100,
    quality: 60,
    budget: 10_000_000,
    developmentStage: 'final',
    themes: [],
    targetAudience: 'general',
    estimatedRuntime: 110,
    characteristics: {
      tone: 'balanced',
      pacing: 'steady',
      dialogue: 'naturalistic',
      visualStyle: 'realistic',
      commercialAppeal: 5,
      criticalPotential: 5,
      cgiIntensity: 'minimal',
    },
    ...(overrides || {}),
  };
}

describe('StudioGovernanceSystem', () => {
  it('normalizes governance defaults for older saves', () => {
    const state = makeBaseState();
    const normalized = normalizeStudioGovernanceState(state);

    expect(normalized.governance).toBeTruthy();
    expect(normalized.governance!.boardConfidence).toBeGreaterThanOrEqual(0);
    expect(normalized.governance!.capability.maxActiveProjects).toBeGreaterThanOrEqual(1);
  });

  it('blocks greenlighting when studio capability is maxed', () => {
    const script = makeScript({ budget: 5_000_000, characteristics: { ...makeScript().characteristics, commercialAppeal: 7 } });

    const state = makeBaseState({
      governance: {
        boardConfidence: 100,
        internalPressure: { board: 0, finance: 0, investors: 0 },
        externalPressure: { competition: 0, talent: 0, market: 0 },
        capability: { maxActiveProjects: 1 },
      },
      projects: [
        {
          id: 'p1',
          title: 'In Flight',
          type: 'feature',
          currentPhase: 'production',
          budget: { total: 1_000_000, allocated: {} as any, spent: {} as any, overages: {} as any },
          cast: [],
          crew: [],
          timeline: {} as any,
          locations: [],
          distributionStrategy: { primary: {} as any, international: [], windows: [], marketingBudget: 0 } as any,
          status: 'production',
          metrics: {} as any,
          phaseDuration: 1,
          contractedTalent: [],
          developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 0, locationSecured: 0, completionThreshold: 0, issues: [] },
          script: makeScript({ id: 's0' }),
        } as any,
      ],
    });

    const gate = getGreenlightGateReport({ state, script });
    expect(gate.canGreenlight).toBe(false);
    expect(gate.reasons.some((r) => r.includes('capacity'))).toBe(true);
  });

  it('reduces board confidence when cash runway is low', () => {
    const state = makeBaseState({
      studio: { ...makeBaseState().studio, budget: 1_000, reputation: 50 },
      governance: {
        boardConfidence: 90,
        internalPressure: { board: 0, finance: 0, investors: 0 },
        externalPressure: { competition: 0, talent: 0, market: 0 },
        capability: { maxActiveProjects: 3 },
      },
      projects: [
        {
          id: 'p1',
          title: 'Burn',
          type: 'feature',
          currentPhase: 'production',
          budget: { total: 10_000_000, allocated: {} as any, spent: {} as any, overages: {} as any },
          cast: [],
          crew: [],
          timeline: {} as any,
          locations: [],
          distributionStrategy: { primary: {} as any, international: [], windows: [], marketingBudget: 0 } as any,
          status: 'production',
          metrics: {} as any,
          phaseDuration: 1,
          contractedTalent: [{ talentId: 't1', role: 'Lead Actor', weeklyPay: 2_000, contractWeeks: 10, weeksRemaining: 10, startWeek: 1 }],
          developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 0, locationSecured: 0, completionThreshold: 0, issues: [] },
          script: makeScript({ id: 's0' }),
        } as any,
      ],
    });

    const result = advanceWeek(state, createRng(1), [StudioGovernanceSystem]);
    const next = result.nextState;

    expect(next.governance).toBeTruthy();
    expect(next.governance!.boardConfidence).toBeLessThan(90);
  });
});
