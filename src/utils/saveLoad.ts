import { GameState } from '@/types/game';

export interface SaveGameMeta {
  savedAt: string;
  version: string;
  note?: string;
}

export interface SaveGameSnapshot {
  gameState: GameState;
  meta: SaveGameMeta;
}

const SAVE_KEY_PREFIX = 'studio-magnate-save-';
const CURRENT_SAVE_VERSION = 'alpha-1';

/**
 * Persist a game snapshot to localStorage.
 * Uses a simple slot-based scheme: studio-magnate-save-{slotId}
 */
export function saveGame(slotId: string, gameState: GameState, note?: string): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  const snapshot: SaveGameSnapshot = {
    gameState,
    meta: {
      savedAt: new Date().toISOString(),
      version: CURRENT_SAVE_VERSION,
      note,
    },
  };

  try {
    const key = `${SAVE_KEY_PREFIX}${slotId}`;
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Failed to save game snapshot', error);
  }
}

/**
 * Load a previously saved game snapshot from localStorage.
 * Returns null if no save is present or parsing fails.
 */
export function loadGame(slotId: string): SaveGameSnapshot | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  try {
    const key = `${SAVE_KEY_PREFIX}${slotId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SaveGameSnapshot;

    // Basic shape check
    if (!parsed || !parsed.gameState || !parsed.meta) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load game snapshot', error);
    return null;
  }
}