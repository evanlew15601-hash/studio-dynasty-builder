import { isTauriRuntime } from '@/integrations/tauri/saves';

export type WindowSizePresetId =
  | 'auto'
  | '1024x768'
  | '1280x720'
  | '1280x800'
  | '1366x768'
  | '1440x900'
  | '1600x900'
  | '1920x1080'
  | '2560x1440';

export type WindowSizePreset = {
  id: WindowSizePresetId;
  label: string;
  width?: number;
  height?: number;
};

export const WINDOW_SIZE_PRESETS: WindowSizePreset[] = [
  { id: 'auto', label: 'Auto (don\'t force)' },
  { id: '1024x768', label: '1024 × 768 (XGA)', width: 1024, height: 768 },
  { id: '1280x720', label: '1280 × 720 (HD)', width: 1280, height: 720 },
  { id: '1280x800', label: '1280 × 800 (WXGA / Handheld)', width: 1280, height: 800 },
  { id: '1366x768', label: '1366 × 768 (Laptop)', width: 1366, height: 768 },
  { id: '1440x900', label: '1440 × 900 (MacBook)', width: 1440, height: 900 },
  { id: '1600x900', label: '1600 × 900 (HD+)', width: 1600, height: 900 },
  { id: '1920x1080', label: '1920 × 1080 (Full HD)', width: 1920, height: 1080 },
  { id: '2560x1440', label: '2560 × 1440 (QHD)', width: 2560, height: 1440 },
];

const STORAGE_KEY = 'studio-magnate-window-size';

export function normalizeWindowSizePresetId(raw: string | null | undefined): WindowSizePresetId {
  const v = (raw ?? '').trim() as WindowSizePresetId;
  if (WINDOW_SIZE_PRESETS.some((p) => p.id === v)) return v;
  return 'auto';
}

export function getStoredWindowSizePresetId(): WindowSizePresetId {
  if (typeof window === 'undefined') return 'auto';
  return normalizeWindowSizePresetId(window.localStorage.getItem(STORAGE_KEY));
}

export function setStoredWindowSizePresetId(id: WindowSizePresetId) {
  if (typeof window === 'undefined') return;

  if (id === 'auto') {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, id);
}

export async function applyStoredWindowSizePreset(): Promise<void> {
  if (!isTauriRuntime()) return;

  const presetId = getStoredWindowSizePresetId();
  if (presetId === 'auto') return;

  await applyWindowSizePreset(presetId);
}

export async function applyWindowSizePreset(presetId: WindowSizePresetId): Promise<void> {
  if (!isTauriRuntime()) return;

  const preset = WINDOW_SIZE_PRESETS.find((p) => p.id === presetId);
  if (!preset?.width || !preset?.height) return;

  const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
  await getCurrentWindow().setSize(new LogicalSize(preset.width, preset.height));
}
