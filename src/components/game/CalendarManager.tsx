// Unified Calendar Management System - Single source of truth for all game time
import { TimeState, TimeSystem } from './TimeSystem';
import { Project } from '@/types/game';
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
  // Non-release events can still be stored here, but release scheduling should be derived from Project data
  // so it persists across save/load.
  private static events: CalendarEvent[] = [];
  
  static clearAllEvents(): void {
    this.events = [];
  }

  private static getReleaseEventsFromProjects(projects: Project[]): CalendarEvent[] {
    return projects
      .map(project => {
        // Only consider dates "reserved" if the project is explicitly scheduled.
        // This avoids stale scheduledReleaseWeek/Year values blocking other releases
        // while a project is still in marketing or otherwise unscheduled.
        const isScheduled = project.status === 'scheduled-for-release';
        const week = isScheduled ? project.scheduledReleaseWeek : undefined;
        const year = isScheduled ? project.scheduledReleaseYear : undefined;

        if (!week || !year) return null;

        return {
          id: `release-${project.id}-${year}-${week}`,
          title: `Release: ${project.title}`,
          type: 'release' as const,
          week,
          year,
          filmId: project.id,
        } satisfies CalendarEvent;
      })
      .filter((e): e is NonNullable<typeof e> => !!e) as CalendarEvent[];
  }

  private static getReleaseEvents(projects: Project[]): CalendarEvent[] {
    const fromProjects = this.getReleaseEventsFromProjects(projects);
    const fromCalendar = this.events.filter(e => e.type === 'release');

    const byId = new Map<string, CalendarEvent>();

    // Prefer project-derived events (persisted) over in-memory calendar entries.
    fromCalendar.forEach(e => byId.set(e.id, e));
    fromProjects.forEach(e => byId.set(e.id, e));

    return Array.from(byId.values());
  }

  private static resolveProjectsAndWeeksAhead(
    arg2: number | Project[] | undefined,
    arg3: number | undefined
  ): { projects: Project[]; weeksAhead: number } {
    if (Array.isArray(arg2)) {
      return { projects: arg2, weeksAhead: arg3 ?? 8 };
    }

    return { projects: [], weeksAhead: arg2 ?? 8 };
  }

  static isAwardsSeason(week: number): boolean {
    // Awards season: weeks 1-12 (Jan-March) and weeks 44-52 (Nov-Dec)
    return (week >= 1 && week <= 12) || (week >= 44 && week <= 52);
  }
  
  static isOptimalReleaseWeek(week: number): boolean {
    // Summer blockbuster season (weeks 20-35) and holiday season (weeks 47-52)
    return (week >= 20 && week <= 35) || (week >= 47 && week <= 52);
  }
  
  static validateRelease(
    filmId: string,
    targetWeek: number,
    targetYear: number,
    currentTime: TimeState,
    projects: Project[] = []
  ): CalendarValidation {
    const absToWeekYear = (abs: number): { week: number; year: number } => {
      const year = Math.floor((abs - 1) / 52);
      const week = ((abs - 1) % 52) + 1;
      return { week, year };
    };

    const currentAbs = (currentTime.currentYear * 52) + currentTime.currentWeek;
    const targetAbs = (targetYear * 52) + targetWeek;
    const weeksUntil = targetAbs - currentAbs;

    const project = projects.find(p => p.id === filmId);
    const medium = project && (project.type === 'series' || project.type === 'limited-series') ? 'tv' : 'film';

    const requiredWeeksUntil = project?.marketingCampaign
      ? Math.max(1, project.marketingCampaign.weeksRemaining)
      : 4;

    // Must be in the future
    if (weeksUntil <= 0) {
      return {
        canRelease: false,
        reason: "Release date must be in the future"
      };
    }

    // Need enough lead time to finish (or run) marketing
    if (weeksUntil < requiredWeeksUntil) {
      const recommended = absToWeekYear(currentAbs + requiredWeeksUntil);

      return {
        canRelease: false,
        reason: project?.marketingCampaign
          ? `Release must be at least ${requiredWeeksUntil} weeks away to complete marketing`
          : "Need at least 4 weeks for marketing campaign",
        recommendedWeek: recommended.week,
        recommendedYear: recommended.year,
      };
    }
    
    // Check for conflicts with other releases
    const releaseEvents = this.getReleaseEvents(projects);
    const conflictingRelease = releaseEvents.find(event => 
      event.week === targetWeek && 
      event.year === targetYear &&
      event.filmId !== filmId
    );
    
    if (conflictingRelease) {
      return {
        canRelease: false,
        reason: "Another film is already scheduled for this week"
      };
    }
    
    // Awards show cooldown and eligibility checks
    const cooldown = isWithinAwardCooldown(targetWeek, targetYear, medium);
    if (cooldown.within) {
      const recommendedAbs = (targetYear * 52) + (cooldown.show!.ceremonyWeek + cooldown.show!.cooldownWeeks);
      const recommended = absToWeekYear(recommendedAbs);

      return {
        canRelease: false,
        reason: `Release falls within ${cooldown.show!.name} cooldown period (weeks ${cooldown.show!.ceremonyWeek}-${cooldown.show!.ceremonyWeek + cooldown.show!.cooldownWeeks - 1})`,
        recommendedWeek: recommended.week,
        recommendedYear: recommended.year,
      };
    }

    const qualifiesFor = getEarliestEligibleShowForRelease(targetWeek, targetYear, medium);
    const awardEligibility = qualifiesFor 
      ? `Qualifies for ${qualifiesFor.name} Awards (ceremony week ${qualifiesFor.ceremonyWeek})`
      : "Does not qualify for current year's award shows";
    
    return { 
      canRelease: true,
      awardEligibility
    };
  }
  
  static scheduleRelease(filmId: string, title: string, week: number, year: number): boolean {
    const eventId = `release-${filmId}-${year}-${week}`;
    
    // Remove any existing release for this film
    this.events = this.events.filter(event => 
      !(event.type === 'release' && event.filmId === filmId)
    );
    
    // Add new release event
    this.events.push({
      id: eventId,
      title: `Release: ${title}`,
      type: 'release',
      week,
      year,
      filmId
    });
    
    console.log(`CALENDAR: Scheduled release for ${title} on Y${year}W${week}`);
    return true;
  }
  
  static getUpcomingEvents(currentTime: TimeState, weeksAhead?: number): CalendarEvent[];
  static getUpcomingEvents(currentTime: TimeState, projects?: Project[], weeksAhead?: number): CalendarEvent[];
  static getUpcomingEvents(currentTime: TimeState, arg2: number | Project[] = 8, arg3?: number): CalendarEvent[] {
    const { projects, weeksAhead } = this.resolveProjectsAndWeeksAhead(arg2, arg3);

    const currentAbsoluteWeek = (currentTime.currentYear * 52) + currentTime.currentWeek;
    const cutoffWeek = currentAbsoluteWeek + weeksAhead;

    const releaseEvents = this.getReleaseEvents(projects);
    const events = [...this.events.filter(e => e.type !== 'release'), ...releaseEvents];

    return events
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
  
  static getOptimalReleaseWindows(currentTime: TimeState): { week: number; year: number; reason: string }[];
  static getOptimalReleaseWindows(currentTime: TimeState, projects?: Project[]): { week: number; year: number; reason: string }[];
  static getOptimalReleaseWindows(currentTime: TimeState, projects: Project[] = []): { week: number; year: number; reason: string }[] {
    const windows = [];
    const startWeek = currentTime.currentWeek + 4; // Minimum 4 weeks for marketing

    const derivedReleaseEvents = this.getReleaseEvents(projects);

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
      const hasConflict = derivedReleaseEvents.some(event => event.week === week && event.year === year);

      if (!hasConflict) {
        windows.push({ week, year, reason });
      }
    }

    return windows.slice(0, 12); // Return next 12 available slots
  }
  
  static processWeeklyEvents(currentTime: TimeState): CalendarEvent[];
  static processWeeklyEvents(currentTime: TimeState, projects?: Project[]): CalendarEvent[];
  static processWeeklyEvents(currentTime: TimeState, projects: Project[] = []): CalendarEvent[] {
    const derivedReleaseEvents = this.getReleaseEvents(projects);
    const currentWeekEvents = [...this.events.filter(e => e.type !== 'release'), ...derivedReleaseEvents].filter(event => 
      event.week === currentTime.currentWeek && event.year === currentTime.currentYear
    );
    
    console.log(`CALENDAR: Processing ${currentWeekEvents.length} events for Y${currentTime.currentYear}W${currentTime.currentWeek}`);
    
    return currentWeekEvents;
  }
  
  static clearFilmEvents(filmId: string): void {
    this.events = this.events.filter(event => event.filmId !== filmId);
  }
}