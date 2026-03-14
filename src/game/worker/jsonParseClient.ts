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

let worker: Worker | null = null;
let nextId = 1;

const pending = new Map<
  number,
  {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }
>();

function getWorker(): Worker {
  if (worker) return worker;

  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers are not supported in this environment');
  }

  worker = new Worker(new URL('./jsonParseWorker.ts', import.meta.url), {
    type: 'module',
  });

  worker.onmessage = (event: MessageEvent<ParseResponse>) => {
    const msg = event.data;

    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);

    if (msg.type === 'parseJsonResult') {
      entry.resolve(msg.value);
      return;
    }

    entry.reject(new Error(msg.error));
  };

  worker.onerror = (err) => {
    pending.forEach((p) => p.reject(err));
    pending.clear();
  };

  return worker;
}

export function parseJsonInWorker<T>(raw: string): Promise<T> {
  const w = getWorker();
  const id = nextId++;

  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as any, reject });

    const req: ParseRequest = {
      id,
      type: 'parseJson',
      raw,
    };

    w.postMessage(req);
  });
}
