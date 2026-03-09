import type { ModBundle } from '@/types/modding';
import { createEmptyModBundle, normalizeModBundle } from '@/utils/modding';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const STORAGE_KEY = 'studio-magnate-mod-bundle-v1';
const ACTIVE_SLOT_KEY = 'studio-magnate-mod-active-slot-v1';
const SLOTS_KEY = 'studio-magnate-mod-slots-v1';

const DEFAULT_SLOT = 'default';

const keyForSlot = (slotId: string) => (slotId === DEFAULT_SLOT ? STORAGE_KEY : `${STORAGE_KEY}:${slotId}`);

let cached: ModBundle | null = null;
let cachedSlot: string | null = null;

export function invalidateModBundleCache(): void {
  cached = null;
  cachedSlot = null;
}

function getStore(storage?: StorageLike): StorageLike | undefined {
  return storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
}

export function listModSlots(storage?: StorageLike): string[] {
  const store = getStore(storage);
  if (!store) return [DEFAULT_SLOT];

  try {
    const raw = store.getItem(SLOTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    const slots = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string' && !!s.trim()) : [];
    const uniq = Array.from(new Set([DEFAULT_SLOT, ...slots]));
    return uniq;
  } catch {
    return [DEFAULT_SLOT];
  }
}

function saveSlotRegistry(slots: string[], storage?: StorageLike): void {
  const store = getStore(storage);
  if (!store) return;

  store.setItem(SLOTS_KEY, JSON.stringify(Array.from(new Set([DEFAULT_SLOT, ...slots]))));
}

export function getActiveModSlot(storage?: StorageLike): string {
  const store = getStore(storage);
  if (!store) return DEFAULT_SLOT;

  const slot = store.getItem(ACTIVE_SLOT_KEY) || DEFAULT_SLOT;
  const normalized = slot.trim() || DEFAULT_SLOT;

  // Ensure the slot appears in the registry.
  const slots = listModSlots(store);
  if (!slots.includes(normalized)) {
    saveSlotRegistry([...slots, normalized], store);
  }

  return normalized;
}

export function setActiveModSlot(slotId: string, storage?: StorageLike): void {
  const store = getStore(storage);
  if (!store) return;

  const normalized = slotId.trim() || DEFAULT_SLOT;
  store.setItem(ACTIVE_SLOT_KEY, normalized);

  const slots = listModSlots(store);
  if (!slots.includes(normalized)) {
    saveSlotRegistry([...slots, normalized], store);
  }

  invalidateModBundleCache();
}

export function loadModBundleSlot(slotId: string, storage?: StorageLike): ModBundle {
  const store = getStore(storage);
  if (!store) return createEmptyModBundle();

  try {
    const raw = store.getItem(keyForSlot(slotId));
    if (!raw) return createEmptyModBundle();
    return normalizeModBundle(JSON.parse(raw));
  } catch {
    return createEmptyModBundle();
  }
}

export function loadModBundle(storage?: StorageLike): ModBundle {
  const slot = getActiveModSlot(storage);
  return loadModBundleSlot(slot, storage);
}

export function getModBundle(storage?: StorageLike): ModBundle {
  const slot = getActiveModSlot(storage);
  if (cached && cachedSlot === slot) return cached;

  cached = loadModBundleSlot(slot, storage);
  cachedSlot = slot;
  return cached;
}

export function saveModBundleToSlot(slotId: string, bundle: ModBundle, storage?: StorageLike): void {
  const store = getStore(storage);
  if (!store) return;

  const normalized = slotId.trim() || DEFAULT_SLOT;

  // TEW-style: keep the default slot as a safe baseline.
  // Users should create a new slot for their custom databases.
  if (normalized === DEFAULT_SLOT) {
    return;
  }

  store.setItem(keyForSlot(normalized), JSON.stringify(bundle));

  const slots = listModSlots(store);
  if (!slots.includes(normalized)) {
    saveSlotRegistry([...slots, normalized], store);
  }

  // Keep cache coherent if saving the active slot.
  if (cachedSlot === normalized) {
    cached = bundle;
  }
}

export function saveModBundle(bundle: ModBundle, storage?: StorageLike): void {
  const slot = getActiveModSlot(storage);
  saveModBundleToSlot(slot, bundle, storage);

  // Only update cache if the slot is actually writable.
  if (slot !== DEFAULT_SLOT) {
    cached = bundle;
    cachedSlot = slot;
  }
}

export function deleteModSlot(slotId: string, storage?: StorageLike): void {
  const store = getStore(storage);
  if (!store) return;

  const normalized = slotId.trim();
  if (!normalized || normalized === DEFAULT_SLOT) return;

  store.removeItem?.(keyForSlot(normalized));

  const nextSlots = listModSlots(store).filter((s) => s !== normalized);
  saveSlotRegistry(nextSlots, store);

  if (getActiveModSlot(store) === normalized) {
    setActiveModSlot(DEFAULT_SLOT, store);
  }

  invalidateModBundleCache();
}

export function clearModBundle(storage?: StorageLike): void {
  const store = getStore(storage);
  if (!store) return;

  const slot = getActiveModSlot(store);
  if (slot === DEFAULT_SLOT) {
    return;
  }

  store.removeItem?.(keyForSlot(slot));

  cached = createEmptyModBundle();
  cachedSlot = slot;
}
