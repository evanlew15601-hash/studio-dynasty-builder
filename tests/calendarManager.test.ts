import { afterEach, describe, expect, it } from 'vitest';
import { CalendarManager } from '@/components/game/CalendarManager';
import type { Project } from '@/types/game';

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

  it('allows near-term releases once marketing is complete (or will complete before release)', () => {
    const projects: Project[] = [
      {
        id: 'film-1',
        title: 'Film 1',
        marketingCampaign: {
          id: 'campaign-1',
          strategy: {} as any,
          budgetAllocated: 0,
          budgetSpent: 0,
          duration: 8,
          weeksRemaining: 2,
          activities: [],
          buzz: 0,
          targetAudience: [],
          effectiveness: 0,
        },
      } as unknown as Project,
    ];

    // Only 1 week away should be rejected because the campaign still has 2 weeks remaining
    const tooSoon = CalendarManager.validateRelease('film-1', 11, 2024, baseTime, projects);
    expect(tooSoon.canRelease).toBe(false);
    expect(tooSoon.reason).toBe('Release must be at least 2 weeks away to complete marketing');

    // 2 weeks away is allowed (campaign will complete)
    const ok = CalendarManager.validateRelease('film-1', 12, 2024, baseTime, projects);
    expect(ok.canRelease).toBe(true);

    // If marketing is complete, next-week releases are allowed
    const completed = CalendarManager.validateRelease(
      'film-1',
      11,
      2024,
      baseTime,
      [
        {
          ...projects[0],
          marketingCampaign: {
            ...projects[0].marketingCampaign!,
            weeksRemaining: 0,
          },
        } as unknown as Project,
      ]
    );
    expect(completed.canRelease).toBe(true);
  });

  it('rejects conflicting releases scheduled for the same week', () => {
    const projects: Project[] = [
      {
        id: 'film-a',
        title: 'Film A',
        scheduledReleaseWeek: 15,
        scheduledReleaseYear: 2024,
      } as unknown as Project,
    ];

    const result = CalendarManager.validateRelease('film-b', 15, 2024, baseTime, projects);
    expect(result.canRelease).toBe(false);
    expect(result.reason).toBe('Another film is already scheduled for this week');
  });

  it('includes CalendarManager.scheduleRelease events when no project list is provided', () => {
    CalendarManager.scheduleRelease('film-a', 'Film A', 16, 2024);

    const upcoming = CalendarManager.getUpcomingEvents(baseTime, 8);
    expect(upcoming.some(e => e.type === 'release' && e.filmId === 'film-a' && e.week === 16 && e.year === 2024)).toBe(true);

    const validation = CalendarManager.validateRelease('film-b', 16, 2024, baseTime);
    expect(validation.canRelease).toBe(false);
    expect(validation.reason).toBe('Another film is already scheduled for this week');
  });
});
