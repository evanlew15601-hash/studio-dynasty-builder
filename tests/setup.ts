import { vi } from 'vitest';

// Only apply DOM-specific setup when running in jsdom.
if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');

  // Radix UI components (Select/Popover/etc) rely on these browser APIs.
  if (!('ResizeObserver' in window)) {
    (window as any).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!('matchMedia' in window)) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  }
}
