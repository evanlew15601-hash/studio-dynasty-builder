/**
 * Engine barrel export — public API for the game engine.
 *
 * Hard rule: nothing in src/game/** imports React.
 */

// Core
export { createRng, generateGameSeed, seedFromString } from './core/rng';
export type { SeededRng } from './core/rng';
export { advanceWeek } from './core/tick';
export { SystemRegistry, getDefaultRegistry, resetDefaultRegistry } from './core/registry';
export type { TickContext, TickSystem, TickResult, Command, CommandType } from './core/types';

// Actions
export { Commands, createCommand } from './actions/commands';

// Selectors
export * from './selectors/studio';

// Persistence
export { BrowserStorage, getDefaultStorage, setDefaultStorage } from './persistence/storage';
export type { GameStorage } from './persistence/storage';
export { migrateSnapshot, validateSnapshot, CURRENT_VERSION } from './persistence/migrations';

// Modding
export { validateModBundle } from './modding/validation';
