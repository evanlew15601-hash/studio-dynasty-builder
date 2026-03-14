/// <reference lib="webworker" />

type ParseRequest = {
  id: number;
  type: 'parseJson';
  raw: string;
};

type ParseResponse =
  | {
      id: number;
      type: 'parseJsonResult';
      value: unknown;
    }
  | {
      id: number;
      type: 'parseJsonError';
      error: string;
    };

declare const self: DedicatedWorkerGlobalScope;

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function maybePruneSaveSnapshot(parsed: any): any {
  // Defensive pruning for older saves that stored huge allReleases arrays.
  // This reduces the structured-clone cost when sending the snapshot back to the UI thread.
  try {
    const gameState = parsed?.gameState;
    if (!gameState) return parsed;

    const currentWeek = typeof gameState.currentWeek === 'number' ? gameState.currentWeek : 1;
    const currentYear = typeof gameState.currentYear === 'number' ? gameState.currentYear : 0;
    const currentAbs = absWeek(currentWeek, currentYear);

    const MAX_RELEASE_AGE_WEEKS = 156;
    const MAX_UNKNOWN_RELEASES = 500;

    const source = Array.isArray(gameState.allReleases) ? gameState.allReleases : [];
    const cutoffAbs = currentAbs - MAX_RELEASE_AGE_WEEKS;

    let unknownKept = 0;
    const seen = new Set<string>();
    const reversed: any[] = [];

    for (let i = source.length - 1; i >= 0; i -= 1) {
      const r: any = source[i];
      const y = typeof r?.releaseYear === 'number' ? r.releaseYear : (typeof r?.year === 'number' ? r.year : undefined);
      const w = typeof r?.releaseWeek === 'number' ? r.releaseWeek : (typeof r?.week === 'number' ? r.week : undefined);

      let keep = false;

      if (typeof y === 'number' && typeof w === 'number') {
        const rAbs = absWeek(w, y);
        keep = Number.isFinite(rAbs) && rAbs >= cutoffAbs;
      } else {
        keep = unknownKept < MAX_UNKNOWN_RELEASES;
        if (keep) unknownKept += 1;
      }

      if (!keep) continue;

      const key = (typeof r?.id === 'string' && r.id.length > 0)
        ? r.id
        : (typeof r?.projectId === 'string' && r.projectId.length > 0)
          ? r.projectId
          : '';

      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }

      reversed.push(r);
    }

    const nextAllReleases = reversed.reverse();

    return {
      ...parsed,
      gameState: {
        ...gameState,
        allReleases: nextAllReleases,
      },
    };
  } catch {
    return parsed;
  }
}

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const msg = event.data;
  if (msg.type !== 'parseJson') return;

  try {
    const parsed = JSON.parse(msg.raw);
    const pruned = maybePruneSaveSnapshot(parsed);

    const res: ParseResponse = {
      id: msg.id,
      type: 'parseJsonResult',
      value: pruned,
    };

    self.postMessage(res);
  } catch (e) {
    const res: ParseResponse = {
      id: msg.id,
      type: 'parseJsonError',
      error: e instanceof Error ? e.message : String(e),
    };

    self.postMessage(res);
  }
};
