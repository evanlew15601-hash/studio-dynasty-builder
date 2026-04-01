const RECOVERY_SESSION_KEY = 'sm:chunk-load-recovery-attempts';

export function isChunkLoadErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('importing a module script failed') ||
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('error loading dynamically imported module') ||
    normalized.includes('import() failed') ||
    (normalized.includes('loading chunk') && normalized.includes('failed'))
  );
}

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message = 'message' in error && typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : '';

  return isChunkLoadErrorMessage(message);
}

export function buildCacheBustedUrl(href: string, token: string = String(Date.now())): string {
  const url = new URL(href);
  url.searchParams.set('__sm_reload', token);
  return url.toString();
}

export function attemptChunkLoadRecovery(options?: { maxAttemptsPerSession?: number }): boolean {
  if (typeof window === 'undefined') return false;

  const maxAttemptsPerSession = options?.maxAttemptsPerSession ?? 1;
  let attempts = 0;

  try {
    attempts = Number(window.sessionStorage.getItem(RECOVERY_SESSION_KEY) || '0');
  } catch {
    attempts = 0;
  }

  if (attempts >= maxAttemptsPerSession) {
    return false;
  }

  try {
    window.sessionStorage.setItem(RECOVERY_SESSION_KEY, String(attempts + 1));
  } catch {
    // Ignore session storage failures (private mode / storage disabled).
  }

  const href = (() => {
    try {
      return buildCacheBustedUrl(window.location.href);
    } catch {
      return window.location.href;
    }
  })();

  window.location.replace(href);
  return true;
}

export function installVitePreloadErrorHandler(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('vite:preloadError', (event) => {
    const didAttempt = attemptChunkLoadRecovery({ maxAttemptsPerSession: 1 });
    if (didAttempt) {
      event.preventDefault();
    }
  });
}
