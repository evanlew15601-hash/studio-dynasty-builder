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
import type { GameState, Project, Script, Studio, TalentPerson } from '@/types/game';
import type { TickReport } from '@/types/tickReport';
import type { ModBundle } from '@/types/modding';
import type { SeededRng } from './core/rng';
import { createRng, generateGameSeed } from './core/rng';
import { advanceWeek as tickAdvanceWeek } from './core/tick';
import { SystemRegistry } from './core/registry';
import type { TickResult, TickSystem } from './core/types';
import { advanceWeekInWorker } from './worker/client';
import { saveGame } from '@/utils/saveLoad';

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

  /** Convenience budget update */
  updateBudget: (delta: number) => void;

  /** Update a project */
  updateProject: (projectId: string, updates: Partial<Project>, marketingCost?: number) => void;

  /** Replace a project wholesale */
  replaceProject: (project: Project) => void;

  /** Update talent */
  updateTalent: (talentId: string, updates: Partial<TalentPerson>) => void;

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
}

// ---------------------------------------------------------------------------
// Store creation
// ---------------------------------------------------------------------------

const MAX_TICK_HISTORY = 20;

export const useGameStore = create<GameStoreState>()(
  immer((set, get) => ({
    game: null,
    seed: 0,
    rng: null,
    registry: new SystemRegistry(),
    lastTickReport: null,
    tickHistory: [],
    initialized: false,
    mods: null,

    initGame: (state, seed) => {
      const gameSeed = seed ?? generateGameSeed();
      set((s) => {
        s.game = state;
        s.seed = gameSeed;
        s.rng = createRng(gameSeed);
        s.initialized = true;
        s.lastTickReport = null;
        s.tickHistory = [];
      });
    },

    loadGame: (state, seed) => {
      const gameSeed = seed ?? generateGameSeed();
      set((s) => {
        s.game = state;
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

      const systems = registry.getOrdered();
      const result = tickAdvanceWeek(game, rng, systems, {
        debug: import.meta.env.DEV,
      });

      const report: TickReport = {
        week: result.nextState.currentWeek,
        year: result.nextState.currentYear,
        startedAtIso: result.startedAtIso,
        finishedAtIso: result.finishedAtIso,
        totalMs: result.totalMs,
        systems: result.systems,
        recap: result.recap,
        summary: {
          budgetDelta: (result.nextState.studio.budget ?? 0) - (game.studio.budget ?? 0),
          reputationDelta: (result.nextState.studio.reputation ?? 0) - (game.studio.reputation ?? 0),
        },
      };

      set((s) => {
        s.game = result.nextState as any;
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

      const report: TickReport = {
        week: result.nextState.currentWeek,
        year: result.nextState.currentYear,
        startedAtIso: result.startedAtIso,
        finishedAtIso: result.finishedAtIso,
        totalMs: result.totalMs,
        systems: result.systems,
        recap: result.recap,
        summary: {
          budgetDelta: (result.nextState.studio.budget ?? 0) - (game.studio.budget ?? 0),
          reputationDelta: (result.nextState.studio.reputation ?? 0) - (game.studio.reputation ?? 0),
        },
      };

      set((s) => {
        s.game = result.nextState as any;
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
      });
    },

    updateStudio: (updates) => {
      set((s) => {
        if (!s.game) return;
        Object.assign(s.game.studio, updates);
      });
    },

    updateBudget: (delta) => {
      set((s) => {
        if (!s.game) return;
        s.game.studio.budget = (s.game.studio.budget ?? 0) + delta;
      });
    },

    updateProject: (projectId, updates, marketingCost) => {
      set((s) => {
        if (!s.game) return;
        const idx = s.game.projects.findIndex((p) => p.id === projectId);
        if (idx >= 0) {
          Object.assign(s.game.projects[idx], updates);
        }
        if (marketingCost) {
          s.game.studio.budget -= marketingCost;
        }
      });
    },

    replaceProject: (project) => {
      set((s) => {
        if (!s.game) return;
        const idx = s.game.projects.findIndex((p) => p.id === project.id);
        if (idx >= 0) {
          s.game.projects[idx] = project as any;
        }
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
        s.game = next as any;
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
