/**
 * Game Store — Zustand + Immer based state management.
 *
 * Replaces the monolithic useState(gameState) in StudioMagnateGame.tsx.
 * UI panels subscribe to slices via selectors to avoid global rerenders.
 *
 * Usage:
 *   import { useGameStore } from '@/game/store';
 *   const budget = useGameStore(s => s.game.studio.budget);
 *   const advanceWeek = useGameStore(s => s.advanceWeek);
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { WritableDraft } from 'immer';
import type { Franchise, GameState, Project, Script, Studio, StudioAward, TalentPerson } from '@/types/game';
import { normalizeFranchisesState } from '@/utils/franchiseNormalization';
import { normalizePublicDomainState } from '@/utils/publicDomainNormalization';
import { normalizeStudioGovernanceState } from '@/utils/studioGovernanceNormalization';
import { getContractPlatformId } from '@/utils/platformIds';
import type { TickReport } from '@/types/tickReport';
import { createTickReport } from '@/utils/tickReport';
import type { ModBundle } from '@/types/modding';
import type { SeededRng } from './core/rng';
import { createRng, generateGameSeed, seedFromString } from './core/rng';
import { advanceWeek as tickAdvanceWeek } from './core/tick';
import { SystemRegistry } from './core/registry';
import type { TickResult, TickSystem } from './core/types';
import { checkTickOrdering, validateGameState, validateTickDelta } from './core/coreLoopChecks';
import { advanceWeekInWorker } from './worker/client';
import { saveGame } from '@/utils/saveLoad';
import { TalentLifecycleSystem } from './systems/talentLifecycleSystem';
import { TalentRetirementSystem } from './systems/talentRetirementSystem';
import { TalentBurnoutSystem } from './systems/talentBurnoutSystem';
import { TalentDebutSystem } from './systems/talentDebutSystem';
import { WorldYearbookSystem } from './systems/worldYearbookSystem';
import { WorldMilestonesSystem } from './systems/worldMilestonesSystem';
import { WorldErasSystem } from './systems/worldErasSystem';
import { GenreTrendsSystem } from './systems/genreTrendsSystem';
import { StudioFortunesSystem } from './systems/studioFortunesSystem';
import { CompetitorStudioLifecycleSystem } from './systems/competitorStudioLifecycleSystem';
import { PlayerLegacySystem } from './systems/playerLegacySystem';
import { WorldArchiveSystem } from './systems/worldArchiveSystem';
import { TalentFilmographySystem } from './systems/talentFilmographySystem';
import { TalentCareerArcSystem } from './systems/talentCareerArcSystem';
import { TalentAvailabilitySystem } from './systems/talentAvailabilitySystem';
import { TalentContractsSystem } from './systems/talentContractsSystem';
import { IndustryGossipSystem } from './systems/industryGossipSystem';
import { AiTelevisionSystem } from './systems/aiTelevisionSystem';
import { ProjectLifecycleSystem } from './systems/projectLifecycleSystem';
import { MarketingCampaignSystem } from './systems/marketingCampaignSystem';
import { ScheduledReleaseSystem } from './systems/scheduledReleaseSystem';
import { TelevisionPerformanceSystem } from './systems/televisionPerformanceSystem';
import { StreamingPerformanceSystem } from './systems/streamingPerformanceSystem';
import { StreamingContractLifecycleSystem } from './systems/streamingContractLifecycleSystem';
import { BoxOfficeSystem } from './systems/boxOfficeSystem';
import { PostTheatricalRevenueSystem } from './systems/postTheatricalRevenueSystem';
import { StudioEconomySystem } from './systems/studioEconomySystem';
import { StudioRevenueSystem } from './systems/studioRevenueSystem';
import { LoanPaymentSystem } from './systems/loanPaymentSystem';
import { AiStudioFilmSystem } from './systems/aiStudioFilmSystem';
import { CompetitorFilmReleaseSystem } from './systems/competitorFilmReleaseSystem';
import { MediaHydrationSystem } from './systems/mediaHydrationSystem';
import { MediaWeeklySystem } from './systems/mediaWeeklySystem';
import { PlayerCircleDramaSystem } from './systems/playerCircleDramaSystem';
import { StudioGovernanceSystem } from './systems/studioGovernanceSystem';
import { AwardsSeasonSystem } from './systems/awardsSeasonSystem';
import { PlatformMarketBootstrapSystem } from './systems/platformMarketBootstrapSystem';
import { PlatformOriginalsPipelineSystem } from './systems/platformOriginalsPipelineSystem';
import { PlatformOriginalsReleaseCadenceSystem } from './systems/platformOriginalsReleaseCadenceSystem';
import { SeasonAiringStatusSystem } from './systems/seasonAiringStatusSystem';
import { PlatformAutoStreamingWindowsSystem } from './systems/platformAutoStreamingWindowsSystem';
import { PlatformCatalogSystem } from './systems/platformCatalogSystem';
import { PlatformEconomySystem } from './systems/platformEconomySystem';
import { PlatformCompetitionAndMAndASystem } from './systems/platformCompetitionAndMAndASystem';
import { PlatformCrisisSystem } from './systems/platformCrisisSystem';
import { PlatformOpportunitiesSystem } from './systems/platformOpportunitiesSystem';
import { PlatformMnaOffersSystem } from './systems/platformMnaOffersSystem';
import { PlatformOutputDealSystem } from './systems/platformOutputDealSystem';
import { PlatformTalentDealsSystem } from './systems/platformTalentDealsSystem';
import { PlatformBiddingWarSystem } from './systems/platformBiddingWarSystem';
import { MediaEngine } from '@/game/media/mediaEngine';
import { MediaResponseSystem } from '@/game/media/mediaResponseSystem';
import { getPlayerCircleDramaMediaTemplate } from './systems/playerCircleDramaModding';

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export interface GameStoreState {
  /** The canonical game state */
  game: GameState | null;

  /** Current game seed (persisted in saves) */
  seed: number;

  /** The PRNG instance (recreated from seed on load) */
  rng: SeededRng | null;

  /** System registry for tick pipeline */
  registry: SystemRegistry;

  /** Last tick report (for Week Recap UI) */
  lastTickReport: TickReport | null;

  /** Rolling history of recent tick reports */
  tickHistory: TickReport[];

  /** Whether the game has been initialized */
  initialized: boolean;

  /** Active mod bundle */
  mods: ModBundle | null;

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /** Initialize a new game */
  initGame: (state: GameState, seed?: number) => void;

  /** Load a saved game */
  loadGame: (state: GameState, seed?: number) => void;

  /** Advance one week using the tick pipeline */
  advanceWeek: (options?: { suppressRecap?: boolean }) => TickReport | null;

  /** Advance one week using a Web Worker when possible */
  advanceWeekAsync: (options?: { suppressRecap?: boolean }) => Promise<TickReport | null>;

  /** Merge a partial update into the root game state (legacy onGameStateUpdate replacement) */
  mergeGameState: (updates: Partial<GameState>) => void;

  /** Update the studio */
  updateStudio: (updates: Partial<Studio>) => void;

  /** Append awards to the studio */
  addStudioAwards: (awards: StudioAward[]) => void;

  /** Convenience reputation update */
  updateReputation: (delta: number) => void;

  /** Convenience budget update */
  updateBudget: (delta: number) => void;

  /** Spend funds; will automatically take debt if budget would go negative (up to a cap). */
  spendStudioFunds: (amount: number) => { success: boolean; loanTaken?: number };

  /** Update a project */
  updateProject: (projectId: string, updates: Partial<Project>, marketingCost?: number) => void;

  /** Replace a project wholesale */
  replaceProject: (project: Project) => void;

  /** Add a project */
  addProject: (project: Project) => void;

  /** Append a project id to a franchise's entries */
  appendFranchiseEntry: (franchiseId: string, projectId: string) => void;

  /** Update talent */
  updateTalent: (talentId: string, updates: Partial<TalentPerson>) => void;

  /** Add talent ID to player shortlist (returns true if added) */
  addToShortlist: (talentId: string) => boolean;

  /** Remove talent ID from player shortlist */
  removeFromShortlist: (talentId: string) => boolean;

  /** Toggle talent ID in player shortlist */
  toggleShortlist: (talentId: string) => boolean;

  /** Clear entire shortlist */
  clearShortlist: () => void;

  /** Apply a delta to select talent stats (clamped) */
  bumpTalent: (talentId: string, delta: { reputation?: number; publicImage?: number }) => void;

  /** Upsert a franchise */
  upsertFranchise: (franchise: Franchise) => void;

  /** Update a franchise */
  updateFranchise: (franchiseId: string, updates: Partial<Franchise>) => void;

  /** Upsert a script */
  upsertScript: (script: Script) => void;

  /** Set game state directly (escape hatch for legacy code migration) */
  setGameState: (updater: (prev: GameState) => GameState) => void;

  /** Register tick systems */
  registerSystems: (systems: TickSystem[]) => void;

  /** Save the current game */
  saveToSlot: (slotId: string, currentPhase?: string, unlockedAchievementIds?: string[]) => void;

  /** Set mods */
  setMods: (mods: ModBundle) => void;

  /** Clear the last tick report */
  clearTickReport: () => void;

  /** Resolve (apply and remove) a queued GameEvent */
  resolveGameEvent: (eventId: string, choice?: string | number) => void;
}

// ---------------------------------------------------------------------------
// Store creation
// ---------------------------------------------------------------------------

const MAX_TICK_HISTORY = 20;

export const useGameStore: import('zustand').UseBoundStore<import('zustand').StoreApi<GameStoreState>> = create<GameStoreState>()(
  immer((set, get) => ({
    game: null,
    seed: 0,
    rng: null,
    registry: (() => {
      const r = new SystemRegistry();
      r.register(MediaHydrationSystem);
      r.register(TalentLifecycleSystem);
      r.register(TalentBurnoutSystem);
      r.register(TalentRetirementSystem);
      r.register(StudioGovernanceSystem);
      r.register(WorldMilestonesSystem);
      r.register(WorldErasSystem);
      r.register(GenreTrendsSystem);
      r.register(StudioFortunesSystem);
      r.register(CompetitorStudioLifecycleSystem);
      r.register(PlayerLegacySystem);
      r.register(WorldYearbookSystem);
      r.register(WorldArchiveSystem);
      r.register(TalentDebutSystem);
      r.register(AiTelevisionSystem);
      r.register(AiStudioFilmSystem);
      r.register(ProjectLifecycleSystem);
      r.register(TalentContractsSystem);
      r.register(TalentAvailabilitySystem);
      r.register(MarketingCampaignSystem);
      r.register(ScheduledReleaseSystem);
      r.register(CompetitorFilmReleaseSystem);
      r.register(TelevisionPerformanceSystem);
      r.register(StreamingPerformanceSystem);
      r.register(StreamingContractLifecycleSystem);
      r.register(BoxOfficeSystem);
      r.register(PostTheatricalRevenueSystem);
      r.register(StudioRevenueSystem);
      r.register(LoanPaymentSystem);
      r.register(StudioEconomySystem);
      r.register(TalentFilmographySystem);
      r.register(TalentCareerArcSystem);
      r.register(IndustryGossipSystem);
      r.register(PlayerCircleDramaSystem);
      r.register(AwardsSeasonSystem);

      // Streaming Wars (DLC) — systems early-return unless dlc.streamingWars is true.
      r.register(PlatformMarketBootstrapSystem);
      r.register(PlatformOriginalsPipelineSystem);
      r.register(PlatformOriginalsReleaseCadenceSystem);
      r.register(SeasonAiringStatusSystem);
      r.register(PlatformAutoStreamingWindowsSystem);
      r.register(PlatformCatalogSystem);
      r.register(PlatformOutputDealSystem);
      r.register(PlatformEconomySystem);
      r.register(PlatformCompetitionAndMAndASystem);
      r.register(PlatformCrisisSystem);
      r.register(PlatformTalentDealsSystem);
      r.register(PlatformBiddingWarSystem);
      r.register(PlatformMnaOffersSystem);
      r.register(PlatformOpportunitiesSystem);

      // Media processing needs to run at the end so all systems that queue/inject media
      // (industry gossip, player circle, competitor releases) are captured in snapshots.
      r.register(MediaWeeklySystem);

      return r;
    })(),
    lastTickReport: null,
    tickHistory: [],
    initialized: false,
    mods: null,

    initGame: (state, seed) => {
      const gameSeed = seed ?? generateGameSeed();
      set((s) => {
        const next = {
          ...state,
          universeSeed: state.universeSeed ?? gameSeed,
          rngState: state.rngState ?? gameSeed,
          aiStudioProjects: state.aiStudioProjects ?? [],
        };
        s.game = normalizeStudioGovernanceState(normalizePublicDomainState(normalizeFranchisesState(next) as any) as any);
        s.seed = gameSeed;
        s.rng = createRng(gameSeed);
        s.initialized = true;
        s.lastTickReport = null;
        s.tickHistory = [];
      });
    },

    loadGame: (state, seed) => {
      const derivedUniverseSeed =
        typeof state.universeSeed === 'number'
          ? state.universeSeed
          : seedFromString(`${state.studio?.id ?? 'studio'}`);

      const derivedRngState = typeof state.rngState === 'number' ? state.rngState : derivedUniverseSeed;

      const gameSeed = seed ?? derivedRngState;

      set((s) => {
        const next = {
          ...state,
          universeSeed: typeof state.universeSeed === 'number' ? state.universeSeed : derivedUniverseSeed,
          rngState: typeof state.rngState === 'number' ? state.rngState : derivedRngState,
          aiStudioProjects: state.aiStudioProjects ?? [],
        };
        s.game = normalizeStudioGovernanceState(normalizePublicDomainState(normalizeFranchisesState(next) as any) as any);
        s.seed = gameSeed;
        s.rng = createRng(gameSeed);
        s.initialized = true;
        s.lastTickReport = null;
        s.tickHistory = [];
      });
    },

    advanceWeek: (options) => {
      const { game, rng, registry } = get();
      if (!game || !rng) return null;

      // Core gameplay loop: do not advance time while there are unresolved blocking events.
      // (TEW-style guard to prevent "skipping past" important decisions.)
      if ((game.eventQueue || []).length > 0) return null;

      const systems = registry.getOrdered();

      if (import.meta.env.DEV) {
        const orderingIssues = checkTickOrdering(systems);
        for (const issue of orderingIssues) {
          console.warn(`[CoreLoop][Check ${issue.check}] ${issue.code}: ${issue.message}`);
        }
      }

      const result = tickAdvanceWeek(game, rng, systems, {
        debug: import.meta.env.DEV,
      });

      if (import.meta.env.DEV) {
        const issues = [...validateGameState(result.nextState), ...validateTickDelta(game, result.nextState)];
        for (const issue of issues) {
          console.warn(`[CoreLoop][Check ${issue.check}] ${issue.code}: ${issue.message}`);
        }
      }

      const report: TickReport = createTickReport({
        prev: game,
        next: result.nextState,
        systems: result.systems,
        recap: result.recap,
        startedAtIso: result.startedAtIso,
        finishedAtIso: result.finishedAtIso,
        totalMs: result.totalMs,
      });

      set((s) => {
        const next = {
          ...(result.nextState as any),
          universeSeed: (s.game as any)?.universeSeed,
          rngState: rng.state,
          aiStudioProjects: (result.nextState as any).aiStudioProjects ?? (s.game as any)?.aiStudioProjects ?? [],
        };
        s.game = normalizeStudioGovernanceState(normalizePublicDomainState(normalizeFranchisesState(next) as any) as any);
        // Persist the PRNG state ("seed" here is treated as current RNG state).
        s.seed = rng.state;
        s.rng = createRng(rng.state);
        s.lastTickReport = report as any;
        s.tickHistory = [...s.tickHistory.slice(-(MAX_TICK_HISTORY - 1)), report] as any;
      });

      return report;
    },

    advanceWeekAsync: async (options) => {
      const { game, rng, registry } = get();
      if (!game || !rng) return null;

      // If we have registered systems, fall back to the synchronous pipeline
      // (systems are functions and cannot be transferred to a worker).
      const systems = registry.getOrdered();
      if (systems.length > 0) {
        return get().advanceWeek(options);
      }

      let workerResult: { result: TickResult; rngState: number };
      try {
        workerResult = await advanceWeekInWorker(game, rng.state, {
          debug: import.meta.env.DEV,
        });
      } catch (err) {
        console.warn('[Engine] Worker tick failed, falling back to main thread:', err);
        return get().advanceWeek(options);
      }

      const { result, rngState } = workerResult;

      const report: TickReport = createTickReport({
        prev: game,
        next: result.nextState,
        systems: result.systems,
        recap: result.recap,
        startedAtIso: result.startedAtIso,
        finishedAtIso: result.finishedAtIso,
        totalMs: result.totalMs,
      });

      set((s) => {
        const next = {
          ...(result.nextState as any),
          universeSeed: (s.game as any)?.universeSeed,
          rngState,
        };
        s.game = normalizeStudioGovernanceState(normalizePublicDomainState(normalizeFranchisesState(next) as any) as any);
        s.seed = rngState;
        s.rng = createRng(rngState);
        s.lastTickReport = report as any;
        s.tickHistory = [...s.tickHistory.slice(-(MAX_TICK_HISTORY - 1)), report] as any;
      });

      return report;
    },

    mergeGameState: (updates) => {
      set((s) => {
        if (!s.game) return;
        Object.assign(s.game as any, updates);
        if ('franchises' in updates || 'publicDomainIPs' in updates || 'governance' in updates) {
          s.game = normalizeStudioGovernanceState(normalizePublicDomainState(normalizeFranchisesState(s.game as any) as any) as any) as any;
        }
      });
    },

    updateStudio: (updates) => {
      set((s) => {
        if (!s.game) return;
        Object.assign(s.game.studio, updates);
      });
    },

    addStudioAwards: (awards) => {
      set((s) => {
        if (!s.game) return;
        const existing = s.game.studio.awards || [];
        s.game.studio.awards = [...existing, ...awards] as any;
      });
    },

    updateReputation: (delta) => {
      set((s) => {
        if (!s.game) return;
        const next = (s.game.studio.reputation ?? 0) + delta;
        s.game.studio.reputation = Math.max(0, Math.min(100, next));
      });
    },

    updateBudget: (delta) => {
      set((s) => {
        if (!s.game) return;
        s.game.studio.budget = (s.game.studio.budget ?? 0) + delta;
      });
    },

    spendStudioFunds: (amount) => {
      const { game } = get();
      if (!game) return { success: false };

      const currentDebt = game.studio.debt || 0;
      const maxLoanCapacity = Math.max(0, 50000000 - currentDebt);
      const availableFunds = (game.studio.budget ?? 0) + maxLoanCapacity;
      if (amount > availableFunds) return { success: false };

      const budgetAfter = (game.studio.budget ?? 0) - amount;
      const loanTaken = budgetAfter < 0 ? Math.min(-budgetAfter, maxLoanCapacity) : 0;

      set((s) => {
        if (!s.game) return;
        const prevDebt = s.game.studio.debt || 0;
        const prevMaxLoan = Math.max(0, 50000000 - prevDebt);
        const prevAvailable = (s.game.studio.budget ?? 0) + prevMaxLoan;
        if (amount > prevAvailable) return;

        let nextBudget = (s.game.studio.budget ?? 0) - amount;
        let nextDebt = prevDebt;
        if (nextBudget < 0) {
          nextDebt += -nextBudget;
          nextBudget = 0;
        }

        s.game.studio.budget = nextBudget;
        s.game.studio.debt = nextDebt;
      });

      return { success: true, loanTaken };
    },

    updateProject: (projectId, updates, marketingCost) => {
      set((s) => {
        if (!s.game) return;

        const updateList = (list: any[] | undefined) => {
          if (!Array.isArray(list)) return;
          const idx = list.findIndex((p) => p && (p as any).id === projectId);
          if (idx >= 0) {
            Object.assign(list[idx], updates);
          }
        };

        updateList(s.game.projects as any);
        updateList(s.game.aiStudioProjects as any);
        updateList(s.game.allReleases as any);

        if (marketingCost) {
          s.game.studio.budget -= marketingCost;
        }
      });
    },

    replaceProject: (project) => {
      set((s) => {
        if (!s.game) return;

        const replaceInList = (list: any[] | undefined) => {
          if (!Array.isArray(list)) return;
          const idx = list.findIndex((p) => p && (p as any).id === project.id);
          if (idx >= 0) {
            list[idx] = project as any;
          }
        };

        replaceInList(s.game.projects as any);
        replaceInList(s.game.aiStudioProjects as any);
        replaceInList(s.game.allReleases as any);
      });
    },

    addProject: (project) => {
      set((s) => {
        if (!s.game) return;
        const idx = s.game.projects.findIndex((p) => p.id === project.id);
        if (idx >= 0) {
          s.game.projects[idx] = project as any;
        } else {
          s.game.projects.push(project as any);
        }

        // Keep legacy arrays coherent if the project exists there too.
        const replaceIfPresent = (list: any[] | undefined) => {
          if (!Array.isArray(list)) return;
          const listIdx = list.findIndex((p) => p && (p as any).id === project.id);
          if (listIdx >= 0) {
            list[listIdx] = project as any;
          }
        };

        replaceIfPresent(s.game.aiStudioProjects as any);
        replaceIfPresent(s.game.allReleases as any);
      });
    },

    appendFranchiseEntry: (franchiseId, projectId) => {
      set((s) => {
        if (!s.game) return;
        const idx = s.game.franchises.findIndex((f) => f.id === franchiseId);
        if (idx < 0) return;
        const entries = s.game.franchises[idx].entries || [];
        if (entries.includes(projectId)) return;
        s.game.franchises[idx].entries = [...entries, projectId];
      });
    },

    updateTalent: (talentId, updates) => {
      set((s) => {
        if (!s.game) return;
        const idx = s.game.talent.findIndex((t) => t.id === talentId);
        if (idx >= 0) {
          Object.assign(s.game.talent[idx], updates);
        }
      });
    },

    bumpTalent: (talentId, delta) => {
      set((s) => {
        if (!s.game) return;
        const idx = s.game.talent.findIndex((t) => t.id === talentId);
        if (idx < 0) return;

        const t = s.game.talent[idx] as any;

        if (delta.reputation) {
          t.reputation = Math.max(0, Math.min(100, (t.reputation ?? 0) + delta.reputation));
        }

        if (delta.publicImage) {
          const base = t.publicImage ?? t.reputation ?? 0;
          t.publicImage = Math.max(0, Math.min(100, base + delta.publicImage));
        }
      });
    },

      /** Shortlist actions */
      addToShortlist: (talentId: string) => {
        set((s) => {
          if (!s.game || !s.game.talent.some(t => t.id === talentId)) return false;
          const ids = s.game.shortlistedTalentIds ?? [];
          if (ids.includes(talentId) || ids.length >= 12) return false;
          s.game.shortlistedTalentIds = [...ids, talentId];
        });
        return true;
      },

      removeFromShortlist: (talentId: string) => {
        set((s) => {
          if (!s.game) return false;
          const ids = s.game.shortlistedTalentIds ?? [];
          if (!ids.includes(talentId)) return false;
          s.game.shortlistedTalentIds = ids.filter(id => id !== talentId);
        });
        return true;
      },

      toggleShortlist: (talentId: string) => {
        const store = get();
        return store.shortlistedTalentIds.includes(talentId) 
          ? store.removeFromShortlist(talentId) 
          : store.addToShortlist(talentId);
      },

      clearShortlist: () => {
        set((s) => {
          if (!s.game) return;
          s.game.shortlistedTalentIds = [];
        });
      },

      upsertFranchise: (franchise: Franchise) => {
        set((s) => {
        if (!s.game) return;
        const idx = s.game.franchises.findIndex((f) => f.id === franchise.id);
        if (idx >= 0) {
          s.game.franchises[idx] = franchise as any;
        } else {
          s.game.franchises.push(franchise as any);
        }
        s.game = normalizeFranchisesState(s.game as any) as any;
      });
    },

    updateFranchise: (franchiseId, updates) => {
      set((s) => {
        if (!s.game) return;
        const idx = s.game.franchises.findIndex((f) => f.id === franchiseId);
        if (idx >= 0) {
          Object.assign(s.game.franchises[idx], updates);
        }
      });
    },

    upsertScript: (script) => {
      set((s) => {
        if (!s.game) return;
        const scripts = (s.game.scripts ?? []) as any;
        const idx = scripts.findIndex((sc: Script) => sc.id === script.id);
        if (idx >= 0) {
          scripts[idx] = script as any;
        } else {
          scripts.push(script as any);
        }
        s.game.scripts = scripts;
      });
    },

    setGameState: (updater) => {
      set((s) => {
        if (!s.game) return;
        const next = updater(s.game as GameState);
        s.game = normalizeStudioGovernanceState(normalizePublicDomainState(normalizeFranchisesState(next) as any) as any) as any;
      });
    },

    registerSystems: (systems) => {
      const { registry } = get();
      registry.registerAll(systems);
    },

    saveToSlot: (slotId, currentPhase, unlockedAchievementIds) => {
      const { game } = get();
      if (!game) return;
      saveGame(slotId, game, {
        currentPhase,
        unlockedAchievementIds,
      });
    },

    setMods: (mods) => {
      set((s) => {
        s.mods = mods as any;
      });
    },

    clearTickReport: () => {
      set((s) => {
        s.lastTickReport = null;
      });
    },

    resolveGameEvent: (eventId, choice) => {
      const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

      set((s) => {
        if (!s.game) return;

        // Keep media side-effects deterministic + persisted.
        MediaEngine.hydrate(s.game.mediaState);
        MediaResponseSystem.hydrate(s.game.mediaState);

        const idx = (s.game.eventQueue || []).findIndex((e) => e.id === eventId);
        if (idx < 0) return;

        const event = s.game.eventQueue[idx];

        const selectedChoice = typeof choice === 'number'
          ? event.choices?.[choice]
          : typeof choice === 'string'
            ? event.choices?.find((c) => c.id === choice)
            : event.choices?.[0];

        if (selectedChoice) {
          for (const consequence of selectedChoice.consequences || []) {
            if (consequence.type === 'budget') {
              const impact = Math.floor(consequence.impact ?? 0);

              if (impact >= 0) {
                const debt0 = s.game.studio.debt || 0;
                const paydown = debt0 > 0 ? Math.min(debt0, impact) : 0;
                if (paydown > 0) {
                  s.game.studio.debt = debt0 - paydown;
                }
                s.game.studio.budget = (s.game.studio.budget ?? 0) + (impact - paydown);
              } else {
                let nextBudget = (s.game.studio.budget ?? 0) + impact;
                if (nextBudget < 0) {
                  const debt0 = s.game.studio.debt || 0;
                  s.game.studio.debt = debt0 + -nextBudget;
                  nextBudget = 0;
                }
                s.game.studio.budget = nextBudget;
              }

              continue;
            }

            if (consequence.type === 'reputation') {
              s.game.studio.reputation = clamp((s.game.studio.reputation ?? 0) + consequence.impact, 0, 100);
              continue;
            }

            if (consequence.type === 'talent-relationship') {
              const targetTalentId = consequence.target?.talentId;
              if (!targetTalentId) continue;

              const t = s.game.talent.find((x) => x.id === targetTalentId);
              if (!t) continue;

              const relationship = consequence.relationship ?? 'loyalty';

              if (relationship === 'loyalty') {
                const studioId = consequence.target?.studioId ?? s.game.studio.id;
                const current = t.studioLoyalty?.[studioId] ?? 50;
                if (!t.studioLoyalty) t.studioLoyalty = {};
                t.studioLoyalty[studioId] = clamp(current + consequence.impact, 0, 100);
                continue;
              }

              if (relationship === 'chemistry') {
                const otherId = consequence.target?.otherTalentId;
                if (!otherId) continue;

                const other = s.game.talent.find((x) => x.id === otherId);
                if (!other) continue;

                if (!t.chemistry) t.chemistry = {};
                if (!other.chemistry) other.chemistry = {};

                const baseAB = t.chemistry[otherId] ?? 0;
                const baseBA = other.chemistry[targetTalentId] ?? 0;

                t.chemistry[otherId] = clamp(baseAB + consequence.impact, -100, 100);
                other.chemistry[targetTalentId] = clamp(baseBA + consequence.impact, -100, 100);
                continue;
              }
            }
          }

          // Event-specific effects that are awkward to model as generic consequences.
          const kind = (event as any)?.data?.kind;

          if (kind === 'circle:poach' && selectedChoice.id === 'let-walk') {
            const talentId = (event as any)?.data?.talentId as string | undefined;
            const t = talentId ? s.game.talent.find((x) => x.id === talentId) : undefined;
            if (t) {
              const studioId = s.game.studio.id;
              const loyalty = clamp(t.studioLoyalty?.[studioId] ?? 50, 0, 100);
              if (loyalty <= 20) {
                // They walk: remove them from any active projects + contracts.
                for (const project of s.game.projects || []) {
                  if (!project) continue;
                  project.cast = (project.cast || []).filter((r) => r.talentId !== talentId);
                  project.crew = (project.crew || []).filter((r) => r.talentId !== talentId);
                  project.contractedTalent = (project.contractedTalent || []).filter((r) => r.talentId !== talentId);
                  if (project.script?.characters) {
                    project.script.characters = project.script.characters.map((c) =>
                      c.assignedTalentId === talentId ? { ...c, assignedTalentId: undefined } : c
                    );
                  }
                }

                t.contractStatus = 'available';
                t.currentContractWeeks = 0;
                if (t.contractStatusBase === 'contracted') t.contractStatusBase = 'available';
                if (t.studioLoyalty) delete t.studioLoyalty[studioId];
              }
            }
          }

          if (kind === 'circle:feud' && selectedChoice.id === 'replace-b') {
            const projectId = (event as any)?.data?.projectId as string | undefined;
            const talentId = (event as any)?.data?.talentBId as string | undefined;
            const project = projectId ? s.game.projects.find((p) => p.id === projectId) : undefined;
            const t = talentId ? s.game.talent.find((x) => x.id === talentId) : undefined;

            if (project && t) {
              project.cast = (project.cast || []).filter((r) => r.talentId !== talentId);
              project.crew = (project.crew || []).filter((r) => r.talentId !== talentId);
              project.contractedTalent = (project.contractedTalent || []).filter((r) => r.talentId !== talentId);
              if (project.script?.characters) {
                project.script.characters = project.script.characters.map((c) =>
                  c.assignedTalentId === talentId ? { ...c, assignedTalentId: undefined } : c
                );
              }
              t.contractStatus = 'available';
            }
          }

          if (kind === 'gossip:scandal') {
            const talentId = (event as any)?.data?.talentId as string | undefined;
            const scandalId = (event as any)?.data?.scandalId as string | undefined;

            const t = talentId ? s.game.talent.find((x) => x.id === talentId) : undefined;
            if (t) {
              const rep = clamp(t.reputation ?? 50, 0, 100);
              const pi = clamp(t.publicImage ?? rep, 0, 100);

              if (scandalId && t.scandals) {
                t.scandals = t.scandals.map((s) => (s.id === scandalId ? { ...s, resolved: true } : s));
              }

              if (selectedChoice.id === 'deny') {
                t.publicImage = clamp(pi - 2, 0, 100);
                t.reputation = clamp(rep - 1, 0, 100);
              } else if (selectedChoice.id === 'apology') {
                t.publicImage = clamp(pi + 2, 0, 100);
              } else if (selectedChoice.id === 'pr') {
                t.publicImage = clamp(pi + 5, 0, 100);
              } else if (selectedChoice.id === 'cut') {
                t.publicImage = clamp(pi - 1, 0, 100);
                // If they were signed to you, sever the relationship.
                if (t.contractStatus === 'contracted' || t.contractStatus === 'exclusive') {
                  t.contractStatus = 'available';
                  if (t.studioLoyalty) delete t.studioLoyalty[s.game.studio.id];
                }
              }

              const mediaId = `media:${event.id}:${selectedChoice.id}`;
              const headline =
                selectedChoice.id === 'pr'
                  ? `${s.game.studio.name} launches a PR blitz amid ${t.name} scandal`
                  : selectedChoice.id === 'apology'
                    ? `${t.name} issues an apology as the scandal cycle cools`
                    : selectedChoice.id === 'cut'
                      ? `${s.game.studio.name} cuts ties with ${t.name} after controversy`
                      : `${t.name} denies wrongdoing as reporters press for answers`;

              MediaEngine.injectDeterministicMediaItem({
                id: mediaId,
                type: 'news',
                headline,
                content: headline,
                week: s.game.currentWeek,
                year: s.game.currentYear,
                sentiment: selectedChoice.id === 'pr' || selectedChoice.id === 'apology' ? 'neutral' : 'negative',
                targets: { studios: [s.game.studio.id], talent: [t.id] },
                tags: ['scandal', 'response'],
                relatedEvents: [event.id],
                sourceType: 'trade_publication',
              });
            }
          }

          if (kind === 'platform:churn-spike') {
            const playerPlatformId = (event as any)?.data?.playerPlatformId as string | undefined;
            const suggestedLoss = Math.max(0, Math.floor((event as any)?.data?.suggestedLoss ?? 0));

            const player = s.game.platformMarket?.player;
            if (player && player.status === 'active' && player.id === playerPlatformId) {
              if (selectedChoice.id === 'retention-campaign') {
                player.promotionBudgetPerWeek = (player.promotionBudgetPerWeek ?? 0) + 5_000_000;
                player.freshness = clamp((player.freshness ?? 50) + 4, 0, 100);
                player.subscribers = Math.max(0, (player.subscribers ?? 0) - Math.floor(suggestedLoss * 0.35));

                const headline = `${player.name} launches an emergency retention campaign amid churn spike`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'crisis'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else if (selectedChoice.id === 'cut-price') {
                player.priceIndex = clamp((player.priceIndex ?? 1) - 0.1, 0.7, 1.5);
                player.subscribers = Math.max(0, (player.subscribers ?? 0) - Math.floor(suggestedLoss * 0.6));

                const headline = `${player.name} cuts price to stem subscriber losses during churn spike`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'strategy'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                player.subscribers = Math.max(0, (player.subscribers ?? 0) - suggestedLoss);

                const headline = `${player.name} faces backlash as churn spikes and leadership holds course`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'negative',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'crisis'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:rival-collapse') {
            const collapsedId = (event as any)?.data?.collapsedId as string | undefined;
            const collapsedName = (event as any)?.data?.collapsedName as string | undefined;
            const rivalBuyerId = (event as any)?.data?.rivalBuyerId as string | undefined;
            const rivalBuyerName = (event as any)?.data?.rivalBuyerName as string | undefined;

            const transferredSubs = Math.max(0, Math.floor((event as any)?.data?.transferredSubs ?? 0));
            const transferredCatalogRaw = (event as any)?.data?.transferredCatalog;
            const transferredCatalog = typeof transferredCatalogRaw === 'number' ? transferredCatalogRaw : 0;

            const market = s.game.platformMarket;
            if (market) {
              if (selectedChoice.id === 'buy') {
                const player = market.player;
                if (player && player.status === 'active') {
                  player.subscribers = Math.max(0, (player.subscribers ?? 0) + transferredSubs);
                  player.catalogValue = clamp((player.catalogValue ?? 40) + transferredCatalog * 0.15, 0, 100);
                  player.freshness = clamp((player.freshness ?? 50) + 2, 0, 100);

                  const headline = `${player.name} snaps up distressed assets from ${collapsedName ?? 'a collapsed rival'}`;
                  MediaEngine.injectDeterministicMediaItem({
                    id: `media:${event.id}:${selectedChoice.id}`,
                    type: 'news',
                    headline,
                    content: headline,
                    week: s.game.currentWeek,
                    year: s.game.currentYear,
                    sentiment: 'neutral',
                    targets: { studios: [s.game.studio.id] },
                    tags: ['streaming', 'acquisition'],
                    relatedEvents: [event.id],
                    sourceType: 'trade_publication',
                  });
                }
              } else {
                const buyer = rivalBuyerId ? (market.rivals || []).find((r) => r.id === rivalBuyerId) : undefined;
                if (buyer && buyer.status !== 'collapsed') {
                  buyer.subscribers = Math.max(0, (buyer.subscribers ?? 0) + transferredSubs);
                  buyer.catalogValue = clamp((buyer.catalogValue ?? 50) + transferredCatalog * 0.15, 0, 100);

                  const headline = `${rivalBuyerName ?? buyer.name} absorbs subscribers after ${collapsedName ?? collapsedId ?? 'a rival'} collapse`;
                  MediaEngine.injectDeterministicMediaItem({
                    id: `media:${event.id}:${selectedChoice.id}`,
                    type: 'news',
                    headline,
                    content: headline,
                    week: s.game.currentWeek,
                    year: s.game.currentYear,
                    sentiment: 'neutral',
                    targets: { studios: [s.game.studio.id] },
                    tags: ['streaming', 'consolidation'],
                    relatedEvents: [event.id],
                    sourceType: 'trade_publication',
                  });
                }
              }

              const newOwnerId =
                selectedChoice.id === 'buy'
                  ? market.player && market.player.status === 'active'
                    ? market.player.id
                    : undefined
                  : rivalBuyerId;

              const newOwnerName =
                selectedChoice.id === 'buy'
                  ? market.player && market.player.status === 'active'
                    ? market.player.name
                    : undefined
                  : rivalBuyerName || (market.rivals || []).find((r) => r.id === rivalBuyerId)?.name;

              if (collapsedId && newOwnerId) {
                const isPlayerDestination = newOwnerId.startsWith('player-platform:');

                const processed = new Set<string>();

                const migrateProject = (project: any) => {
                  if (!project || typeof project !== 'object') return;
                  if (typeof project.id !== 'string') return;
                  if (processed.has(project.id)) return;
                  processed.add(project.id);

                  const deal = project.streamingPremiereDeal;
                  if (deal && deal.providerId === collapsedId) {
                    deal.providerId = newOwnerId;
                  }

                  const rs = project.releaseStrategy;
                  if (rs) {
                    if (rs.streamingPlatformId === collapsedId) rs.streamingPlatformId = newOwnerId;
                    if (rs.streamingProviderId === collapsedId) rs.streamingProviderId = newOwnerId;
                  }

                  const contract = project.streamingContract;
                  if (contract) {
                    if (contract.platformId === collapsedId) contract.platformId = newOwnerId;
                    if ((contract as any).platform === collapsedId) (contract as any).platform = newOwnerId;
                  }

                  const dist = project.distributionStrategy;
                  if (dist?.primary && (dist.primary as any).platformId === collapsedId) {
                    (dist.primary as any).platformId = newOwnerId;
                    if (newOwnerName && typeof (dist.primary as any).platform === 'string') {
                      (dist.primary as any).platform = newOwnerName;
                    }
                  }

                  if (Array.isArray(dist?.windows)) {
                    for (const w of dist.windows) {
                      if (w && (w as any).platformId === collapsedId) {
                        (w as any).platformId = newOwnerId;
                      }
                    }
                  }

                  const releases = Array.isArray(project.postTheatricalReleases) ? project.postTheatricalReleases : [];

                  for (const r of releases) {
                    if (!r || r.platform !== 'streaming') continue;

                    const pid = (r as any).platformId || (r as any).providerId;
                    if (pid !== collapsedId) continue;

                    if (isPlayerDestination) {
                      (r as any).platformId = newOwnerId;
                      (r as any).providerId = undefined;
                    } else {
                      (r as any).providerId = newOwnerId;
                      (r as any).platformId = undefined;
                    }

                    const week = typeof (r as any).releaseWeek === 'number' ? (r as any).releaseWeek : s.game.currentWeek;
                    const year = typeof (r as any).releaseYear === 'number' ? (r as any).releaseYear : s.game.currentYear;
                    const desiredId = `release:${project.id}:${newOwnerId}:${year}:W${week}`;
                    const collision = releases.some((x: any) => x && x !== r && x.id === desiredId);
                    if (!collision) {
                      (r as any).id = desiredId;
                    }
                  }
                };

                for (const p of s.game.projects || []) migrateProject(p as any);
                for (const p of (s.game.aiStudioProjects as any) || []) migrateProject(p as any);
                for (const p of s.game.allReleases || []) migrateProject(p as any);
              }

              // Make sure the collapsed rival stays collapsed.
              if (collapsedId) {
                const c = (market.rivals || []).find((r) => r.id === collapsedId);
                if (c) {
                  c.status = 'collapsed';
                  c.subscribers = 0;
                  c.distressWeeks = 0;
                }
              }
            }
          }

          if (kind === 'platform:license-offer') {
            const market = s.game.platformMarket;
            const offer = Math.max(0, Math.floor((event as any)?.data?.offer ?? 0));
            const titleProjectId = (event as any)?.data?.titleProjectId as string | undefined;
            const titleName = (event as any)?.data?.titleName as string | undefined;
            const rivalName = (event as any)?.data?.rivalName as string | undefined;

            const player = market?.player;
            if (market && player && player.status === 'active') {
              if (selectedChoice.id === 'accept') {
                const rivalId = (event as any)?.data?.rivalId as string | undefined;

                // Moat erosion: cash now, slightly weaker retention/differentiation.
                player.freshness = clamp((player.freshness ?? 50) - 3, 0, 100);
                player.catalogValue = clamp((player.catalogValue ?? 45) - 1, 0, 100);
                player.cash = (player.cash ?? 0) + offer;

                const mutateProjectById = (projectId: string, fn: (project: any) => void) => {
                  const lists = [
                    s.game.projects as any,
                    ((s.game.aiStudioProjects as any) || []) as any,
                    (s.game.allReleases || []) as any,
                  ];

                  for (const list of lists) {
                    for (const p of list || []) {
                      if (!p || typeof p !== 'object') continue;
                      if (typeof (p as any).id !== 'string') continue;
                      if ((p as any).id !== projectId) continue;
                      if (!(p as any).script) continue;
                      fn(p);
                    }
                  }
                };

                // Make the title non-exclusive and actually place it on the rival platform for a time-limited window.
                if (titleProjectId && rivalId) {
                  mutateProjectById(titleProjectId, (project) => {
                    if (project.releaseStrategy) {
                      project.releaseStrategy.streamingExclusive = false;
                    }

                    if (getContractPlatformId((project as any)?.streamingContract) === player.id) {
                      (project as any).streamingContract.exclusivityClause = false;
                    }

                    const releaseId = `release:${project.id}:${rivalId}:${s.game.currentYear}:W${s.game.currentWeek}`;
                    const already = (project.postTheatricalReleases ?? []).some((r: any) => r && r.id === releaseId);

                    if (!already) {
                      const releaseDate = new Date(
                        Date.UTC(s.game.currentYear, 0, 1 + Math.max(0, s.game.currentWeek - 1) * 7)
                      );

                      const windowWeeks = 26;

                      project.postTheatricalReleases = [
                        ...(project.postTheatricalReleases ?? []),
                        {
                          id: releaseId,
                          projectId: project.id,
                          platform: 'streaming',
                          providerId: rivalId,
                          releaseDate,
                          releaseWeek: s.game.currentWeek,
                          releaseYear: s.game.currentYear,
                          delayWeeks: 0,
                          revenue: offer,
                          weeklyRevenue: 0,
                          weeksActive: 0,
                          status: 'planned',
                          cost: 0,
                          durationWeeks: windowWeeks,
                        },
                      ];
                    }
                  });
                }

                const headline = `${player.name} licenses ${titleName ?? 'a breakout title'} to ${rivalName ?? 'a rival'} for ${Math.round(
                  offer / 1_000_000
                )}M`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'licensing'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                const headline = `${player.name} rejects a ${Math.round(offer / 1_000_000)}M offer for ${titleName ?? 'a hit title'} to keep it exclusive`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'positive',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'exclusivity'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:overall-deal') {
            const market = s.game.platformMarket;

            const playerPlatformId = (event as any)?.data?.playerPlatformId as string | undefined;
            const rivalId = (event as any)?.data?.rivalId as string | undefined;
            const rivalName = (event as any)?.data?.rivalName as string | undefined;
            const showrunner = (event as any)?.data?.showrunner as string | undefined;
            const qualityBonus = Math.max(0, Math.floor((event as any)?.data?.qualityBonus ?? 0));

            const player = market?.player;
            const rival = rivalId ? (market?.rivals || []).find((r) => r.id === rivalId) : undefined;

            if (market && player && player.status === 'active' && player.id === playerPlatformId) {
              if (selectedChoice.id === 'match') {
                player.originalsQualityBonus = clamp((player.originalsQualityBonus ?? 0) + qualityBonus, 0, 20);

                const headline = `${player.name} wins an overall deal with ${showrunner ?? 'a top showrunner'}`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'positive',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'talent', 'originals'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                // Rival gains momentum.
                if (rival && rival.status !== 'collapsed') {
                  rival.freshness = clamp((rival.freshness ?? 55) + 3, 0, 100);
                  rival.catalogValue = clamp((rival.catalogValue ?? 50) + 1, 0, 100);
                }

                const headline = `${rivalName ?? rival?.name ?? 'A rival'} lands ${showrunner ?? 'a top showrunner'} as ${player.name} watches`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'negative',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'talent', 'rivalry'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:bidding-war') {
            const market = s.game.platformMarket;

            const playerPlatformId = (event as any)?.data?.playerPlatformId as string | undefined;
            const rivalId = (event as any)?.data?.rivalId as string | undefined;
            const rivalName = (event as any)?.data?.rivalName as string | undefined;
            const titleProjectId = (event as any)?.data?.titleProjectId as string | undefined;
            const titleName = (event as any)?.data?.titleName as string | undefined;
            const offer = Math.max(0, Math.floor((event as any)?.data?.offer ?? 0));
            const keepCost = Math.max(0, Math.floor((event as any)?.data?.keepCost ?? 0));
            const windowWeeks = Math.max(8, Math.floor((event as any)?.data?.windowWeeks ?? 52));

            const player = market?.player;

            if (market && player && player.status === 'active' && player.id === playerPlatformId) {
              const rival = rivalId ? (market.rivals || []).find((r) => r.id === rivalId) : undefined;

              if (selectedChoice.id === 'sell') {
                // Moat erosion: you're giving up exclusivity on one of your anchors.
                player.freshness = clamp((player.freshness ?? 50) - 6, 0, 100);
                player.catalogValue = clamp((player.catalogValue ?? 45) - 2, 0, 100);
                player.cash = (player.cash ?? 0) + offer;

                const mutateProjectById = (projectId: string, fn: (project: any) => void) => {
                  const lists = [
                    s.game.projects as any,
                    ((s.game.aiStudioProjects as any) || []) as any,
                    (s.game.allReleases || []) as any,
                  ];

                  for (const list of lists) {
                    for (const p of list || []) {
                      if (!p || typeof p !== 'object') continue;
                      if (typeof (p as any).id !== 'string') continue;
                      if ((p as any).id !== projectId) continue;
                      if (!(p as any).script) continue;
                      fn(p);
                    }
                  }
                };

                if (titleProjectId && rivalId) {
                  mutateProjectById(titleProjectId, (project) => {
                    if (project.releaseStrategy) {
                      project.releaseStrategy.streamingExclusive = false;
                    }

                    if (getContractPlatformId((project as any)?.streamingContract) === player.id) {
                      (project as any).streamingContract.exclusivityClause = false;
                    }

                    const releaseId = `release:${project.id}:${rivalId}:${s.game.currentYear}:W${s.game.currentWeek}`;
                    const already = (project.postTheatricalReleases ?? []).some((r: any) => r && r.id === releaseId);

                    if (!already) {
                      const releaseDate = new Date(
                        Date.UTC(s.game.currentYear, 0, 1 + Math.max(0, s.game.currentWeek - 1) * 7)
                      );

                      project.postTheatricalReleases = [
                        ...(project.postTheatricalReleases ?? []),
                        {
                          id: releaseId,
                          projectId: project.id,
                          platform: 'streaming',
                          providerId: rivalId,
                          releaseDate,
                          releaseWeek: s.game.currentWeek,
                          releaseYear: s.game.currentYear,
                          delayWeeks: 0,
                          revenue: offer,
                          weeklyRevenue: 0,
                          weeksActive: 0,
                          status: 'planned',
                          cost: 0,
                          durationWeeks: windowWeeks,
                        },
                      ];
                    }
                  });
                }

                const headline = `${player.name} sells an exclusive window for ${titleName ?? 'a hit title'} to ${rivalName ?? rival?.name ?? 'a rival'} (${Math.round(
                  offer / 1_000_000
                )}M)`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'bidding-war'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else if (selectedChoice.id === 'match') {
                player.freshness = clamp((player.freshness ?? 50) + 2, 0, 100);
                player.promotionBudgetPerWeek = (player.promotionBudgetPerWeek ?? 0) + 5_000_000;
                player.cash = (player.cash ?? 0) - keepCost;

                const headline = `${player.name} holds the line and keeps ${titleName ?? 'a hit title'} exclusive`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'positive',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'exclusivity'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                // Decline: short-term stance benefit, but the war continues.
                const headline = `${player.name} refuses to sell exclusives as ${rivalName ?? rival?.name ?? 'rivals'} escalate bidding`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'strategy'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:mna-offer') {
            const market = s.game.platformMarket;
            const player = market?.player;

            const targetId = (event as any)?.data?.targetId as string | undefined;
            const targetName = (event as any)?.data?.targetName as string | undefined;
            const salePrice = Math.max(0, Math.floor((event as any)?.data?.salePrice ?? 0));
            const transferredSubs = Math.max(0, Math.floor((event as any)?.data?.transferredSubs ?? 0));
            const transferredCatalogRaw = (event as any)?.data?.transferredCatalog;
            const transferredCatalog = typeof transferredCatalogRaw === 'number' ? transferredCatalogRaw : 0;

            if (market && player && player.status === 'active' && targetId) {
              if (selectedChoice.id === 'buy') {
                player.subscribers = Math.max(0, (player.subscribers ?? 0) + transferredSubs);
                player.catalogValue = clamp((player.catalogValue ?? 40) + transferredCatalog * 0.15, 0, 100);
                player.freshness = clamp((player.freshness ?? 50) + 1, 0, 100);

                const target = (market.rivals || []).find((r) => r.id === targetId);
                if (target) {
                  target.status = 'collapsed';
                  target.subscribers = 0;
                  target.distressWeeks = 0;
                }

                // Asset transfer: move the acquired platform's catalog windows onto the player platform.
                const newOwnerId = player.id;
                const newOwnerName = player.name;

                const isPlayerDestination = newOwnerId.startsWith('player-platform:');
                const processed = new Set<string>();

                const migrateProject = (project: any) => {
                  if (!project || typeof project !== 'object') return;
                  if (typeof project.id !== 'string') return;
                  if (processed.has(project.id)) return;
                  processed.add(project.id);

                  const deal = project.streamingPremiereDeal;
                  if (deal && deal.providerId === targetId) {
                    deal.providerId = newOwnerId;
                  }

                  const rs = project.releaseStrategy;
                  if (rs) {
                    if (rs.streamingPlatformId === targetId) rs.streamingPlatformId = newOwnerId;
                    if (rs.streamingProviderId === targetId) rs.streamingProviderId = newOwnerId;
                  }

                  const contract = project.streamingContract;
                  if (contract) {
                    if (contract.platformId === targetId) contract.platformId = newOwnerId;
                    if ((contract as any).platform === targetId) (contract as any).platform = newOwnerId;
                  }

                  const dist = project.distributionStrategy;
                  if (dist?.primary && (dist.primary as any).platformId === targetId) {
                    (dist.primary as any).platformId = newOwnerId;
                    if (newOwnerName && typeof (dist.primary as any).platform === 'string') {
                      (dist.primary as any).platform = newOwnerName;
                    }
                  }

                  if (Array.isArray(dist?.windows)) {
                    for (const w of dist.windows) {
                      if (w && (w as any).platformId === targetId) {
                        (w as any).platformId = newOwnerId;
                      }
                    }
                  }

                  const releases = Array.isArray(project.postTheatricalReleases) ? project.postTheatricalReleases : [];

                  for (const r of releases) {
                    if (!r || r.platform !== 'streaming') continue;

                    const pid = (r as any).platformId || (r as any).providerId;
                    if (pid !== targetId) continue;

                    if (isPlayerDestination) {
                      (r as any).platformId = newOwnerId;
                      (r as any).providerId = undefined;
                    } else {
                      (r as any).providerId = newOwnerId;
                      (r as any).platformId = undefined;
                    }

                    const week = typeof (r as any).releaseWeek === 'number' ? (r as any).releaseWeek : s.game.currentWeek;
                    const year = typeof (r as any).releaseYear === 'number' ? (r as any).releaseYear : s.game.currentYear;
                    const desiredId = `release:${project.id}:${newOwnerId}:${year}:W${week}`;
                    const collision = releases.some((x: any) => x && x !== r && x.id === desiredId);
                    if (!collision) {
                      (r as any).id = desiredId;
                    }
                  }
                };

                for (const p of s.game.projects || []) migrateProject(p as any);
                for (const p of (s.game.aiStudioProjects as any) || []) migrateProject(p as any);
                for (const p of s.game.allReleases || []) migrateProject(p as any);

                const headline = `${player.name} acquires ${targetName ?? targetId} in a distressed buyout (${Math.round(
                  salePrice / 1_000_000
                )}M)`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'acquisition'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                const headline = `${player.name} passes on a distressed buyout of ${targetName ?? targetId}`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'strategy'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:outage') {
            const market = s.game.platformMarket;
            const playerPlatformId = (event as any)?.data?.playerPlatformId as string | undefined;
            const suggestedLoss = Math.max(0, Math.floor((event as any)?.data?.suggestedLoss ?? 0));

            const player = market?.player;
            if (market && player && player.status === 'active' && player.id === playerPlatformId) {
              if (selectedChoice.id === 'refunds') {
                player.subscribers = Math.max(0, (player.subscribers ?? 0) - Math.floor(suggestedLoss * 0.25));
                player.freshness = clamp((player.freshness ?? 50) - 1, 0, 100);
                player.serviceQuality = clamp((player.serviceQuality ?? 55) + 3, 0, 100);
              } else if (selectedChoice.id === 'apology') {
                player.subscribers = Math.max(0, (player.subscribers ?? 0) - Math.floor(suggestedLoss * 0.55));
                player.freshness = clamp((player.freshness ?? 50) - 2, 0, 100);
                player.serviceQuality = clamp((player.serviceQuality ?? 55) + 2, 0, 100);
              } else {
                player.subscribers = Math.max(0, (player.subscribers ?? 0) - suggestedLoss);
                player.freshness = clamp((player.freshness ?? 50) - 3, 0, 100);
                player.serviceQuality = clamp((player.serviceQuality ?? 55) + 1, 0, 100);
              }

              const headline = `${player.name} outage triggers churn as customers demand compensation`;

              MediaEngine.injectDeterministicMediaItem({
                id: `media:${event.id}:${selectedChoice.id}`,
                type: 'news',
                headline,
                content: headline,
                week: s.game.currentWeek,
                year: s.game.currentYear,
                sentiment: 'negative',
                targets: { studios: [s.game.studio.id] },
                tags: ['streaming', 'outage'],
                relatedEvents: [event.id],
                sourceType: 'trade_publication',
              });
            }
          }

          if (kind === 'platform:strategic-sale') {
            const market = s.game.platformMarket;
            const player = market?.player;

            const offers = Array.isArray((event as any)?.data?.offers) ? ((event as any).data.offers as any[]) : [];

            const buyerId = selectedChoice.id.startsWith('sell:') ? selectedChoice.id.slice('sell:'.length) : undefined;
            const offer = buyerId ? offers.find((o) => o && o.buyerId === buyerId) : undefined;

            const salePrice = Math.max(0, Math.floor(offer?.salePrice ?? 0));
            const transferredSubs = Math.max(0, Math.floor(offer?.transferredSubs ?? 0));
            const transferredCatalogRaw = offer?.transferredCatalog;
            const transferredCatalog = typeof transferredCatalogRaw === 'number' ? transferredCatalogRaw : 0;

            if (market && player && player.status === 'active') {
              if (buyerId && offer) {
                const soldName = player.name;

                player.status = 'sold';
                player.subscribers = 0;
                player.cash = 0;
                player.closedWeek = s.game.currentWeek;
                player.closedYear = s.game.currentYear;

                const buyer = (market.rivals || []).find((r) => r.id === buyerId);
                if (buyer && buyer.status !== 'collapsed') {
                  buyer.subscribers = Math.max(0, (buyer.subscribers ?? 0) + transferredSubs);
                  buyer.catalogValue = clamp((buyer.catalogValue ?? 50) + transferredCatalog * 0.15, 0, 100);
                }

                // Move the sold platform's catalog windows onto the buyer platform so catalog simulations stay consistent.
                if (buyerId) {
                  const oldOwnerId = player.id;
                  const newOwnerId = buyerId;
                  const newOwnerName = offer?.buyerName ?? buyer?.name;

                  const isPlayerDestination = newOwnerId.startsWith('player-platform:');
                  const processed = new Set<string>();

                  const migrateProject = (project: any) => {
                    if (!project || typeof project !== 'object') return;
                    if (typeof project.id !== 'string') return;
                    if (processed.has(project.id)) return;
                    processed.add(project.id);

                    const deal = project.streamingPremiereDeal;
                    if (deal && deal.providerId === oldOwnerId) {
                      deal.providerId = newOwnerId;
                    }

                    const rs = project.releaseStrategy;
                    if (rs) {
                      if (rs.streamingPlatformId === oldOwnerId) rs.streamingPlatformId = newOwnerId;
                      if (rs.streamingProviderId === oldOwnerId) rs.streamingProviderId = newOwnerId;
                    }

                    const contract = project.streamingContract;
                    if (contract) {
                      if (contract.platformId === oldOwnerId) contract.platformId = newOwnerId;
                      if ((contract as any).platform === oldOwnerId) (contract as any).platform = newOwnerId;
                    }

                    const dist = project.distributionStrategy;
                    if (dist?.primary && (dist.primary as any).platformId === oldOwnerId) {
                      (dist.primary as any).platformId = newOwnerId;
                      if (newOwnerName && typeof (dist.primary as any).platform === 'string') {
                        (dist.primary as any).platform = newOwnerName;
                      }
                    }

                    if (Array.isArray(dist?.windows)) {
                      for (const w of dist.windows) {
                        if (w && (w as any).platformId === oldOwnerId) {
                          (w as any).platformId = newOwnerId;
                        }
                      }
                    }

                    const releases = Array.isArray(project.postTheatricalReleases) ? project.postTheatricalReleases : [];

                    for (const r of releases) {
                      if (!r || r.platform !== 'streaming') continue;

                      const pid = (r as any).platformId || (r as any).providerId;
                      if (pid !== oldOwnerId) continue;

                      if (isPlayerDestination) {
                        (r as any).platformId = newOwnerId;
                        (r as any).providerId = undefined;
                      } else {
                        (r as any).providerId = newOwnerId;
                        (r as any).platformId = undefined;
                      }

                      const week = typeof (r as any).releaseWeek === 'number' ? (r as any).releaseWeek : s.game.currentWeek;
                      const year = typeof (r as any).releaseYear === 'number' ? (r as any).releaseYear : s.game.currentYear;
                      const desiredId = `release:${project.id}:${newOwnerId}:${year}:W${week}`;
                      const collision = releases.some((x: any) => x && x !== r && x.id === desiredId);
                      if (!collision) {
                        (r as any).id = desiredId;
                      }
                    }
                  };

                  for (const p of s.game.projects || []) migrateProject(p as any);
                  for (const p of (s.game.aiStudioProjects as any) || []) migrateProject(p as any);
                  for (const p of s.game.allReleases || []) migrateProject(p as any);
                }

                const registry = Array.isArray((market as any).brandRegistry) ? ((market as any).brandRegistry as any[]) : [];
                const brandKey = soldName.trim().toLowerCase();
                if (brandKey && !registry.some((e) => typeof e?.name === 'string' && e.name.trim().toLowerCase() === brandKey)) {
                  registry.push({
                    name: soldName.trim(),
                    ownerId: buyerId,
                    ownerName: offer?.buyerName ?? buyer?.name,
                    acquiredWeek: s.game.currentWeek,
                    acquiredYear: s.game.currentYear,
                  });
                  (market as any).brandRegistry = registry;
                }

                const headline = `${soldName} sold to ${offer?.buyerName ?? buyer?.name ?? 'a rival'} for ${Math.round(salePrice / 1_000_000)}M`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'consolidation', 'sale'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                const headline = `${player.name} remains independent as the studio shelves strategic sale talks`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'strategy'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:output-deal') {
            const market = s.game.platformMarket;
            const player = market?.player;

            const offers = Array.isArray((event as any)?.data?.offers) ? ((event as any).data.offers as any[]) : [];

            const buyerId = selectedChoice.id.startsWith('output:') ? selectedChoice.id.slice('output:'.length) : undefined;
            const offer = buyerId ? offers.find((o) => o && o.buyerId === buyerId) : undefined;

            const upfrontPayment = Math.max(0, Math.floor(offer?.upfrontPayment ?? 0));
            const termWeeks = Math.max(26, Math.floor(offer?.termWeeks ?? 52));
            const windowDelayWeeks = Math.max(0, Math.floor(offer?.windowDelayWeeks ?? 14));
            const windowDurationWeeks = Math.max(8, Math.floor(offer?.windowDurationWeeks ?? 26));

            if (market && player && player.status === 'active') {
              if (buyerId && offer) {
                const startAbs = s.game.currentYear * 52 + s.game.currentWeek;
                const endAbs = startAbs + termWeeks;

                let endYear = Math.floor(endAbs / 52);
                let endWeek = endAbs % 52;

                if (endWeek === 0) {
                  endWeek = 52;
                  endYear -= 1;
                }

                (player as any).outputDeal = {
                  partnerId: buyerId,
                  partnerName: offer?.buyerName ?? offer?.buyer ?? 'Rival',
                  startWeek: s.game.currentWeek,
                  startYear: s.game.currentYear,
                  endWeek,
                  endYear,
                  upfrontPayment,
                  windowDelayWeeks,
                  windowDurationWeeks,
                };

                player.cash = (player.cash ?? 0) + upfrontPayment;
                player.freshness = clamp((player.freshness ?? 50) - 4, 0, 100);
                player.catalogValue = clamp((player.catalogValue ?? 45) - 2, 0, 100);

                const buyer = (market.rivals || []).find((r) => r.id === buyerId);

                const headline = `${player.name} signs an output deal with ${offer?.buyerName ?? buyer?.name ?? 'a rival'} for ${Math.round(
                  upfrontPayment / 1_000_000
                )}M`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'licensing', 'output-deal'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                const headline = `${player.name} declines output deal talks and keeps future releases exclusive`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'positive',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'exclusivity'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:output-deal-buyout') {
            const market = s.game.platformMarket;
            const player = market?.player;

            const buyoutCost = Math.max(0, Math.floor((event as any)?.data?.buyoutCost ?? 0));
            const partnerName = (event as any)?.data?.partnerName as string | undefined;

            if (market && player && player.status === 'active') {
              if (selectedChoice.id === 'buyout') {
                (player as any).outputDeal = undefined;
                player.freshness = clamp((player.freshness ?? 50) + 1, 0, 100);

                const headline = `${player.name} buys out its output deal with ${partnerName ?? 'a rival'} for ${Math.round(
                  buyoutCost / 1_000_000
                )}M`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'licensing', 'output-deal'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                const headline = `${player.name} keeps its output deal with ${partnerName ?? 'a rival'} in place`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'strategy'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:voluntary-shutdown') {
            const market = s.game.platformMarket;
            const player = market?.player;

            const proceeds = Math.max(0, Math.floor((event as any)?.data?.proceeds ?? 0));
            const transferredSubs = Math.max(0, Math.floor((event as any)?.data?.transferredSubs ?? 0));
            const recipientId = (event as any)?.data?.recipientId as string | undefined;
            const recipientName = (event as any)?.data?.recipientName as string | undefined;

            if (market && player && player.status === 'active') {
              if (selectedChoice.id === 'shutdown') {
                const retiredName = player.name;

                player.status = 'shutdown';
                player.subscribers = 0;
                player.cash = 0;
                player.closedWeek = s.game.currentWeek;
                player.closedYear = s.game.currentYear;

                const recipient = recipientId ? (market.rivals || []).find((r) => r.id === recipientId) : undefined;
                if (recipient && recipient.status !== 'collapsed') {
                  recipient.subscribers = Math.max(0, (recipient.subscribers ?? 0) + transferredSubs);
                  recipient.freshness = clamp((recipient.freshness ?? 55) + 1, 0, 100);
                }

                const registry = Array.isArray((market as any).brandRegistry) ? ((market as any).brandRegistry as any[]) : [];
                const brandKey = retiredName.trim().toLowerCase();
                if (brandKey && !registry.some((e) => typeof e?.name === 'string' && e.name.trim().toLowerCase() === brandKey)) {
                  registry.push({
                    name: retiredName.trim(),
                    ownerId: `estate:${player.id}`,
                    ownerName: 'the bankruptcy estate',
                    acquiredWeek: s.game.currentWeek,
                    acquiredYear: s.game.currentYear,
                  });
                  (market as any).brandRegistry = registry;
                }

                const headline = `${retiredName} shuts down voluntarily, taking ${Math.round(proceeds / 1_000_000)}M in liquidation proceeds`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'negative',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'shutdown'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                const headline = `${player.name} stays the course and rejects shutdown rumors`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'strategy'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:library-licensing') {
            const market = s.game.platformMarket;
            const player = market?.player;

            const offers = Array.isArray((event as any)?.data?.offers) ? ((event as any).data.offers as any[]) : [];

            const buyerId = selectedChoice.id.startsWith('license:') ? selectedChoice.id.slice('license:'.length) : undefined;
            const offer = buyerId ? offers.find((o) => o && o.buyerId === buyerId) : undefined;

            const licenseFee = Math.max(0, Math.floor(offer?.licenseFee ?? 0));
            const titleProjectIdsRaw = offer?.titleProjectIds;
            const titleProjectIds = Array.isArray(titleProjectIdsRaw) ? (titleProjectIdsRaw as any[]).filter((x) => typeof x === 'string') : [];
            const windowWeeks = Math.max(8, Math.floor(offer?.windowWeeks ?? 26));

            if (market && player && player.status === 'active') {
              if (buyerId && offer) {
                player.freshness = clamp((player.freshness ?? 50) - 6, 0, 100);
                player.catalogValue = clamp((player.catalogValue ?? 45) - 3, 0, 100);
                player.cash = (player.cash ?? 0) + licenseFee;

                const buyer = (market.rivals || []).find((r) => r.id === buyerId);
                if (buyer && buyer.status !== 'collapsed') {
                  buyer.catalogValue = clamp((buyer.catalogValue ?? 50) + 2, 0, 100);
                  buyer.freshness = clamp((buyer.freshness ?? 55) + 1, 0, 100);
                }

                const mutateProjectById = (projectId: string, fn: (project: any) => void) => {
                  const lists = [
                    s.game.projects as any,
                    ((s.game.aiStudioProjects as any) || []) as any,
                    (s.game.allReleases || []) as any,
                  ];

                  for (const list of lists) {
                    for (const p of list || []) {
                      if (!p || typeof p !== 'object') continue;
                      if (typeof (p as any).id !== 'string') continue;
                      if ((p as any).id !== projectId) continue;
                      if (!(p as any).script) continue;
                      fn(p);
                    }
                  }
                };

                for (const pid of titleProjectIds) {
                  mutateProjectById(pid, (project) => {
                    if (project.releaseStrategy) {
                      project.releaseStrategy.streamingExclusive = false;
                    }

                    if ((project as any)?.streamingContract && (project as any).streamingContract.platformId === player.id) {
                      (project as any).streamingContract.exclusivityClause = false;
                    }

                    const releaseId = `release:${project.id}:${buyerId}:${s.game.currentYear}:W${s.game.currentWeek}`;
                    const already = (project.postTheatricalReleases ?? []).some((r: any) => r && r.id === releaseId);

                    if (!already) {
                      const releaseDate = new Date(
                        Date.UTC(s.game.currentYear, 0, 1 + Math.max(0, s.game.currentWeek - 1) * 7)
                      );

                      project.postTheatricalReleases = [
                        ...(project.postTheatricalReleases ?? []),
                        {
                          id: releaseId,
                          projectId: project.id,
                          platform: 'streaming',
                          providerId: buyerId,
                          releaseDate,
                          releaseWeek: s.game.currentWeek,
                          releaseYear: s.game.currentYear,
                          delayWeeks: 0,
                          revenue: Math.floor(licenseFee / Math.max(1, titleProjectIds.length)),
                          weeklyRevenue: 0,
                          weeksActive: 0,
                          status: 'planned',
                          cost: 0,
                          durationWeeks: windowWeeks,
                        },
                      ];
                    }
                  });
                }

                const headline = `${player.name} licenses a library package to ${offer?.buyerName ?? buyer?.name ?? 'a rival'} for ${Math.round(
                  licenseFee / 1_000_000
                )}M`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'licensing'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                const headline = `${player.name} keeps its library exclusive and declines package licensing talks`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'positive',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'exclusivity'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:library-syndication') {
            const market = s.game.platformMarket;
            const player = market?.player;

            const offers = Array.isArray((event as any)?.data?.offers) ? ((event as any).data.offers as any[]) : [];

            const top2Payout = Math.max(0, Math.floor((event as any)?.data?.top2Payout ?? 0));
            const allPayout = Math.max(0, Math.floor((event as any)?.data?.allPayout ?? 0));

            const recipients =
              selectedChoice.id === 'syndicate:all'
                ? offers
                : selectedChoice.id === 'syndicate:top2'
                  ? offers.slice().sort((a, b) => Math.floor((b?.licenseFee ?? 0) - (a?.licenseFee ?? 0))).slice(0, 2)
                  : [];

            const payout = selectedChoice.id === 'syndicate:all' ? allPayout : selectedChoice.id === 'syndicate:top2' ? top2Payout : 0;

            const titleProjectIdsRaw = recipients?.[0]?.titleProjectIds;
            const titleProjectIds = Array.isArray(titleProjectIdsRaw) ? (titleProjectIdsRaw as any[]).filter((x) => typeof x === 'string') : [];
            const windowWeeks = Math.max(8, Math.floor(recipients?.[0]?.windowWeeks ?? 26));

            if (market && player && player.status === 'active') {
              if (recipients.length > 0 && payout > 0) {
                const freshnessHit = selectedChoice.id === 'syndicate:all' ? 10 : 8;
                const catalogHit = selectedChoice.id === 'syndicate:all' ? 6 : 4;

                player.freshness = clamp((player.freshness ?? 50) - freshnessHit, 0, 100);
                player.catalogValue = clamp((player.catalogValue ?? 45) - catalogHit, 0, 100);
                player.cash = (player.cash ?? 0) + payout;

                const perTitle = titleProjectIds.length > 0 && recipients.length > 0 ? Math.floor(payout / (titleProjectIds.length * recipients.length)) : 0;

                const mutateProjectById = (projectId: string, fn: (project: any) => void) => {
                  const lists = [
                    s.game.projects as any,
                    ((s.game.aiStudioProjects as any) || []) as any,
                    (s.game.allReleases || []) as any,
                  ];

                  for (const list of lists) {
                    for (const p of list || []) {
                      if (!p || typeof p !== 'object') continue;
                      if (typeof (p as any).id !== 'string') continue;
                      if ((p as any).id !== projectId) continue;
                      if (!(p as any).script) continue;
                      fn(p);
                    }
                  }
                };

                for (const pid of titleProjectIds) {
                  mutateProjectById(pid, (project) => {
                    if (project.releaseStrategy) {
                      project.releaseStrategy.streamingExclusive = false;
                    }

                    if ((project as any)?.streamingContract && (project as any).streamingContract.platformId === player.id) {
                      (project as any).streamingContract.exclusivityClause = false;
                    }

                    for (const rec of recipients) {
                      const buyerId = rec?.buyerId;
                      if (!buyerId) continue;

                      const releaseId = `release:${project.id}:${buyerId}:${s.game.currentYear}:W${s.game.currentWeek}`;
                      const already = (project.postTheatricalReleases ?? []).some((r: any) => r && r.id === releaseId);

                      if (!already) {
                        const releaseDate = new Date(
                          Date.UTC(s.game.currentYear, 0, 1 + Math.max(0, s.game.currentWeek - 1) * 7)
                        );

                        project.postTheatricalReleases = [
                          ...(project.postTheatricalReleases ?? []),
                          {
                            id: releaseId,
                            projectId: project.id,
                            platform: 'streaming',
                            providerId: buyerId,
                            releaseDate,
                            releaseWeek: s.game.currentWeek,
                            releaseYear: s.game.currentYear,
                            delayWeeks: 0,
                            revenue: perTitle,
                            weeklyRevenue: 0,
                            weeksActive: 0,
                            status: 'planned',
                            cost: 0,
                            durationWeeks: windowWeeks,
                          },
                        ];
                      }

                      const buyer = (market.rivals || []).find((r) => r.id === buyerId);
                      if (buyer && buyer.status !== 'collapsed') {
                        buyer.catalogValue = clamp((buyer.catalogValue ?? 50) + 1, 0, 100);
                      }
                    }
                  });
                }

                const headline = `${player.name} syndicates a library package across ${recipients.length} rivals for ${Math.round(payout / 1_000_000)}M`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'neutral',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'licensing', 'bundle'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                const headline = `${player.name} keeps its library exclusive and rejects syndication`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'positive',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'exclusivity'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          if (kind === 'platform:forced-sale') {
            const market = s.game.platformMarket;
            const player = market?.player;

            const buyerId = (event as any)?.data?.buyerId as string | undefined;
            const buyerName = (event as any)?.data?.buyerName as string | undefined;
            const salePrice = Math.max(0, Math.floor((event as any)?.data?.salePrice ?? 0));
            const transferredSubs = Math.max(0, Math.floor((event as any)?.data?.transferredSubs ?? 0));
            const transferredCatalogRaw = (event as any)?.data?.transferredCatalog;
            const transferredCatalog = typeof transferredCatalogRaw === 'number' ? transferredCatalogRaw : 0;

            const emergencyFundingCost = Math.max(0, Math.floor((event as any)?.data?.emergencyFundingCost ?? 0));

            if (market && player && player.status === 'active') {
              if (selectedChoice.id === 'emergency-funding') {
                // Stabilize runway, but at the cost of layoffs and subscriber shock.
                player.cash = (player.cash ?? 0) + emergencyFundingCost * 3;
                player.distressWeeks = 0;
                player.promotionBudgetPerWeek = Math.floor((player.promotionBudgetPerWeek ?? 0) * 0.5);
                player.priceIndex = clamp((player.priceIndex ?? 1) - 0.05, 0.7, 1.5);
                player.subscribers = Math.max(0, Math.floor((player.subscribers ?? 0) * 0.85));

                const headline = `${player.name} survives on emergency funding as layoffs hit and churn spikes`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'negative',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'crisis'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else if (selectedChoice.id === 'sell') {
                const soldName = player.name;

                player.status = 'sold';
                player.subscribers = 0;
                player.cash = 0;
                player.closedWeek = s.game.currentWeek;
                player.closedYear = s.game.currentYear;

                const buyer = buyerId ? (market.rivals || []).find((r) => r.id === buyerId) : undefined;
                if (buyer && buyer.status !== 'collapsed') {
                  buyer.subscribers = Math.max(0, (buyer.subscribers ?? 0) + transferredSubs);
                  buyer.catalogValue = clamp((buyer.catalogValue ?? 50) + transferredCatalog * 0.12, 0, 100);
                }

                // Move the distressed platform's catalog windows to the buyer platform.
                if (buyerId) {
                  const oldOwnerId = player.id;
                  const newOwnerId = buyerId;
                  const newOwnerName = buyerName ?? buyer?.name;

                  const isPlayerDestination = newOwnerId.startsWith('player-platform:');
                  const processed = new Set<string>();

                  const migrateProject = (project: any) => {
                    if (!project || typeof project !== 'object') return;
                    if (typeof project.id !== 'string') return;
                    if (processed.has(project.id)) return;
                    processed.add(project.id);

                    const deal = project.streamingPremiereDeal;
                    if (deal && deal.providerId === oldOwnerId) {
                      deal.providerId = newOwnerId;
                    }

                    const rs = project.releaseStrategy;
                    if (rs) {
                      if (rs.streamingPlatformId === oldOwnerId) rs.streamingPlatformId = newOwnerId;
                      if (rs.streamingProviderId === oldOwnerId) rs.streamingProviderId = newOwnerId;
                    }

                    const contract = project.streamingContract;
                    if (contract) {
                      if (contract.platformId === oldOwnerId) contract.platformId = newOwnerId;
                      if ((contract as any).platform === oldOwnerId) (contract as any).platform = newOwnerId;
                    }

                    const dist = project.distributionStrategy;
                    if (dist?.primary && (dist.primary as any).platformId === oldOwnerId) {
                      (dist.primary as any).platformId = newOwnerId;
                      if (newOwnerName && typeof (dist.primary as any).platform === 'string') {
                        (dist.primary as any).platform = newOwnerName;
                      }
                    }

                    if (Array.isArray(dist?.windows)) {
                      for (const w of dist.windows) {
                        if (w && (w as any).platformId === oldOwnerId) {
                          (w as any).platformId = newOwnerId;
                        }
                      }
                    }

                    const releases = Array.isArray(project.postTheatricalReleases) ? project.postTheatricalReleases : [];

                    for (const r of releases) {
                      if (!r || r.platform !== 'streaming') continue;

                      const pid = (r as any).platformId || (r as any).providerId;
                      if (pid !== oldOwnerId) continue;

                      if (isPlayerDestination) {
                        (r as any).platformId = newOwnerId;
                        (r as any).providerId = undefined;
                      } else {
                        (r as any).providerId = newOwnerId;
                        (r as any).platformId = undefined;
                      }

                      const week = typeof (r as any).releaseWeek === 'number' ? (r as any).releaseWeek : s.game.currentWeek;
                      const year = typeof (r as any).releaseYear === 'number' ? (r as any).releaseYear : s.game.currentYear;
                      const desiredId = `release:${project.id}:${newOwnerId}:${year}:W${week}`;
                      const collision = releases.some((x: any) => x && x !== r && x.id === desiredId);
                      if (!collision) {
                        (r as any).id = desiredId;
                      }
                    }
                  };

                  for (const p of s.game.projects || []) migrateProject(p as any);
                  for (const p of (s.game.aiStudioProjects as any) || []) migrateProject(p as any);
                  for (const p of s.game.allReleases || []) migrateProject(p as any);
                }

                const registry = Array.isArray((market as any).brandRegistry) ? ((market as any).brandRegistry as any[]) : [];
                const brandKey = soldName.trim().toLowerCase();
                if (brandKey && !registry.some((e) => typeof e?.name === 'string' && e.name.trim().toLowerCase() === brandKey)) {
                  registry.push({
                    name: soldName.trim(),
                    ownerId: buyerId,
                    ownerName: buyerName ?? buyer?.name,
                    acquiredWeek: s.game.currentWeek,
                    acquiredYear: s.game.currentYear,
                  });
                  (market as any).brandRegistry = registry;
                }

                const headline = `${soldName} sold in a distressed deal to ${buyerName ?? buyer?.name ?? 'a rival'} for ${Math.round(
                  salePrice / 1_000_000
                )}M`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'negative',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'consolidation'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              } else {
                const retiredName = player.name;

                player.status = 'shutdown';
                player.subscribers = 0;
                player.cash = 0;
                player.closedWeek = s.game.currentWeek;
                player.closedYear = s.game.currentYear;

                const registry = Array.isArray((market as any).brandRegistry) ? ((market as any).brandRegistry as any[]) : [];
                const brandKey = retiredName.trim().toLowerCase();
                if (brandKey && !registry.some((e) => typeof e?.name === 'string' && e.name.trim().toLowerCase() === brandKey)) {
                  registry.push({
                    name: retiredName.trim(),
                    ownerId: `estate:${player.id}`,
                    ownerName: 'the bankruptcy estate',
                    acquiredWeek: s.game.currentWeek,
                    acquiredYear: s.game.currentYear,
                  });
                  (market as any).brandRegistry = registry;
                }

                const headline = `${retiredName} shuts down after catastrophic losses`;

                MediaEngine.injectDeterministicMediaItem({
                  id: `media:${event.id}:${selectedChoice.id || 'shutdown'}`,
                  type: 'news',
                  headline,
                  content: headline,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: 'negative',
                  targets: { studios: [s.game.studio.id] },
                  tags: ['streaming', 'shutdown'],
                  relatedEvents: [event.id],
                  sourceType: 'trade_publication',
                });
              }
            }
          }

          // Deterministic PR media coverage (no Date.now()/Math.random())
          if (selectedChoice.id === 'pr-spin' && kind === 'circle:poach') {
            const talentId = (event as any)?.data?.talentId as string | undefined;
            const t = talentId ? s.game.talent.find((x) => x.id === talentId) : undefined;

            if (t) {
              const vars = {
                StudioName: s.game.studio.name,
                StudioId: s.game.studio.id,
                TalentName: t.name,
                TalentId: t.id,
              };

              const template = getPlayerCircleDramaMediaTemplate('circle:poach:pr-spin', vars, { enableMods: s.game.mode !== 'online' });
              if (template) {
                const mediaId = `media:${event.id}:pr-spin`;
                MediaEngine.injectDeterministicMediaItem({
                  id: mediaId,
                  type: template.type,
                  headline: template.headline,
                  content: template.content,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: template.sentiment,
                  targets: { studios: [s.game.studio.id], talent: [t.id] },
                  impact: template.impact,
                  tags: template.tags,
                  relatedEvents: [event.id],
                  sourceType: template.sourceType,
                  sourceId: template.sourceId,
                });
              }
            }
          }

          if (selectedChoice.id === 'pr-shield' && kind === 'circle:feud') {
            const projectId = (event as any)?.data?.projectId as string | undefined;
            const talentAId = (event as any)?.data?.talentAId as string | undefined;
            const talentBId = (event as any)?.data?.talentBId as string | undefined;

            const project = projectId ? s.game.projects.find((p) => p.id === projectId) : undefined;
            const a = talentAId ? s.game.talent.find((x) => x.id === talentAId) : undefined;
            const b = talentBId ? s.game.talent.find((x) => x.id === talentBId) : undefined;

            if (project && a && b) {
              const vars = {
                StudioName: s.game.studio.name,
                StudioId: s.game.studio.id,
                ProjectTitle: project.title,
                ProjectId: project.id,
                TalentAName: a.name,
                TalentAId: a.id,
                TalentBName: b.name,
                TalentBId: b.id,
              };

              const template = getPlayerCircleDramaMediaTemplate('circle:feud:pr-shield', vars, { enableMods: s.game.mode !== 'online' });
              if (template) {
                const mediaId = `media:${event.id}:pr-shield`;
                MediaEngine.injectDeterministicMediaItem({
                  id: mediaId,
                  type: template.type,
                  headline: template.headline,
                  content: template.content,
                  week: s.game.currentWeek,
                  year: s.game.currentYear,
                  sentiment: template.sentiment,
                  targets: { studios: [s.game.studio.id], projects: [project.id], talent: [a.id, b.id] },
                  impact: template.impact,
                  tags: template.tags,
                  relatedEvents: [event.id],
                  sourceType: template.sourceType,
                  sourceId: template.sourceId,
                });
              }
            }
          }
        }

        s.game.eventQueue.splice(idx, 1);

        s.game.mediaState = {
          engine: MediaEngine.snapshot(),
          response: MediaResponseSystem.snapshot(),
        };
      });
    },
  }))
);

// ---------------------------------------------------------------------------
// Convenience selector hooks (for common slices)
// ---------------------------------------------------------------------------

export const useGameState = () => useGameStore((s) => s.game);
export const useStudio = () => useGameStore((s) => s.game?.studio ?? null);
export const useBudget = () => useGameStore((s) => s.game?.studio.budget ?? 0);
export const useReputation = () => useGameStore((s) => s.game?.studio.reputation ?? 0);
export const useWeek = () => useGameStore((s) => s.game?.currentWeek ?? 0);
export const useYear = () => useGameStore((s) => s.game?.currentYear ?? 0);
export const useProjects = () => useGameStore((s) => s.game?.projects ?? []);
export const useTalent = () => useGameStore((s) => s.game?.talent ?? []);
export const useLastTickReport = () => useGameStore((s) => s.lastTickReport);
