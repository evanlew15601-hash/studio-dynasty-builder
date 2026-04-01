import { isVerboseLoggingEnabled } from '@/utils/debugFlags';

type LogArgs = any[];

export function logDebug(...args: LogArgs): void {
  if (!isVerboseLoggingEnabled()) return;
  console.debug(...args);
}

export function logInfo(...args: LogArgs): void {
  if (!isVerboseLoggingEnabled()) return;
  console.info(...args);
}

export function logWarn(...args: LogArgs): void {
  console.warn(...args);
}

export function logError(...args: LogArgs): void {
  console.error(...args);
}

export function logDebugLazy(factory: () => LogArgs): void {
  if (!isVerboseLoggingEnabled()) return;
  console.debug(...factory());
}

export function logInfoLazy(factory: () => LogArgs): void {
  if (!isVerboseLoggingEnabled()) return;
  console.info(...factory());
}
