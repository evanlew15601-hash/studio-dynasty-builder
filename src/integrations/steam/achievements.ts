import { unlockSteamAchievement } from './client';

function toDefaultSteamApiName(id: string): string {
  return `ACH_${id.toUpperCase().replace(/-/g, '_')}`;
}

export async function unlockSteamAchievementForInGameId(id: string): Promise<void> {
  const candidates = [toDefaultSteamApiName(id), id];

  for (const apiName of candidates) {
    try {
      await unlockSteamAchievement(apiName);
      return;
    } catch {
      // try next candidate
    }
  }
}
