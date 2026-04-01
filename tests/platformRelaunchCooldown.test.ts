import { describe, expect, it } from 'vitest';
import { getPlatformRelaunchWindow } from '@/utils/platformRelaunch';

describe('platform relaunch cooldown', () => {
  it('blocks relaunch until the cooldown has elapsed', () => {
    const player: any = {
      id: 'player-platform:studio-1',
      name: 'TestFlix',
      status: 'shutdown',
      closedWeek: 10,
      closedYear: 2027,
      subscribers: 0,
      cash: 0,
    };

    const tooSoon = getPlatformRelaunchWindow({ player, currentWeek: 20, currentYear: 2027, cooldownWeeks: 26 });
    expect(tooSoon.canRelaunch).toBe(false);
    expect(tooSoon.weeksRemaining).toBeGreaterThan(0);

    const later = getPlatformRelaunchWindow({ player, currentWeek: 40, currentYear: 2027, cooldownWeeks: 26 });
    expect(later.canRelaunch).toBe(true);
    expect(later.weeksRemaining).toBe(0);
  });

  it('allows relaunch when closure time is unknown (legacy saves)', () => {
    const player: any = {
      id: 'player-platform:studio-1',
      name: 'TestFlix',
      status: 'sold',
      subscribers: 0,
      cash: 0,
    };

    const res = getPlatformRelaunchWindow({ player, currentWeek: 1, currentYear: 2030 });
    expect(res.canRelaunch).toBe(true);
    expect(res.weeksRemaining).toBe(0);
  });
});
