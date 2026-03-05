import type { GameState } from '@/types/game';
import type { TickResult } from '@/game/core/types';

type AdvanceWeekRequest = {
  id: number;
  type: 'advanceWeek';
  state: GameState;
  rngState: number;
  debug?: boolean;
};

type AdvanceWeekResponse = {
  id: number;
  type: 'advanceWeekResult';
  result: TickResult;
  rngState: number;
};

let worker: Worker | null = null;
let nextId = 1;

const pending = new Map<
  number,
  {
    resolve: (value: { result: TickResult; rngState: number }) => void;
    reject: (reason?: unknown) => void;
  }
>();

function getWorker(): Worker {
  if (worker) return worker;

  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers are not supported in this environment');
  }

  worker = new Worker(new URL('./tickWorker.ts', import.meta.url), {
    type: 'module',
  });

  worker.onmessage = (event: MessageEvent<AdvanceWeekResponse>) => {
    const msg = event.data;
    if (msg.type !== 'advanceWeekResult') return;

    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);

    entry.resolve({ result: msg.result, rngState: msg.rngState });
  };

  worker.onerror = (err) => {
    pending.forEach((p) => p.reject(err));
    pending.clear();
  };

  return worker;
}

export function advanceWeekInWorker(
  state: GameState,
  rngState: number,
  options?: { debug?: boolean }
): Promise<{ result: TickResult; rngState: number }> {
  const w = getWorker();
  const id = nextId++;

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });

    const req: AdvanceWeekRequest = {
      id,
      type: 'advanceWeek',
      state,
      rngState,
      debug: options?.debug,
    };

    w.postMessage(req);
  });
}
