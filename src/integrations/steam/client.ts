import { isTauriRuntime } from '@/integrations/tauri/saves';

async function invokeSteam<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<T>(cmd, args);
}

let steamAvailablePromise: Promise<boolean> | null = null;

export async function isSteamAvailable(): Promise<boolean> {
  if (!isTauriRuntime()) return false;

  if (!steamAvailablePromise) {
    steamAvailablePromise = invokeSteam<boolean>('steam_is_available').catch(() => false);
  }

  return await steamAvailablePromise;
}

export async function getSteamPersonaName(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  if (!(await isSteamAvailable())) return null;

  try {
    return await invokeSteam<string>('steam_get_persona_name');
  } catch {
    return null;
  }
}

export async function isSteamDlcInstalled(dlcAppId: number): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  if (!(await isSteamAvailable())) return false;

  try {
    return await invokeSteam<boolean>('steam_is_dlc_installed', { dlcAppId });
  } catch {
    return false;
  }
}

export async function unlockSteamAchievement(apiName: string): Promise<void> {
  if (!isTauriRuntime()) return;
  if (!(await isSteamAvailable())) return;

  await invokeSteam<void>('steam_unlock_achievement', { apiName });
}

export async function openSteamOverlay(dialog: string): Promise<void> {
  if (!isTauriRuntime()) return;
  if (!(await isSteamAvailable())) return;

  await invokeSteam<void>('steam_open_overlay', { dialog });
}

export async function openSteamStoreOverlay(appId: number): Promise<void> {
  if (!isTauriRuntime()) return;
  if (!(await isSteamAvailable())) return;

  await invokeSteam<void>('steam_open_store_overlay', { appId });
}
