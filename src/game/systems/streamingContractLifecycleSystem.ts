import type { GameState, Project } from '@/types/game';
import type { StreamingContract } from '@/types/streamingTypes';
import type { TickSystem } from '../core/types';
import { stableInt } from '@/utils/stableRandom';

function isProjectLike(value: any): value is Project {
  return !!value && typeof value === 'object' && typeof value.id === 'string' && 'script' in value;
}

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clampInt(n: number, min: number, max: number): number {
  return Math.floor(clamp(n, min, max));
}

function normalizeExpectedCompletionRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value <= 1 ? value * 100 : value;
}

function contractSeedRoot(state: GameState, project: Project, contract: StreamingContract): string {
  const seedRoot = state.universeSeed ?? state.studio.id ?? 'seed';
  return `${seedRoot}|contract:${project.id}:${contract.platformId}:${contract.startYear}:W${contract.startWeek}`;
}

function computeSyntheticContractMetrics(params: {
  state: GameState;
  project: Project;
  contract: StreamingContract;
  currentAbs: number;
}): { totalViews: number; completionRate: number; subscriberGrowth: number } {
  const { state, project, contract, currentAbs } = params;

  const startAbs = absWeek(contract.startWeek, contract.startYear);
  const weeksSinceStart = Math.max(0, currentAbs - startAbs);

  const duration = Math.max(1, Math.floor(contract.duration || 1));

  const critics = clampInt(Math.floor(project.metrics?.criticsScore ?? project.script?.quality ?? 60), 20, 95);
  const audience = clampInt(Math.floor(project.metrics?.audienceScore ?? critics), 20, 95);
  const avgScore = (critics + audience) / 2;

  const expected = Math.max(1, Math.floor(contract.expectedViewers || 1));

  // Geometric decay model; calibrated to land close to expectedViewers by the end of the window.
  const decay = 0.78;
  const horizon = clampInt(duration, 4, 52);
  const denom = (1 - Math.pow(decay, horizon)) / (1 - decay);
  const idealFirstWeek = expected / Math.max(1, denom);

  const buzz = project.marketingData?.currentBuzz ?? project.marketingCampaign?.buzz ?? 0;

  const qualityFactor = clamp(avgScore / 70, 0.55, 1.35);
  const buzzFactor = 1 + clamp(buzz / 250, 0, 0.6);

  const seed = contractSeedRoot(state, project, contract);
  const noisePct = stableInt(`${seed}|noise`, -12, 12) / 100;

  const firstWeek = Math.max(25_000, Math.floor(idealFirstWeek * qualityFactor * buzzFactor * (1 + noisePct)));

  const totalViews = Math.max(0, Math.floor(firstWeek * (1 - Math.pow(decay, weeksSinceStart + 1)) / (1 - decay)));

  const expectedCompletionPct = normalizeExpectedCompletionRate(contract.expectedCompletionRate);
  const completionCenter = expectedCompletionPct > 0 ? expectedCompletionPct : 62;

  const completionNoise = stableInt(`${seed}|completion`, -8, 8);
  const completionRate = clampInt(completionCenter + completionNoise + (avgScore - 60) * 0.2, 35, 90);

  const expectedSubGrowth = Math.max(0, Math.floor(contract.expectedSubscriberGrowth || 0));
  const subNoisePct = stableInt(`${seed}|subs`, -15, 15) / 100;

  const subscriberGrowth = expectedSubGrowth > 0
    ? Math.max(0, Math.floor(expectedSubGrowth * (totalViews / expected) * (1 + subNoisePct)))
    : Math.max(0, Math.floor(totalViews * 0.01));

  return { totalViews, completionRate, subscriberGrowth };
}

function computeContractPerformanceScore(params: {
  contract: StreamingContract;
  totalViews: number;
  completionRate: number;
  subscriberGrowth: number;
}): number {
  const { contract, totalViews, completionRate, subscriberGrowth } = params;

  const scores: number[] = [];

  const expectedViewers = Math.max(0, Math.floor(contract.expectedViewers || 0));
  const viewershipScore = expectedViewers > 0 ? Math.min(100, (totalViews / expectedViewers) * 100) : 0;
  scores.push(viewershipScore);

  const expectedCompletionRate = normalizeExpectedCompletionRate(contract.expectedCompletionRate);
  const completionScore = expectedCompletionRate > 0 ? Math.min(100, (completionRate / expectedCompletionRate) * 100) : 0;
  scores.push(completionScore);

  const expectedSubscriberGrowth = Math.max(0, Math.floor(contract.expectedSubscriberGrowth || 0));
  const subscriberScore = expectedSubscriberGrowth > 0 ? Math.min(100, (subscriberGrowth / expectedSubscriberGrowth) * 100) : 100;
  scores.push(subscriberScore);

  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return clampInt(avgScore, 0, 100);
}

function settleContract(params: {
  contract: StreamingContract;
  totalViews: number;
}): { contract: StreamingContract; budgetDelta: number } {
  const { contract, totalViews } = params;

  if (typeof contract.settledWeek === 'number' && typeof contract.settledYear === 'number') {
    return { contract, budgetDelta: 0 };
  }

  let bonusEarned = 0;
  for (const bonus of contract.performanceBonus || []) {
    if (!bonus) continue;
    if (totalViews >= bonus.viewershipThreshold) {
      bonusEarned = Math.max(bonusEarned, Math.floor(bonus.bonusAmount));
    }
  }

  let penalty = 0;
  if (contract.penaltyClause && totalViews < contract.penaltyClause.minViewers) {
    penalty = Math.max(0, Math.floor(contract.penaltyClause.penaltyAmount));
  }

  const status: StreamingContract['status'] = penalty > 0 ? 'breached' : 'fulfilled';

  return {
    contract: {
      ...contract,
      status,
      settledBonus: bonusEarned,
      settledPenalty: penalty,
    },
    budgetDelta: bonusEarned - penalty,
  };
}

export const StreamingContractLifecycleSystem: TickSystem = {
  id: 'streamingContractLifecycle',
  label: 'Streaming contract lifecycle',
  dependsOn: ['televisionPerformance', 'streamingPerformance'],
  onTick: (state, ctx) => {
    const currentAbs = absWeek(ctx.week, ctx.year);

    const candidates: Project[] = [];

    for (const p of state.projects || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    for (const p of (state.aiStudioProjects as any) || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    for (const p of state.allReleases || []) {
      if (isProjectLike(p)) candidates.push(p);
    }

    const seen = new Set<string>();
    const unique = candidates.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const updatedById = new Map<string, Project>();

    let studioBudgetDelta = 0;

    for (const project0 of unique) {
      const contract0 = project0.streamingContract;
      if (!contract0) continue;

      const isPersistent = (contract0 as any).persistentRights === true || project0.id.startsWith('project:original:');
      if (!isPersistent && contract0.status !== 'active') continue;

      const startAbs = absWeek(contract0.startWeek, contract0.startYear);
      if (currentAbs < startAbs) continue;

      if (contract0.lastEvaluatedWeek === ctx.week && contract0.lastEvaluatedYear === ctx.year) continue;

      const hasProjectStreaming = typeof project0.metrics?.streaming?.totalViews === 'number';

      const baselineStreamingViews =
        typeof contract0.baselineStreamingViews === 'number'
          ? contract0.baselineStreamingViews
          : hasProjectStreaming && currentAbs === startAbs
            ? project0.metrics.streaming!.totalViews
            : 0;

      const observed = hasProjectStreaming
        ? {
            totalViews: Math.max(0, Math.floor((project0.metrics!.streaming!.totalViews || 0) - baselineStreamingViews)),
            completionRate: clampInt(Math.floor(project0.metrics!.streaming!.completionRate || 0), 0, 100),
            subscriberGrowth: Math.max(0, Math.floor(project0.metrics!.streaming!.subscriberGrowth || 0)),
          }
        : computeSyntheticContractMetrics({ state, project: project0, contract: contract0, currentAbs });

      const performanceScore = computeContractPerformanceScore({
        contract: contract0,
        totalViews: observed.totalViews,
        completionRate: observed.completionRate,
        subscriberGrowth: observed.subscriberGrowth,
      });

      let contract: StreamingContract = {
        ...contract0,
        baselineStreamingViews,
        observedTotalViews: observed.totalViews,
        observedCompletionRate: observed.completionRate,
        observedSubscriberGrowth: observed.subscriberGrowth,
        performanceScore,
        lastEvaluatedWeek: ctx.week,
        lastEvaluatedYear: ctx.year,
      };

      if (!isPersistent && contract.status === 'active') {
        const endAbs = absWeek(contract.endWeek, contract.endYear);

        if (currentAbs >= endAbs) {
          const settled = settleContract({ contract, totalViews: observed.totalViews });
          contract = {
            ...settled.contract,
            settledWeek: ctx.week,
            settledYear: ctx.year,
          };
          studioBudgetDelta += settled.budgetDelta;
        }
      }

      const changed =
        contract.status !== contract0.status ||
        contract.performanceScore !== contract0.performanceScore ||
        contract.observedTotalViews !== contract0.observedTotalViews ||
        contract.observedCompletionRate !== contract0.observedCompletionRate ||
        contract.observedSubscriberGrowth !== contract0.observedSubscriberGrowth ||
        contract.baselineStreamingViews !== contract0.baselineStreamingViews ||
        contract.lastEvaluatedWeek !== contract0.lastEvaluatedWeek ||
        contract.lastEvaluatedYear !== contract0.lastEvaluatedYear ||
        contract.settledWeek !== contract0.settledWeek ||
        contract.settledYear !== contract0.settledYear ||
        contract.settledBonus !== contract0.settledBonus ||
        contract.settledPenalty !== contract0.settledPenalty;

      if (!changed) continue;

      updatedById.set(project0.id, {
        ...project0,
        streamingContract: contract,
      });
    }

    if (updatedById.size === 0 && studioBudgetDelta === 0) return state;

    const patch = (value: any): any => {
      if (!isProjectLike(value)) return value;
      return updatedById.get(value.id) || value;
    };

    const next: GameState = {
      ...(state as GameState),
      ...(studioBudgetDelta !== 0
        ? {
            studio: {
              ...state.studio,
              budget: (state.studio.budget || 0) + studioBudgetDelta,
            },
          }
        : {}),
      projects: (state.projects || []).map(patch) as Project[],
      aiStudioProjects: ((state.aiStudioProjects as any) || []).map(patch) as Project[],
      allReleases: (state.allReleases || []).map(patch) as Array<Project | any>,
    };

    return next;
  },
};
