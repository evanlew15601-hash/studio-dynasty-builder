import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { attemptChunkLoadRecovery, buildCacheBustedUrl, isChunkLoadErrorMessage } from '@/utils/chunkLoadRecovery';

describe('chunkLoadRecovery', () => {
  it('detects common chunk/module import error messages', () => {
    expect(isChunkLoadErrorMessage('Importing a module script failed.')).toBe(true);
    expect(isChunkLoadErrorMessage('Failed to fetch dynamically imported module: https://x/y.js')).toBe(true);
    expect(isChunkLoadErrorMessage('Error loading dynamically imported module: /assets/chunk.js')).toBe(true);
    expect(isChunkLoadErrorMessage('Something else')).toBe(false);
  });

  it('adds a cache-busting query param', () => {
    expect(buildCacheBustedUrl('https://example.com/app', '123')).toBe('https://example.com/app?__sm_reload=123');
    expect(buildCacheBustedUrl('https://example.com/app?x=1', '123')).toBe('https://example.com/app?x=1&__sm_reload=123');
  });

  describe('attemptChunkLoadRecovery', () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
      (globalThis as any).window = originalWindow;
      vi.restoreAllMocks();
    });

    beforeEach(() => {
      const store = new Map<string, string>();

      (globalThis as any).window = {
        sessionStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => {
            store.set(key, value);
          },
        },
        location: {
          href: 'https://example.com/app',
          replace: vi.fn(),
        },
        addEventListener: vi.fn(),
      };
    });

    it('replaces location once per session', () => {
      const didAttempt = attemptChunkLoadRecovery({ maxAttemptsPerSession: 1 });
      expect(didAttempt).toBe(true);

      const didAttemptAgain = attemptChunkLoadRecovery({ maxAttemptsPerSession: 1 });
      expect(didAttemptAgain).toBe(false);

      const replace = (globalThis.window as any).location.replace as ReturnType<typeof vi.fn>;
      expect(replace).toHaveBeenCalledTimes(1);

      const firstUrl = replace.mock.calls[0][0];
      expect(String(firstUrl)).toContain('__sm_reload=');
    });
  });
});
