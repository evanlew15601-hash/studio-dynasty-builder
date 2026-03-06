/// <reference lib="webworker" />

import type { GameState } from '@/types/game';
import type { TickResult } from '@/game/core/types';
import { createRng } from '@/game/core/rng';
import { advanceWeek } from '@/game/core/tick';

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

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<AdvanceWeekRequest>) => {
  const msg = event.data;
  if (msg.type !== 'advanceWeek') return;

  const rng = createRng(msg.rngState);

  // Worker currently only supports the core tick (time step) because we
  // cannot transfer functions (tick systems) across the worker boundary.
  const result = advanceWeek(msg.state, rng, [], { debug: msg.debug });

  const response: AdvanceWeekResponse = {
    id: msg.id,
    type: 'advanceWeekResult',
    result,
    rngState: rng.state,
  };

  self.postMessage(response);
};
