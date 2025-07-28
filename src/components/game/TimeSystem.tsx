// Time Management System - Handles all time-based calculations
export interface TimeState {
  currentWeek: number;
  currentYear: number;
  currentQuarter: number;
}

export class TimeSystem {
  static advanceWeek(timeState: TimeState): TimeState {
    const newWeek = timeState.currentWeek >= 52 ? 1 : timeState.currentWeek + 1;
    const newYear = timeState.currentWeek >= 52 ? timeState.currentYear + 1 : timeState.currentYear;
    const newQuarter = Math.ceil(newWeek / 13);
    
    console.log(`TIME ADVANCE: Week ${timeState.currentWeek} Year ${timeState.currentYear} -> Week ${newWeek} Year ${newYear}`);
    
    return {
      currentWeek: newWeek,
      currentYear: newYear,
      currentQuarter: newQuarter
    };
  }

  static calculateWeeksSince(
    releaseWeek: number, 
    releaseYear: number, 
    currentWeek: number, 
    currentYear: number
  ): number {
    // Convert everything to absolute weeks since a reference point
    const releaseAbsoluteWeek = (releaseYear * 52) + releaseWeek;
    const currentAbsoluteWeek = (currentYear * 52) + currentWeek;
    
    // Calculate actual weeks that have passed since release
    const weeksSince = currentAbsoluteWeek - releaseAbsoluteWeek + 1;
    
    console.log(`WEEKS CALC: Y${releaseYear}W${releaseWeek} to Y${currentYear}W${currentWeek} = ${weeksSince} weeks`);
    
    // Only return positive values - if negative, the release hasn't happened yet
    return Math.max(0, weeksSince);
  }

  static getWeekOfYear(week: number): number {
    return Math.max(1, Math.min(52, week));
  }
}