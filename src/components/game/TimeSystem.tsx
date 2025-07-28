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
    
    console.log(`TIME ADVANCE: Week ${timeState.currentWeek} -> ${newWeek}, Year ${timeState.currentYear} -> ${newYear}`);
    
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
    if (releaseYear > currentYear) return 0; // Future release
    
    if (releaseYear === currentYear) {
      // Same year - simple subtraction
      const weeks = currentWeek - releaseWeek;
      console.log(`SAME YEAR CALC: ${currentWeek} - ${releaseWeek} = ${weeks}`);
      return Math.max(0, weeks);
    } else {
      // Different years - calculate across year boundary
      const weeksLeftInReleaseYear = Math.max(0, 52 - releaseWeek);
      const fullYearsBetween = Math.max(0, currentYear - releaseYear - 1) * 52;
      const weeksInCurrentYear = currentWeek;
      const total = weeksLeftInReleaseYear + fullYearsBetween + weeksInCurrentYear;
      
      console.log(`MULTI-YEAR CALC: Release Y${releaseYear}W${releaseWeek} to Y${currentYear}W${currentWeek} = ${total} weeks`);
      return total;
    }
  }

  static getWeekOfYear(week: number): number {
    return Math.max(1, Math.min(52, week));
  }
}