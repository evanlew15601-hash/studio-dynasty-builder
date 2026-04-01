/**
 * GameStorage abstraction — decouples persistence from localStorage.
 *
 * Implementations:
 * - BrowserStorage: localStorage (current, web-only)
 * - TauriStorage: filesystem via Tauri APIs (future, desktop)
 */

export interface GameStorage {
  readText(path: string): Promise<string | null>;
  writeText(path: string, data: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  listDir(path: string): Promise<string[]>;
  remove(path: string): Promise<void>;
}

/**
 * localStorage-backed storage (current implementation).
 * Uses path as localStorage key prefix.
 */
export class BrowserStorage implements GameStorage {
  private prefix: string;

  constructor(prefix = 'studio-magnate-') {
    this.prefix = prefix;
  }

  private key(path: string): string {
    return `${this.prefix}${path}`;
  }

  async readText(path: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(this.key(path));
    } catch {
      return null;
    }
  }

  async writeText(path: string, data: string): Promise<void> {
    try {
      window.localStorage.setItem(this.key(path), data);
    } catch (e) {
      console.error(`BrowserStorage: failed to write "${path}"`, e);
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      return window.localStorage.getItem(this.key(path)) !== null;
    } catch {
      return false;
    }
  }

  async listDir(path: string): Promise<string[]> {
    const prefix = this.key(path);
    const keys: string[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keys.push(k.slice(this.prefix.length));
        }
      }
    } catch {
      // ignore
    }
    return keys;
  }

  async remove(path: string): Promise<void> {
    try {
      window.localStorage.removeItem(this.key(path));
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Default storage instance
// ---------------------------------------------------------------------------

let defaultStorage: GameStorage | null = null;

export function getDefaultStorage(): GameStorage {
  if (!defaultStorage) {
    defaultStorage = new BrowserStorage();
  }
  return defaultStorage;
}

export function setDefaultStorage(storage: GameStorage): void {
  defaultStorage = storage;
}
