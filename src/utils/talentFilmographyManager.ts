// Talent Filmography Management
import { GameState, TalentPerson, Project } from '@/types/game';

export const TalentFilmographyManager = {
  /**
   * Update talent filmography when a project is released
   */
  updateFilmographyOnRelease(gameState: GameState, project: Project): GameState {
    if (!project.script?.characters || project.status !== 'released') {
      return gameState;
    }

    const updatedTalent = gameState.talent.map(talent => {
      // Find if this talent was cast in the project
      const castCharacter = project.script!.characters!.find(
        char => !char.excluded && char.assignedTalentId === talent.id
      );

      if (!castCharacter) return talent;

      // Determine the role
      let role = 'Supporting';
      if (castCharacter.requiredType === 'director') {
        role = 'Director';
      } else if (castCharacter.importance === 'lead') {
        role = 'Lead Actor';
      } else if (castCharacter.importance === 'supporting') {
        role = 'Supporting Actor';
      }

      // Add to filmography if not already there
      const filmEntry = {
        projectId: project.id,
        title: project.title,
        role,
        year: project.releaseYear,
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