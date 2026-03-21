import type { PlayerPlatformState } from '@/types/platformEconomy';

export const PLATFORM_RELAUNCH_COOLDOWN_WEEKS = 26;

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

export function getPlatformRelaunchWindow(params: {
  player: PlayerPlatformState | undefined;
  currentWeek: number;
  currentYear: number;
  cooldownWeeks?: number;
}): { canRelaunch: boolean; weeksRemaining: number } {
  const { player, currentWeek, currentYear, cooldownWeeks } = params;

  if (!player) return { canRelaunch: false, weeksRemaining: 0 };
  if (player.status === 'active') return { canRelaunch: false, weeksRemaining: 0 };

  const cd = typeof cooldownWeeks === 'number' ? Math.max(0, Math.floor(cooldownWeeks)) : PLATFORM_RELAUNCH_COOLDOWN_WEEKS;

  const closedWeek = player.closedWeek;
  const closedYear = player.closedYear;

  // Legacy saves: if we don't know when the platform closed, allow relaunch.
  if (typeof closedWeek !== 'number' || typeof closedYear !== 'number') {
    return { canRelaunch: true, weeksRemaining: 0 };
  }

  const eligibleAbs = absWeek(closedWeek, closedYear) + cd;
  const currentAbs = absWeek(currentWeek, currentYear);

  if (currentAbs >= eligibleAbs) return { canRelaunch: true, weeksRemaining: 0 };

  return { canRelaunch: false, weeksRemaining: Math.max(0, eligibleAbs - currentAbs) };
}
