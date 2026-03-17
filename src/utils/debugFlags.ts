export function isDebugUiEnabled(): boolean {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return false;
  return window.localStorage.getItem('studio-magnate-debug-ui') === '1';
}

export function isVerboseLoggingEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return false;
  return window.localStorage.getItem('studio-magnate-verbose-logs') === '1';
}
