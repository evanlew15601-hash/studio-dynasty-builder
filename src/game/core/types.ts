/**
 * Engine core types — no React imports allowed in src/game/**.
 */

import type { GameState } from '@/types/game';
import type { SeededRng } from './rng';
import type { TickRecapCard, TickSystemReport } from '@/types/tickReport';

// ---------------------------------------------------------------------------
// Tick context — threaded through every system during advanceWeek
// ---------------------------------------------------------------------------

export interface TickContext {
  /** Seeded PRNG — use instead of Math.random() */
  rng: SeededRng;
  /** Week number AFTER time advance (1–52) */
  week: number;
  /** Year AFTER time advance */
  year: number;
  /** Quarter AFTER time advance (1–4) */
  quarter: number;
  /** Recap cards emitted by systems during this tick */
  recap: TickRecapCard[];
  /** Debug/perf: whether to emit verbose logging */
  debug: boolean;
}

// ---------------------------------------------------------------------------
// System — a registered tick system
// ---------------------------------------------------------------------------

export interface TickSystem {
  /** Unique identifier (e.g., "boxOffice", "awards") */
  id: string;
  /** Human-readable label for UI/debugging */
  label: string;
  /** Systems this depends on (must run first) */
  dependsOn?: string[];
  /**
   * Execute this system's weekly logic.
   * Must be a PURE function: (state, ctx) => new state.
   * May push recap cards to ctx.recap.
   */
  onTick: (state: GameState, ctx: TickContext) => GameState;
}

// ---------------------------------------------------------------------------
// Tick result — returned from the tick pipeline
// ---------------------------------------------------------------------------

export interface TickResult {
  nextState: GameState;
  systems: TickSystemReport[];
  recap: TickRecapCard[];
  totalMs: number;
  startedAtIso: string;
  finishedAtIso: string;
}

// ---------------------------------------------------------------------------
// Commands — player actions dispatched to the engine
// ---------------------------------------------------------------------------

export type CommandType =
  | 'ADVANCE_WEEK'
  | 'CREATE_PROJECT'
  | 'UPDATE_PROJECT'
  | 'UPDATE_STUDIO'
  | 'SIGN_TALENT'
  | 'SET_MARKETING'
  | 'SET_RELEASE_STRATEGY'
  | 'SAVE_GAME'
  | 'LOAD_GAME'
  | 'APPLY_MODS';

export interface Command<T extends CommandType = CommandType, P = unknown> {
  type: T;
  payload: P;
  /** ISO timestamp of when the command was dispatched */
  timestamp: string;
}
