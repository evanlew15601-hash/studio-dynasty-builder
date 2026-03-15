import { GameState } from '@/types/game';
import { isTauriRuntime, loadSlotJson, saveSlotJson, listSlots, deleteSlot, getSavesDir } from '@/integrations/tauri/saves';

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
const ACTIVE_SLOT_KEY = 'studio-magnate-active-save-slot';

export const DEFAULT_SAVE_SLOT_ID = 'slot1';
export const AUTO_LOAD_SLOT_KEY = 'studio-magnate-auto-load-slot';

const CURRENT_SAVE_VERSION = 'alpha-1';

export function getActiveSaveSlotId(): string {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return DEFAULT_SAVE_SLOT_ID;
  }

  const raw = window.localStorage.getItem(ACTIVE_SLOT_KEY);
  const normalized = raw ? normalizeSlotId(raw) : '';
  return normalized || DEFAULT_SAVE_SLOT_ID;
}

export function setActiveSaveSlotId(slotId: string): void {
  const normalized = normalizeSlotId(slotId);
  if (!normalized) return;

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  window.localStorage.setItem(ACTIVE_SLOT_KEY, normalized);
}

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
    const normalized = normalizeSlotId(slotId);
    if (!normalized) return;

    const key = `${SAVE_KEY_PREFIX}${normalized}`;
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Failed to save game snapshot', error);
  }
}

export function normalizeSlotId(raw: string): string {
  return (raw || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function saveSnapshotAsync(slotId: string, snapshot: SaveGameSnapshot): Promise<void> {
  const normalized = normalizeSlotId(slotId);
  if (!normalized) return;

  if (isTauriRuntime()) {
    await saveSlotJson(normalized, JSON.stringify(snapshot));
    return;
  }

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  const key = `${SAVE_KEY_PREFIX}${normalized}`;
  window.localStorage.setItem(key, JSON.stringify(snapshot));
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
  await saveSnapshotAsync(slotId, snapshot);
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
    const normalized = normalizeSlotId(slotId);
    if (!normalized) return null;

    const key = `${SAVE_KEY_PREFIX}${normalized}`;
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

  return loadGame(slotId);
}

export async function deleteGameAsync(slotId: string): Promise<void> {
  if (isTauriRuntime()) {
    await deleteSlot(slotId);
    return;
  }

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  const normalized = normalizeSlotId(slotId);
  if (!normalized) return;

  const key = `${SAVE_KEY_PREFIX}${normalized}`;
  window.localStorage.removeItem(key);
}

export async function listSaveSlotsAsync(): Promise<string[]> {
  if (isTauriRuntime()) {
    return await listSlots();
  }

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return [];
  }

  const slots = new Set<string>();
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith(SAVE_KEY_PREFIX)) continue;
    const rawSlotId = k.slice(SAVE_KEY_PREFIX.length);
    const slotId = normalizeSlotId(rawSlotId);
    if (slotId) slots.add(slotId);
  }

  return [...slots].sort();
}

export async function getSavesDirAsync(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  return await getSavesDir();
}