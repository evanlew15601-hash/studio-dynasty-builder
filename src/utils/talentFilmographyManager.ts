// Talent Filmography Management
import { GameState, TalentPerson, Project } from '@/types/game';

export const TalentFilmographyManager = {
  /**
   * Update talent filmography when a project is released
   */
  updateFilmographyOnRelease(gameState: GameState, project: Project): GameState {
    if (project.status !== 'released') {
      return gameState;
    }

    const roleByTalentId: Record<string, string> = {};
    const priorityByTalentId: Record<string, number> = {};

    const setRole = (talentId: string, role: string, priority: number) => {
      const existingPriority = priorityByTalentId[talentId] ?? -1;
      if (priority > existingPriority) {
        roleByTalentId[talentId] = role;
        priorityByTalentId[talentId] = priority;
      }
    };

    // Prefer script character assignments (they represent casting decisions)
    const characters = project.script?.characters || [];
    for (const ch of characters) {
      if (!ch.assignedTalentId) continue;

      if (ch.requiredType === 'director') {
        setRole(ch.assignedTalentId, 'Director', 3);
      } else if (ch.importance === 'lead') {
        setRole(ch.assignedTalentId, 'Lead Actor', 2);
      } else if (ch.importance === 'supporting') {
        setRole(ch.assignedTalentId, 'Supporting Actor', 1);
      } else {
        setRole(ch.assignedTalentId, 'Supporting Actor', 0);
      }
    }

    // Fallback/augment via project.cast (important for AI and any projects missing script character IDs)
    const cast = project.cast || [];
    for (const c of cast) {
      if (!c.talentId) continue;
      const roleLower = (c.role || '').toLowerCase();

      if (roleLower.includes('director')) {
        setRole(c.talentId, 'Director', 3);
      } else if (roleLower.includes('lead')) {
        setRole(c.talentId, 'Lead Actor', 2);
      } else if (roleLower.includes('supporting')) {
        setRole(c.talentId, 'Supporting Actor', 1);
      } else {
        setRole(c.talentId, 'Supporting Actor', 0);
      }
    }

    const creditedIds = new Set(Object.keys(roleByTalentId));
    if (creditedIds.size === 0) {
      return gameState;
    }

    const releaseYear = project.releaseYear ?? gameState.currentYear;

    const updatedTalent = gameState.talent.map(talent => {
      const role = roleByTalentId[talent.id];
      if (!role) return talent;

      // Add to filmography if not already there
      const filmEntry = {
        projectId: project.id,
        title: project.title,
        role,
        year: releaseYear,
        boxOffice: project.metrics?.boxOfficeTotal || 0
      };

      const existingFilmography = talent.filmography || [];
      const alreadyExists = existingFilmography.some(
        film => film.projectId === project.id
      );

      if (alreadyExists) return talent;

      // Add new film and sort by year descending
      const updatedFilmography = [...existingFilmography, filmEntry]
        .sort((a, b) => (b.year || 0) - (a.year || 0));

      // Update fame based on box office performance
      const performance = project.metrics?.boxOfficeTotal || 0;
      const budget = project.budget.total;
      const multiplier = performance / budget;

      let fameBoost = 0;
      if (multiplier > 3) fameBoost = 5; // Blockbuster
      else if (multiplier > 2) fameBoost = 3; // Hit
      else if (multiplier > 1) fameBoost = 1; // Success
      else if (multiplier < 0.5) fameBoost = -2; // Bomb

      // Directors get smaller fame boosts
      if (talent.type === 'director') fameBoost *= 0.7;

      const newFame = Math.max(0, Math.min(100, (talent.fame || 0) + fameBoost));

      console.log(`📽️ FILMOGRAPHY UPDATE: ${talent.name} in "${project.title}" as ${role}. Fame: ${talent.fame || 0} → ${newFame}`);

      return {
        ...talent,
        filmography: updatedFilmography,
        fame: newFame
      };
    });

    return {
      ...gameState,
      talent: updatedTalent
    };
  },

  /**
   * Get talent's recent filmography (for UI display)
   */
  getRecentFilmography(talent: TalentPerson, limit: number = 5) {
    return (talent.filmography || [])
      .sort((a, b) => (b.year || 0) - (a.year || 0))
      .slice(0, limit);
  },

  /**
   * Calculate total box office for a talent
   */
  getTotalBoxOffice(talent: TalentPerson): number {
    return (talent.filmography || [])
      .reduce((total, film) => total + (film.boxOffice || 0), 0);
  },

  /**
   * Get talent's biggest hit
   */
  getBiggestHit(talent: TalentPerson) {
    const filmography = talent.filmography || [];
    if (filmography.length === 0) return null;

    return filmography.reduce((biggest, film) => 
      (film.boxOffice || 0) > (biggest.boxOffice || 0) ? film : biggest
    );
  }
};