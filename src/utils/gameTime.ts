export function triggerDateFromWeekYear(year: number, week: number): Date {
  return new Date(Date.UTC(year, 0, 1 + Math.max(0, week - 1) * 7));
}
