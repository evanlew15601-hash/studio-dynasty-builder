import { describe, expect, it } from 'vitest';
import type { StorageLike } from '@/utils/moddingStore';
import { clearModBundle, saveModBundleToSlot, setActiveModSlot } from '@/utils/moddingStore';
import type { ModBundle } from '@/types/modding';

class MemoryStorage implements StorageLike {
  map = new Map<string, string>();
  setCalls: Array<{ key: string; value: string }> = [];
  removeCalls: string[] = [];

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
    this.setCalls.push({ key, value });
  }

  removeItem(key: string): void {
    this.map.delete(key);
    this.removeCalls.push(key);
  }
}

const BUNDLE: ModBundle = {
  version: 1,
  mods: [{ id: 'm1', name: 'm1', version: '1.0.0', enabled: true, priority: 0 }],
  patches: [],
};

describe('moddingStore slots (default read-only)', () => {
  it('does not persist writes to the default slot', () => {
    const store = new MemoryStorage();

    saveModBundleToSlot('default', BUNDLE, store);

    expect(store.setCalls.length).toBe(0);
    expect(store.getItem('studio-magnate-mod-bundle-v1')).toBeNull();
  });

  it('persists writes to non-default slots', () => {
    const store = new MemoryStorage();

    saveModBundleToSlot('my-slot', BUNDLE, store);

    expect(store.setCalls.length).toBeGreaterThan(0);
    expect(store.getItem('studio-magnate-mod-bundle-v1:my-slot')).toBeTypeOf('string');
  });

  it('does not clear the default slot', () => {
    const store = new MemoryStorage();

    // Simulate an existing old default save (from a previous version)
    store.setItem('studio-magnate-mod-bundle-v1', JSON.stringify(BUNDLE));
    setActiveModSlot('default', store);

    clearModBundle(store);

    expect(store.removeCalls.length).toBe(0);
    expect(store.getItem('studio-magnate-mod-bundle-v1')).toBeTypeOf('string');
  });
});
