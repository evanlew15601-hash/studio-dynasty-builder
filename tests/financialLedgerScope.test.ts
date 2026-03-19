import { describe, expect, it, beforeEach } from 'vitest';

import { FinancialEngine } from '@/components/game/FinancialEngine';
import { setActiveSaveSlotId } from '@/utils/saveLoad';
import { setActiveModSlot } from '@/utils/moddingStore';

type LocalStorageMock = {
  length: number;
  key: (index: number) => string | null;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function createLocalStorageMock(): LocalStorageMock {
  const map = new Map<string, string>();

  return {
    get length() {
      return map.size;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

describe('FinancialEngine ledger storage scoping', () => {
  beforeEach(() => {
    const localStorage = createLocalStorageMock();
    (globalThis as any).window = { localStorage };

    setActiveModSlot('default', localStorage as any);
    setActiveSaveSlotId('slot1', 'default');

    FinancialEngine.clearLedger();
  });

  it('persists ledgers per save slot (no cross-save contamination)', () => {
    FinancialEngine.recordTransaction('revenue', 'boxoffice', 100, 1, 2020, 'Slot1 revenue', 'p1');

    const key1 = 'studio-magnate-ledger:default:slot1';
    const raw1 = (globalThis as any).window.localStorage.getItem(key1);
    expect(raw1).toBeTypeOf('string');

    setActiveSaveSlotId('slot2', 'default');

    FinancialEngine.recordTransaction('revenue', 'boxoffice', 200, 1, 2020, 'Slot2 revenue', 'p2');

    const key2 = 'studio-magnate-ledger:default:slot2';
    const raw2 = (globalThis as any).window.localStorage.getItem(key2);
    expect(raw2).toBeTypeOf('string');

    const parsed1 = JSON.parse(raw1!) as any;
    const parsed2 = JSON.parse(raw2!) as any;

    expect(parsed1.transactions.length).toBe(1);
    expect(parsed1.transactions[0].description).toBe('Slot1 revenue');

    expect(parsed2.transactions.length).toBe(1);
    expect(parsed2.transactions[0].description).toBe('Slot2 revenue');
  });
});
