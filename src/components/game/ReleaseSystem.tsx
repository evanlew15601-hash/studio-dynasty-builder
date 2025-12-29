// Unified Release System - Handles all film release logic
import { Project } from '../../types/game';
import { TimeState } from './TimeSystem';
import { CalendarManager } from './CalendarManager';
import { FinancialEngine } from './FinancialEngine';

export interface ReleaseValidation {
  canRelease: boolean;
  errors: string[];
  warnings: string[];
}

export interface ReleaseResult {
  success: boolean;
  message: string;
  releaseWeek?: number;
  releaseYear?: number;
}

export class ReleaseSystem {
  static validateFilmForRelease(project: Project): ReleaseValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const isTV = project.type === 'series' || project.type === 'limited-series';
    
    // Check development status - different for TV vs Films
    if (isTV) {
      if (project.status !== 'ready-for-marketing' && project.currentPhase !== 'marketing' && project.currentPhase !== 'release') {
        errors.push(`TV show must complete post-production (currently ${project.status})`);
      }
    } else {
      if (project.status !== 'completed') {
        errors.push(`Film must be completed (currently ${project.status})`);
      }
    }
    
    // Check script - different requirements for TV vs Films
    if (!project.script) {
      errors.push(isTV ? 'TV show needs a script' : 'Film needs a complete script');
    } else if (!isTV && project.script.pages < 90) {
      errors.push('Film needs a complete script (min 90 pages)');
    } else if (isTV && !project.script.quality) {
      errors.push('TV show script needs quality assessment');
    }
    
    // Check cast - look at script characters with assigned talent (correct data structure)
    const assignedTalent = project.script?.characters?.filter(c => c.assignedTalentId) || [];
    const hasDirector = assignedTalent.some(c => c.requiredType === 'director');
    const hasLead = assignedTalent.some(c => c.importance === 'lead' && c.requiredType === 'actor');
    
    console.log('RELEASE_VALIDATION: cast check', {
      projectId: project.id,
      title: project.title,
      type: project.type,
      legacyCast: project.cast,
      legacyCastLength: project.cast?.length,
      scriptCharacters: project.script?.characters?.length,
      assignedTalent: assignedTalent.length,
      hasDirector,
      hasLead,
    });
    
    if (assignedTalent.length === 0) {
      errors.push(isTV ? 'TV show needs at least one cast member' : 'Film needs at least one cast member');
    } else {
      // Check for mandatory roles
      if (!hasDirector) {
        errors.push(isTV ? 'TV show needs a director' : 'Film needs a director');
      }
      if (!hasLead) {
        errors.push(isTV ? 'TV show needs a lead actor' : 'Film needs a lead actor');
      }
    }

    // Require explicit casting confirmation so players can't bypass the casting phase
    if (!project.castingConfirmed) {
      errors.push(
        isTV
          ? 'Casting must be confirmed before scheduling a TV premiere'
          : 'Casting must be confirmed before scheduling a film release'
      );
    }
    
    // Check budget allocation
    if (!project.budget || project.budget.total <= 0) {
      errors.push(isTV ? 'TV show needs a production budget' : 'Film needs a production budget');
    }
    
    // Warnings for optimization - adjusted for TV
    if (isTV) {
      if (project.cast && project.cast.length < 2) {
        warnings.push('Small cast may limit audience appeal for TV');
      }
      if (!project.marketingData || !project.marketingData.currentBuzz) {
        warnings.push('No marketing buzz may hurt premiere ratings');
      }
    } else {
      if (!project.distributionStrategy?.marketingBudget || project.distributionStrategy.marketingBudget < project.budget.total * 0.2) {
        warnings.push('Low marketing budget may hurt box office performance');
      }
      if (project.cast.length < 3) {
        warnings.push('Small cast may limit audience appeal');
      }
    }
    
    return {
      canRelease: errors.length === 0,
      errors,
      warnings
    };
  }
  
  static scheduleRelease(
    film: Project, 
    targetWeek: number, 
    targetYear: number, 
    currentTime: TimeState
  ): ReleaseResult {
    // Validate film readiness
    const filmValidation = this.validateFilmForRelease(film);
    if (!filmValidation.canRelease) {
      console.error('RELEASE_SYSTEM: validation failed', {
        filmId: film.id,
        title: film.title,
        type: film.type,
        errors: filmValidation.errors,
        warnings: filmValidation.warnings,
        phase: (film as any).currentPhase,
        status: film.status,
      });
      return {
        success: false,
        message: `Cannot release: ${filmValidation.errors.join(', ')}`
      };
    }
    
    // Validate calendar slot
    const calendarValidation = CalendarManager.validateRelease(film.id, targetWeek, targetYear, currentTime);
    if (!calendarValidation.canRelease) {
      console.error('RELEASE_SYSTEM: calendar validation failed', {
        filmId: film.id,
        title: film.title,
        targetWeek,
        targetYear,
        currentTime,
        reason: calendarValidation.reason,
      });
      return {
        success: false,
        message: calendarValidation.reason || 'Release date not available'
      };
    }
    
    // Schedule the release
    CalendarManager.scheduleRelease(film.id, film.title, targetWeek, targetYear);
    
    // Record marketing expenses (spread over 4 weeks leading up to release)
    if (film.distributionStrategy?.marketingBudget) {
      const weeklyMarketingSpend = film.distributionStrategy.marketingBudget / 4;
      for (let i = 1; i <= 4; i++) {
        let marketingWeek = targetWeek - i;
        let marketingYear = targetYear;
        if (marketingWeek <= 0) {
          marketingWeek += 52;
          marketingYear -= 1;
        }
        
        FinancialEngine.recordFilmExpense(
          film.id,
          weeklyMarketingSpend,
          marketingWeek,
          marketingYear,
          'marketing',
          `Marketing campaign week ${i}`
        );
      }
    }
    
    console.log(`RELEASE: Scheduled ${film.title} for Y${targetYear}W${targetWeek}`);
    
    return {
      success: true,
      message: `${film.title} scheduled for release in Year ${targetYear}, Week ${targetWeek}`,
      releaseWeek: targetWeek,
      releaseYear: targetYear
    };
  }
  
  static processReleases(currentTime: TimeState): Project[] {
    const releasingFilms: Project[] = [];
    const events = CalendarManager.processWeeklyEvents(currentTime);
    
    const releaseEvents = events.filter(event => event.type === 'release');
    
    releaseEvents.forEach(event => {
      if (event.filmId) {
        console.log(`RELEASE: Processing release for film ${event.filmId} - ${event.title}`);
        // Return just the ID for now - the main game will handle the full project update
        releasingFilms.push({
          id: event.filmId,
          title: event.title.replace('Release: ', ''),
          releaseWeek: currentTime.currentWeek,
          releaseYear: currentTime.currentYear
        } as any);
      }
    });
    
    return releasingFilms;
  }
  
  static getNextAvailableReleaseDate(currentTime: TimeState): { week: number; year: number } {
    const optimalWindows = CalendarManager.getOptimalReleaseWindows(currentTime);
    
    if (optimalWindows.length > 0) {
      return {
        week: optimalWindows[0].week,
        year: optimalWindows[0].year
      };
    }
    
    // Fallback: 4 weeks from now
    let week = currentTime.currentWeek + 4;
    let year = currentTime.currentYear;
    if (week > 52) {
      week -= 52;
      year += 1;
    }
    
    return { week, year };
  }
  
  static cancelRelease(filmId: string): boolean {
    CalendarManager.clearFilmEvents(filmId);
    console.log(`RELEASE: Cancelled release for film ${filmId}`);
    return true;
  }
  
  static getUpcomingReleases(currentTime: TimeState): Array<{
    filmId: string;
    title: string;
    week: number;
    year: number;
    weeksUntilRelease: number;
  }> {
    const upcomingEvents = CalendarManager.getUpcomingEvents(currentTime, 12);
    const releaseEvents = upcomingEvents.filter(event => event.type === 'release');
    
    return releaseEvents.map(event => {
      const currentTimeValue = (currentTime.currentYear * 52) + currentTime.currentWeek;
      const eventTime = (event.year * 52) + event.week;
      const weeksUntilRelease = Math.max(0, eventTime - currentTimeValue);
      
      return {
        filmId: event.filmId!,
        title: event.title.replace('Release: ', ''),
        week: event.week,
        year: event.year,
        weeksUntilRelease
      };
    }).filter(release => release.weeksUntilRelease < 999); // Filter out invalid calculations
  }
}