import { GameState, Project, PostTheatricalRelease } from '@/types/game';

export interface SaveGameMeta {
  savedAt: string;
  version: string;
  note?: string;
  /**
   * The UI phase/tab the player was viewing when saving.
   * Used to restore the UI context on load.
   */
  currentPhase?: string;
}

export interface SaveGameSnapshot {
  gameState: GameState;
  meta: SaveGameMeta;
  /**
   * Achievement IDs that were unlocked at the moment of saving.
   * This prevents double-rewarding when reloading.
   */
  unlockedAchievements?: string[];
}

const SAVE_KEY_PREFIX = 'studio-magnate-save-';
const CURRENT_SAVE_VERSION = 'alpha-1';

function reviveDateField(obj: any, key: string): void {
  if (!obj) return;
  const value = obj[key];
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      obj[key] = d;
    }
  }
}

function normalizeProjectDates(project: Project): void {
  // Timeline dates
  const timeline = project.timeline;
  if (timeline) {
    if (timeline.preProduction) {
      reviveDateField(timeline.preProduction, 'start');
      reviveDateField(timeline.preProduction, 'end');
    }
    if (timeline.principalPhotography) {
      reviveDateField(timeline.principalPhotography, 'start');
      reviveDateField(timeline.principalPhotography, 'end');
    }
    if (timeline.postProduction) {
      reviveDateField(timeline.postProduction, 'start');
      reviveDateField(timeline.postProduction, 'end');
    }
    if (timeline.release) {
      reviveDateField(timeline, 'release');
    }
    if (Array.isArray(timeline.milestones)) {
      timeline.milestones.forEach(milestone => reviveDateField(milestone, 'date'));
    }
  }

  // Distribution windows & special events
  const distribution = project.distributionStrategy;
  if (distribution && Array.isArray(distribution.windows)) {
    distribution.windows.forEach(window => reviveDateField(window, 'startDate'));
  }

  const releaseStrategy = project.releaseStrategy;
  if (releaseStrategy) {
    reviveDateField(releaseStrategy, 'premiereDate');
    if (Array.isArray(releaseStrategy.specialEvents)) {
      releaseStrategy.specialEvents.forEach(event => reviveDateField(event, 'date'));
    }
    if (releaseStrategy.pressStrategy) {
      reviveDateField(releaseStrategy.pressStrategy, 'embargoDate');
    }
  }

  // Theatrical end date
  reviveDateField(project, 'theatricalEndDate');

  // Post-theatrical releases
  if (Array.isArray(project.postTheatricalReleases)) {
    (project.postTheatricalReleases as PostTheatricalRelease[]).forEach(release => {
      reviveDateField(release, 'releaseDate');
    });
  }

  // Optional explicit releaseDate field
  reviveDateField(project, 'releaseDate');
}

function normalizeGameStateDates(gameState: GameState): void {
  // Normalize player projects
  if (Array.isArray(gameState.projects)) {
    gameState.projects.forEach(project => normalizeProjectDates(project));
  }

  // Normalize AI releases stored as full Project objects
  if (Array.isArray(gameState.allReleases)) {
    gameState.allReleases.forEach(release => {
      // BoxOfficeRelease entries don't have scripts; guard with type check
      if ((release as Project).script) {
        normalizeProjectDates(release as Project);
      }
    });
  }

  // Normalize queued game events
  if (Array.isArray(gameState.eventQueue)) {
    gameState.eventQueue.forEach(event => reviveDateField(event, 'triggerDate'));
  }
}

/**
 * Persist a game snapshot to localStorage.
 * Uses a simple slot-based scheme: studio-magnate-save-{slotId}
 */
export function saveGame(
  slotId: string,
  gameState: GameState,
  options?: {
    note?: string;
    currentPhase?: string;
    unlockedAchievementIds?: string[];
  }
): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  const snapshot: SaveGameSnapshot = {
    gameState,
    meta: {
      savedAt: new Date().toISOString(),
      version: CURRENT_SAVE_VERSION,
      note: options?.note,
      currentPhase: options?.currentPhase,
    },
    unlockedAchievements: options?.unlockedAchievementIds,
  };

  try {
    const key = `${SAVE_KEY_PREFIX}${slotId}`;
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Failed to save game snapshot', error);
  }
}

/**
 * Load a previously saved game snapshot from localStorage.
 * Returns null if no save is present or parsing fails.
 */
export function loadGame(slotId: string): SaveGameSnapshot | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  try {
    const key = `${SAVE_KEY_PREFIX}${slotId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SaveGameSnapshot;

    // Basic shape check
    if (!parsed || !parsed.gameState || !parsed.meta) {
      return null;
    }

    // Normalize any serialized date fields back into Date instances
    try {
      normalizeGameStateDates(parsed.gameState);
    } catch (normalizationError) {
      console.warn('Partial failure normalizing savegame dates', normalizationError);
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load game snapshot', error);
    return null;
  }
}