import { GameState } from '@/types/game';
import { isTauriRuntime, loadSlotJson, saveSlotJson, listSlots, deleteSlot, getSavesDir } from '@/integrations/tauri/saves';
import { CURRENT_SAVE_VERSION } from '@/utils/saveVersion';
import { migrateSnapshot, validateSnapshot } from '@/game/persistence/migrations';
import { getCurrentModFingerprint } from '@/utils/modFingerprint';
import { getActiveModSlot } from '@/utils/moddingStore';

export interface SaveGameMeta {
  savedAt: string;
  version: string;
  note?: string;
  /**
   * The UI phase/tab the player was viewing when saving.
   * Used to restore the UI context on load.
   */
  currentPhase?: string;
  /**
   * The mod slot that was active when the save was created.
   * This prevents loading a save under a different mod database.
   */
  modSlotId?: string;
  /**
   * Fingerprint of the active mod bundle at save time.
   * Used for mismatch warnings (best-effort).
   */
  modBundleHash?: string;
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
const ACTIVE_SLOT_KEY_LEGACY = 'studio-magnate-active-save-slot';
const ACTIVE_SLOT_KEY_PREFIX = 'studio-magnate-active-save-slot:';

export const DEFAULT_SAVE_SLOT_ID = 'slot1';
export const AUTO_LOAD_SLOT_KEY = 'studio-magnate-auto-load-slot';

function normalizeDbId(raw: string | null | undefined): string {
  const normalized = normalizeSlotId(raw || '');
  return normalized || 'default';
}

function activeSlotKey(modSlotId?: string): string {
  const db = normalizeDbId(modSlotId ?? getActiveModSlot());
  return `${ACTIVE_SLOT_KEY_PREFIX}${db}`;
}

function encodeStorageSlotId(modSlotId: string, slotId: string): string {
  const db = normalizeDbId(modSlotId);
  const slot = normalizeSlotId(slotId);
  if (!slot) return '';
  return `db${db.length}_${db}_${slot}`;
}

function decodeStorageSlotId(storageSlotId: string): { dbId: string; slotId: string } | null {
  const raw = (storageSlotId || '').trim();
  if (!raw) return null;

  if (!raw.startsWith('db')) {
    const slotId = normalizeSlotId(raw);
    if (!slotId) return null;
    return { dbId: 'default', slotId };
  }

  const rest = raw.slice(2);
  const underscoreIdx = rest.indexOf('_');
  if (underscoreIdx <= 0) return null;

  const lenStr = rest.slice(0, underscoreIdx);
  if (!/^[0-9]+$/.test(lenStr)) return null;

  const len = Number.parseInt(lenStr, 10);
  if (!Number.isFinite(len) || len <= 0) return null;

  const afterLen = rest.slice(underscoreIdx + 1);
  if (afterLen.length < len + 1) return null;

  const dbId = afterLen.slice(0, len);
  if (afterLen[len] !== '_') return null;

  const slotRaw = afterLen.slice(len + 1);
  const slotId = normalizeSlotId(slotRaw);
  if (!slotId) return null;

  return { dbId: normalizeDbId(dbId), slotId };
}

function buildSaveKey(slotId: string, modSlotId?: string): { dbId: string; slotId: string; storageSlotId: string; key: string } | null {
  const slot = normalizeSlotId(slotId);
  if (!slot) return null;

  const dbId = normalizeDbId(modSlotId ?? getActiveModSlot());
  const storageSlotId = encodeStorageSlotId(dbId, slot);
  if (!storageSlotId) return null;

  return {
    dbId,
    slotId: slot,
    storageSlotId,
    key: `${SAVE_KEY_PREFIX}${storageSlotId}`,
  };
}

export function getActiveSaveSlotId(modSlotId?: string): string {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return DEFAULT_SAVE_SLOT_ID;
  }

  const raw = window.localStorage.getItem(activeSlotKey(modSlotId));
  const normalized = raw ? normalizeSlotId(raw) : '';
  if (normalized) return normalized;

  const db = normalizeDbId(modSlotId ?? getActiveModSlot());
  if (db === 'default') {
    const legacyRaw = window.localStorage.getItem(ACTIVE_SLOT_KEY_LEGACY);
    const legacyNormalized = legacyRaw ? normalizeSlotId(legacyRaw) : '';
    if (legacyNormalized) return legacyNormalized;
  }

  return DEFAULT_SAVE_SLOT_ID;
}

export function setActiveSaveSlotId(slotId: string, modSlotId?: string): void {
  const normalized = normalizeSlotId(slotId);
  if (!normalized) return;

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  const db = normalizeDbId(modSlotId ?? getActiveModSlot());

  window.localStorage.setItem(activeSlotKey(db), normalized);
  if (db === 'default') {
    window.localStorage.setItem(ACTIVE_SLOT_KEY_LEGACY, normalized);
  }
}

function buildSnapshot(
  gameState: GameState,
  options?: {
    note?: string;
    currentPhase?: string;
    unlockedAchievementIds?: string[];
  }
): SaveGameSnapshot {
  const modFingerprint = getCurrentModFingerprint();

  return {
    gameState,
    meta: {
      savedAt: new Date().toISOString(),
      version: CURRENT_SAVE_VERSION,
      note: options?.note,
      currentPhase: options?.currentPhase,
      modSlotId: modFingerprint.slotId,
      modBundleHash: modFingerprint.bundleHash,
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
    const info = buildSaveKey(slotId, snapshot.meta.modSlotId);
    if (!info) return;

    window.localStorage.setItem(info.key, JSON.stringify(snapshot));
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

export async function saveSnapshotAsync(slotId: string, snapshot: SaveGameSnapshot, modSlotId?: string): Promise<void> {
  const normalized = normalizeSlotId(slotId);
  if (!normalized) return;

  const info = buildSaveKey(normalized, modSlotId ?? snapshot.meta?.modSlotId);
  if (!info) return;

  if (isTauriRuntime()) {
    await saveSlotJson(info.storageSlotId, JSON.stringify(snapshot));
    return;
  }

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  window.localStorage.setItem(info.key, JSON.stringify(snapshot));
}

export async function saveGameAsync(
  slotId: string,
  gameState: GameState,
  options?: {
    note?: string;
    currentPhase?: string;
    unlockedAchievementIds?: string[];
  },
  modSlotId?: string
): Promise<void> {
  const snapshot = buildSnapshot(gameState, options);
  await saveSnapshotAsync(slotId, snapshot, modSlotId ?? snapshot.meta.modSlotId);
}

/**
 * Load a previously saved game snapshot.
 * - Web: localStorage
 * - Tauri: filesystem via Rust command
 */
export function loadGame(slotId: string, modSlotId?: string): SaveGameSnapshot | null {
  if (isTauriRuntime()) {
    return null;
  }

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  try {
    const normalized = normalizeSlotId(slotId);
    if (!normalized) return null;

    const info = buildSaveKey(normalized, modSlotId);
    if (!info) return null;

    const raw = window.localStorage.getItem(info.key);
    const legacyRaw = info.dbId === 'default'
      ? window.localStorage.getItem(`${SAVE_KEY_PREFIX}${normalized}`)
      : null;

    const data = raw || legacyRaw;
    if (!data) return null;

    const parsed = JSON.parse(data) as unknown;
    const validated = validateSnapshot(parsed);
    if (!validated) return null;

    return migrateSnapshot(validated);
  } catch (error) {
    console.error('Failed to load game snapshot', error);
    return null;
  }
}

export async function loadGameAsync(slotId: string, modSlotId?: string): Promise<SaveGameSnapshot | null> {
  const normalized = normalizeSlotId(slotId);
  if (!normalized) return null;

  const info = buildSaveKey(normalized, modSlotId);
  if (!info) return null;

  if (isTauriRuntime()) {
    try {
      const raw = await loadSlotJson(info.storageSlotId);
      let data = raw;

      if (!data && info.dbId === 'default') {
        data = await loadSlotJson(normalized);
      }

      if (!data) return null;

      const parsed = JSON.parse(data) as unknown;
      const validated = validateSnapshot(parsed);
      if (!validated) return null;

      return migrateSnapshot(validated);
    } catch (error) {
      console.error('Failed to load game snapshot', error);
      return null;
    }
  }

  return loadGame(normalized, modSlotId);
}

export async function deleteGameAsync(slotId: string, modSlotId?: string): Promise<void> {
  const info = buildSaveKey(slotId, modSlotId);
  if (!info) return;

  if (isTauriRuntime()) {
    await deleteSlot(info.storageSlotId);
    if (info.dbId === 'default') {
      await deleteSlot(info.slotId);
    }
    return;
  }

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  window.localStorage.removeItem(info.key);
  if (info.dbId === 'default') {
    window.localStorage.removeItem(`${SAVE_KEY_PREFIX}${info.slotId}`);
  }
}

export async function listSaveSlotsAsync(modSlotId?: string): Promise<string[]> {
  const db = normalizeDbId(modSlotId ?? getActiveModSlot());

  if (isTauriRuntime()) {
    const rawSlots = await listSlots();
    const slots = new Set<string>();

    for (const raw of rawSlots) {
      const decoded = decodeStorageSlotId(raw);
      if (!decoded) continue;
      if (decoded.dbId !== db) continue;
      slots.add(decoded.slotId);
    }

    return [...slots].sort();
  }

  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return [];
  }

  const slots = new Set<string>();
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith(SAVE_KEY_PREFIX)) continue;

    const storageId = k.slice(SAVE_KEY_PREFIX.length);
    const decoded = decodeStorageSlotId(storageId);
    if (!decoded) continue;
    if (decoded.dbId !== db) continue;

    slots.add(decoded.slotId);
  }

  return [...slots].sort();
}

export async function getSavesDirAsync(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  return await getSavesDir();
}