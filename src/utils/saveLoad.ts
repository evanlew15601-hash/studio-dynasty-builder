import { GameState } from '@/types/game';
import { isTauriRuntime, loadSlotJson, saveSlotJson } from '@/integrations/tauri/saves';
import { parseJsonInWorker } from '@/game/worker/jsonParseClient';

export interface SaveGameMeta {
  savedAt: string;
  version: string;
  note?: string;
  /**
   * The UI phase/tab the player was viewing when saving.
   * Used to restore the UI context on load.
   */
  currentPhase?: string;
}

export interface SaveGameSnapshot {
  gameState: GameState;
  meta: SaveGameMeta;
  /**
   * Achievement IDs that were unlocked at the moment of saving.
   * This prevents double-rewarding when reloading.
   */
  unlockedAchievements?: string[];
}

const SAVE_KEY_PREFIX = 'studio-magnate-save-';
const CURRENT_SAVE_VERSION = 'alpha-1';

function buildSnapshot(
  gameState: GameState,
  options?: {
    note?: string;
    currentPhase?: string;
    unlockedAchievementIds?: string[];
  }
): SaveGameSnapshot {
  return {
    gameState,
    meta: {
      savedAt: new Date().toISOString(),
      version: CURRENT_SAVE_VERSION,
      note: options?.note,
      currentPhase: options?.currentPhase,
    },
    unlockedAchievements: options?.unlockedAchievementIds,
  };
}

/**
 * Persist a game snapshot.
 * - Web: localStorage
 * - Tauri: filesystem via Rust command
 */
export function saveGame(
  slotId: string,
  gameState: GameState,
  options?: {
    note?: string;
    currentPhase?: string;
    unlockedAchievementIds?: string[];
  }
): void {
  if (isTauriRuntime()) {
    void saveGameAsync(slotId, gameState, options);
    return;
  }

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  const snapshot = buildSnapshot(gameState, options);

  try {
    const key = `${SAVE_KEY_PREFIX}${slotId}`;
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Failed to save game snapshot', error);
  }
}

export async function saveGameAsync(
  slotId: string,
  gameState: GameState,
  options?: {
    note?: string;
    currentPhase?: string;
    unlockedAchievementIds?: string[];
  }
): Promise<void> {
  const snapshot = buildSnapshot(gameState, options);

  if (isTauriRuntime()) {
    await saveSlotJson(slotId, JSON.stringify(snapshot));
    return;
  }

  saveGame(slotId, gameState, options);
}

/**
 * Load a previously saved game snapshot.
 * - Web: localStorage
 * - Tauri: filesystem via Rust command
 */
export function loadGame(slotId: string): SaveGameSnapshot | null {
  if (isTauriRuntime()) {
    return null;
  }

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

export async function loadGameAsync(slotId: string): Promise<SaveGameSnapshot | null> {
  if (isTauriRuntime()) {
    try {
      const raw = await loadSlotJson(slotId);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveGameSnapshot;

      if (!parsed || !parsed.gameState || !parsed.meta) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Failed to load game snapshot', error);
      return null;
    }
  }

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  try {
    const key = `${SAVE_KEY_PREFIX}${slotId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    let parsed: SaveGameSnapshot;
    try {
      parsed = await parseJsonInWorker<SaveGameSnapshot>(raw);
    } catch {
      parsed = JSON.parse(raw) as SaveGameSnapshot;
    }

    if (!parsed || !parsed.gameState || !parsed.meta) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load game snapshot', error);
    return null;
  }
}