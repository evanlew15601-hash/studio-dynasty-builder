import { describe, it, expect, beforeEach } from 'vitest';
import { CalendarManager } from '@/components/game/CalendarManager';

describe('CalendarManager.validateRelease', () => {
  beforeEach(() => {
    CalendarManager.clearAllEvents();
  });

  it('rejects release dates in the past', () => {
    const currentTime = { currentWeek: 10, currentYear: 2026, currentQuarter: 1 };
    const res = CalendarManager.validateRelease('film-1', 9, 2026, currentTime);
    expect(res.canRelease).toBe(false);
    expect(res.reason).toMatch(/future/i);
  });

  it('rejects release dates with less than 4 weeks lead time (and returns a recommended week/year)', () => {
    const currentTime = { currentWeek: 10, currentYear: 2026, currentQuarter: 1 };
    const res = CalendarManager.validateRelease('film-1', 12, 2026, currentTime);
    expect(res.canRelease).toBe(false);
    expect(res.reason).toMatch(/at least 4 weeks/i);
    expect(res.recommendedWeek).toBe(14);
    expect(res.recommendedYear).toBe(2026);
  });

  it('rejects conflicting release weeks', () => {
    const currentTime = { currentWeek: 10, currentYear: 2026, currentQuarter: 1 };
    CalendarManager.scheduleRelease('film-a', 'Film A', 20, 2026);

    const res = CalendarManager.validateRelease('film-b', 20, 2026, currentTime);
    expect(res.canRelease).toBe(false);
    expect(res.reason).toMatch(/already scheduled/i);
  });

  it('syncReleasesFromProjects hydrates conflicts from persisted projects', () => {
    const currentTime = { currentWeek: 10, currentYear: 2026, currentQuarter: 1 };

    CalendarManager.syncReleasesFromProjects([
      { id: 'film-a', title: 'Film A', status: 'scheduled-for-release', releaseWeek: 30, releaseYear: 2026 } as any,
    ]);

    const res = CalendarManager.validateRelease('film-b', 30, 2026, currentTime);
    expect(res.canRelease).toBe(false);
    expect(res.reason).toMatch(/already scheduled/i);
  });
});
