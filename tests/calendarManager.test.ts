import { afterEach, describe, expect, it } from 'vitest';
import { CalendarManager } from '@/components/game/CalendarManager';

const baseTime = { currentWeek: 10, currentYear: 2024, currentQuarter: 1 };

describe('CalendarManager.validateRelease', () => {
  afterEach(() => {
    CalendarManager.clearAllEvents();
  });

  it('rejects release dates that are not in the future', () => {
    const result = CalendarManager.validateRelease('film-1', 10, 2024, baseTime);
    expect(result.canRelease).toBe(false);
    expect(result.reason).toBe('Release date must be in the future');

    const past = CalendarManager.validateRelease('film-1', 9, 2024, baseTime);
    expect(past.canRelease).toBe(false);
    expect(past.reason).toBe('Release date must be in the future');
  });

  it('enforces minimum 4-week marketing lead time', () => {
    const result = CalendarManager.validateRelease('film-1', 12, 2024, baseTime);
    expect(result.canRelease).toBe(false);
    expect(result.reason).toBe('Need at least 4 weeks for marketing campaign');
    expect(result.recommendedWeek).toBe(14);
    expect(result.recommendedYear).toBe(2024);
  });

  it('rejects conflicting releases scheduled for the same week', () => {
    CalendarManager.scheduleRelease('film-a', 'Film A', 15, 2024);

    const result = CalendarManager.validateRelease('film-b', 15, 2024, baseTime);
    expect(result.canRelease).toBe(false);
    expect(result.reason).toBe('Another film is already scheduled for this week');
  });
});
