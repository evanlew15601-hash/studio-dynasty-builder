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
    console.log(`=== WEEKS CALCULATION DEBUG ===`);
    console.log(`Input: Release Y${releaseYear}W${releaseWeek} → Current Y${currentYear}W${currentWeek}`);
    
    if (releaseYear > currentYear) {
      console.log(`Future release detected, returning 0`);
      return 0;
    }
    
    if (releaseYear === currentYear) {
      // Same year - simple subtraction + 1 (release week counts as week 1)
      const weeks = currentWeek - releaseWeek + 1;
      console.log(`SAME YEAR: ${currentWeek} - ${releaseWeek} + 1 = ${weeks}`);
      const result = Math.max(1, weeks);
      console.log(`Final same year result: ${result}`);
      return result;
    } else {
      // Different years - calculate across year boundary
      console.log(`CROSS-YEAR CALCULATION:`);
      
      // How many weeks left in the release year (including release week)
      const weeksLeftInReleaseYear = 52 - releaseWeek + 1;
      console.log(`  Weeks left in release year Y${releaseYear}: 52 - ${releaseWeek} + 1 = ${weeksLeftInReleaseYear}`);
      
      // How many full years between release year and current year
      const yearsBetween = currentYear - releaseYear - 1;
      const fullYearsBetween = Math.max(0, yearsBetween) * 52;
      console.log(`  Years between: ${currentYear} - ${releaseYear} - 1 = ${yearsBetween}`);
      console.log(`  Full weeks from years between: ${fullYearsBetween}`);
      
      // How many weeks into current year
      const weeksInCurrentYear = currentWeek;
      console.log(`  Weeks in current year Y${currentYear}: ${weeksInCurrentYear}`);
      
      const total = weeksLeftInReleaseYear + fullYearsBetween + weeksInCurrentYear;
      console.log(`  TOTAL: ${weeksLeftInReleaseYear} + ${fullYearsBetween} + ${weeksInCurrentYear} = ${total}`);
      console.log(`=== END WEEKS CALCULATION ===`);
      
      return total;
    }
  }

  static getWeekOfYear(week: number): number {
    return Math.max(1, Math.min(52, week));
  }
}