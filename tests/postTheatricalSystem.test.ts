import { describe, expect, it, beforeEach } from 'vitest';
import { PostTheatricalSystem } from '@/components/game/PostTheatricalSystem';
import { FinancialEngine } from '@/components/game/FinancialEngine';
import type { Project } from '@/types/game';

const makeProject = (): Project =>
  ({
    id: 'film-1',
    title: 'Film 1',
    postTheatricalReleases: [
      {
        id: 'ptr-1',
        projectId: 'film-1',
        platform: 'streaming',
        releaseDate: new Date('2024-01-01'),
        revenue: 0,
        weeklyRevenue: 1000,
        weeksActive: 0,
        status: 'planned',
        cost: 0,
        durationWeeks: 2,
      },
      {
        id: 'ptr-2',
        projectId: 'film-1',
        platform: 'digital',
        releaseDate: new Date('2024-01-01'),
        revenue: 500,
        weeklyRevenue: 500,
        weeksActive: 1,
        status: 'active',
        cost: 0,
        durationWeeks: 2,
      },
    ],
  } as unknown as Project);

describe('PostTheatricalSystem.processWeeklyRevenue', () => {
  beforeEach(() => {
    FinancialEngine.clearLedger();
  });

  it('updates post-theatrical revenue and records ledger entries by platform category', () => {
    const project = makeProject();

    const result = PostTheatricalSystem.processWeeklyRevenue(project, 10, 2024, false);

    expect(result.revenueDelta).toBe(1500);

    const financials = FinancialEngine.getFilmFinancials('film-1');
    expect(financials.revenue).toBe(1500);

    expect(
      financials.transactions.some(
        (t) =>
          t.type === 'revenue' &&
          t.category === 'streaming' &&
          t.week === 10 &&
          t.year === 2024 &&
          t.description === 'Post-theatrical - streaming' &&
          t.amount === 1000
      )
    ).toBe(true);

    expect(
      financials.transactions.some(
        (t) =>
          t.type === 'revenue' &&
          t.category === 'licensing' &&
          t.week === 10 &&
          t.year === 2024 &&
          t.description === 'Post-theatrical - digital' &&
          t.amount === 500
      )
    ).toBe(true);

    // Releases should be marked processed for the week.
    const updated = result.project.postTheatricalReleases!;
    expect(updated[0].lastProcessedWeek).toBe(10);
    expect(updated[0].lastProcessedYear).toBe(2024);
  });

  it('is idempotent within the same week/year (no double revenue or double ledger entries)', () => {
    const project = makeProject();

    const first = PostTheatricalSystem.processWeeklyRevenue(project, 10, 2024, false);
    const second = PostTheatricalSystem.processWeeklyRevenue(first.project, 10, 2024, false);

    expect(first.revenueDelta).toBe(1500);
    expect(second.revenueDelta).toBe(0);

    const financials = FinancialEngine.getFilmFinancials('film-1');
    expect(financials.revenue).toBe(1500);
    expect(financials.transactions.filter(t => t.week === 10 && t.year === 2024).length).toBe(2);
  });

  it('does not start a planned release before its scheduled game week', () => {
    const project = makeProject();

    // Schedule the streaming window for the future.
    project.postTheatricalReleases![0].releaseWeek = 20;
    project.postTheatricalReleases![0].releaseYear = 2024;

    const early = PostTheatricalSystem.processWeeklyRevenue(project, 10, 2024, false);
    expect(early.revenueDelta).toBe(500); // only the already-active digital window

    // When we reach the scheduled week, the planned release should start.
    const onTime = PostTheatricalSystem.processWeeklyRevenue(early.project, 20, 2024, false);
    expect(onTime.revenueDelta).toBe(1500);
  });
});
