import type { ModBundle } from '@/types/modding';
import { createEmptyModBundle, normalizeModBundle } from '@/utils/modding';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const STORAGE_KEY = 'studio-magnate-mod-bundle-v1';

let cached: ModBundle | null = null;

export function invalidateModBundleCache(): void {
  cached = null;
}

export function loadModBundle(storage?: StorageLike): ModBundle {
  const store: StorageLike | undefined = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return createEmptyModBundle();

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return createEmptyModBundle();
    return normalizeModBundle(JSON.parse(raw));
  } catch {
    return createEmptyModBundle();
  }
}

export function getModBundle(storage?: StorageLike): ModBundle {
  if (cached) return cached;
  cached = loadModBundle(storage);
  return cached;
}

export function saveModBundle(bundle: ModBundle, storage?: StorageLike): void {
  const store: StorageLike | undefined = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;

  store.setItem(STORAGE_KEY, JSON.stringify(bundle));
  cached = bundle;
}

export function clearModBundle(storage?: StorageLike): void {
  const store: StorageLike | undefined = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;

  store.removeItem?.(STORAGE_KEY);
  cached = createEmptyModBundle();
}
