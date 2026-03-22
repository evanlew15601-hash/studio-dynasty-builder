import { isVerboseLoggingEnabled } from '@/utils/debugFlags';

export function applyProductionConsolePolicy(): void {
  if (!import.meta.env.PROD) return;
  if (isVerboseLoggingEnabled()) return;

  const noop = () => {};
  const c = console as unknown as {
    log: (...args: any[]) => void;
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    warn: (...args: any[]) => void;
  };

  c.log = noop;
  c.info = noop;
  c.debug = noop;
  c.warn = noop;
}
