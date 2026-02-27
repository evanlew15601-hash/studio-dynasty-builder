// Unified Calendar Management System - Single source of truth for all game time
import type { Project } from '@/types/game';
import { TimeState, TimeSystem } from './TimeSystem';
import { getEarliestEligibleShowForRelease, isWithinAwardCooldown } from '@/data/AwardsSchedule';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'release' | 'awards' | 'marketing' | 'production' | 'deadline';
  week: number;
  year: number;
  filmId?: string;
}

export interface CalendarValidation {
  canRelease: boolean;
  reason?: string;
  recommendedWeek?: number;
  recommendedYear?: number;
  awardEligibility?: string;
}

export class CalendarManager {
  private static events: CalendarEvent[] = [];
  
  static isAwardsSeason(week: number): boolean {
    // Awards season: weeks 1-12 (Jan-March) and weeks 44-52 (Nov-Dec)
    return (week >= 1 && week <= 12) || (week >= 44 && week <= 52);
  }
  
  static isOptimalReleaseWeek(week: number): boolean {
    // Summer blockbuster season (weeks 20-35) and holiday season (weeks 47-52)
    return (week >= 20 && week <= 35) || (week >= 47 && week <= 52);
  }
  
  static validateRelease(filmId: string, targetWeek: number, targetYear: number, currentTime: TimeState): CalendarValidation {
    const safeTargetWeek = TimeSystem.getWeekOfYear(targetWeek);

    const currentAbsWeek = (currentTime.currentYear * 52) + currentTime.currentWeek;
    const targetAbsWeek = (targetYear * 52) + safeTargetWeek;
    const weeksUntil = targetAbsWeek - currentAbsWeek;

    // Must be in the future
    if (weeksUntil <= 0) {
      return {
        canRelease: false,
        reason: 'Release date must be in the future',
      };
    }

    // Need at least 4 weeks for marketing
    if (weeksUntil < 4) {
      let recommendedWeek = currentTime.currentWeek + 4;
      let recommendedYear = currentTime.currentYear;
      if (recommendedWeek > 52) {
        recommendedWeek -= 52;
        recommendedYear += 1;
      }

      return {
        canRelease: false,
        reason: 'Need at least 4 weeks for marketing campaign',
        recommendedWeek,
        recommendedYear,
      };
    }

    // Check for conflicts with other releases
    const conflictingRelease = this.events.find(event => 
      event.type === 'release' && 
      event.week === safeTargetWeek && 
      event.year === targetYear &&
      event.filmId !== filmId
    );

    if (conflictingRelease) {
      return {
        canRelease: false,
        reason: 'Another film is already scheduled for this week'
      };
    }

    // Awards show cooldown and eligibility checks
    const cooldown = isWithinAwardCooldown(safeTargetWeek, targetYear);
    if (cooldown.within) {
      let recommendedWeek = cooldown.show!.ceremonyWeek + cooldown.show!.cooldownWeeks;
      let recommendedYear = targetYear;
      while (recommendedWeek > 52) {
        recommendedWeek -= 52;
        recommendedYear += 1;
      }
      return {
        canRelease: false,
        reason: `Release falls within ${cooldown.show!.name} cooldown period (weeks ${cooldown.show!.ceremonyWeek}-${cooldown.show!.ceremonyWeek + cooldown.show!.cooldownWeeks - 1})`,
        recommendedWeek,
        recommendedYear,
      };
    }

    const qualifiesFor = getEarliestEligibleShowForRelease(safeTargetWeek, targetYear);
    const awardEligibility = qualifiesFor 
      ? `Qualifies for ${qualifiesFor.name} Awards (ceremony week ${qualifiesFor.ceremonyWeek})`
      : "Does not qualify for current year's award shows";

    return { 
      canRelease: true,
      awardEligibility
    };
  }
  
  static scheduleRelease(filmId: string, title: string, week: number, year: number): boolean {
    const safeWeek = TimeSystem.getWeekOfYear(week);
    const eventId = `release-${filmId}-${year}-${safeWeek}`;
    
    // Remove any existing release for this film
    this.events = this.events.filter(event => 
      !(event.type === 'release' && event.filmId === filmId)
    );
    
    // Add new release event
    this.events.push({
      id: eventId,
      title: `Release: ${title}`,
      type: 'release',
      week: safeWeek,
      year,
      filmId
    });
    
    console.log(`CALENDAR: Scheduled release for ${title} on Y${year}W${safeWeek}`);
    return true;
  }
  
  static getUpcomingEvents(currentTime: TimeState, weeksAhead: number = 8): CalendarEvent[] {
    const currentAbsoluteWeek = (currentTime.currentYear * 52) + currentTime.currentWeek;
    const cutoffWeek = currentAbsoluteWeek + weeksAhead;
    
    return this.events
      .filter(event => {
        const eventAbsoluteWeek = (event.year * 52) + event.week;
        return eventAbsoluteWeek >= currentAbsoluteWeek && eventAbsoluteWeek <= cutoffWeek;
      })
      .sort((a, b) => {
        const aWeek = (a.year * 52) + a.week;
        const bWeek = (b.year * 52) + b.week;
        return aWeek - bWeek;
      });
  }
  
  static getOptimalReleaseWindows(currentTime: TimeState): { week: number; year: number; reason: string }[] {
    const windows = [];
    const startWeek = currentTime.currentWeek + 4; // Minimum 4 weeks for marketing
    
    for (let i = 0; i < 26; i++) { // Look ahead 6 months
      let week = startWeek + i;
      let year = currentTime.currentYear;
      
      if (week > 52) {
        week -= 52;
        year += 1;
      }
      
      let reason = "Standard release";
      if (this.isOptimalReleaseWeek(week)) {
        reason = "Optimal box office window";
      }
      if (this.isAwardsSeason(week)) {
        reason = "Awards season - good for prestige films";
      }
      
      // Check if slot is available
      const hasConflict = this.events.some(event => 
        event.type === 'release' && event.week === week && event.year === year
      );
      
      if (!hasConflict) {
        windows.push({ week, year, reason });
      }
    }
    
    return windows.slice(0, 12); // Return next 12 available slots
  }
  
  static processWeeklyEvents(currentTime: TimeState): CalendarEvent[] {
    const currentWeekEvents = this.events.filter(event => 
      event.week === currentTime.currentWeek && event.year === currentTime.currentYear
    );
    
    console.log(`CALENDAR: Processing ${currentWeekEvents.length} events for Y${currentTime.currentYear}W${currentTime.currentWeek}`);
    
    return currentWeekEvents;
  }
  
  static clearFilmEvents(filmId: string): void {
    this.events = this.events.filter(event => event.filmId !== filmId);
  }

  /**
   * Hydrate the in-memory calendar from persisted project state.
   * This fixes reload/session issues where CalendarManager.events is empty but projects are already scheduled.
   */
  static syncReleasesFromProjects(projects: Project[]): void {
    // Remove all existing release events, keep other event types.
    this.events = this.events.filter(e => e.type !== 'release');

    projects.forEach(p => {
      if (p.status !== 'scheduled-for-release') return;

      const week = p.scheduledReleaseWeek ?? p.releaseWeek;
      const year = p.scheduledReleaseYear ?? p.releaseYear;
      if (!week || !year) return;

      const safeWeek = TimeSystem.getWeekOfYear(week);

      this.events.push({
        id: `release-${p.id}-${year}-${safeWeek}`,
        title: `Release: ${p.title}`,
        type: 'release',
        week: safeWeek,
        year,
        filmId: p.id,
      });
    });
  }

  /** Test helper */
  static clearAllEvents(): void {
    this.events = [];
  }
}