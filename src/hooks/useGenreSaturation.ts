import { useState, useEffect } from 'react';
import { Genre, Project } from '@/types/game';

interface GenreSaturationState {
  saturationLevels: Record<Genre, number>;
  marketPenalties: Record<Genre, number>;
  trendingGenres: Genre[];
}

export const useGenreSaturation = (allReleases: Project[], currentWeek: number) => {
  const [saturationState, setSaturationState] = useState<GenreSaturationState>({
    saturationLevels: {} as Record<Genre, number>,
    marketPenalties: {} as Record<Genre, number>,
    trendingGenres: []
  });

  // Calculate genre saturation based on recent releases
  useEffect(() => {
    const recentReleases = allReleases.filter(release => {
      if (!release.releaseWeek || !release.releaseYear) return false;
      const releaseGameWeek = (release.releaseYear * 52) + release.releaseWeek;
      const currentGameWeek = (2025 * 52) + currentWeek; // Use game year instead of real year
      return (currentGameWeek - releaseGameWeek) <= 12; // Last 12 weeks
    });

    // Count releases by genre
    const genreCounts: Record<Genre, number> = {} as Record<Genre, number>;
    const allGenres: Genre[] = ['action', 'adventure', 'animation', 'biography', 'comedy', 'crime', 
                               'documentary', 'drama', 'family', 'fantasy', 'horror', 'musical', 
                               'mystery', 'romance', 'sci-fi', 'thriller', 'war', 'western'];

    // Initialize counts
    allGenres.forEach(genre => {
      genreCounts[genre] = 0;
    });

    // Count actual releases
    recentReleases.forEach(release => {
      if (release.script?.genre) {
        genreCounts[release.script.genre]++;
      }
    });

    // Calculate saturation levels (0-1, where 1 is completely saturated)
    const newSaturationLevels: Record<Genre, number> = {} as Record<Genre, number>;
    const newMarketPenalties: Record<Genre, number> = {} as Record<Genre, number>;
    
    allGenres.forEach(genre => {
      const count = genreCounts[genre];
      // Saturation based on release frequency (more than 3 releases in 12 weeks = saturated)
      const saturation = Math.min(1, count / 3);
      newSaturationLevels[genre] = saturation;
      
      // Market penalty increases exponentially with saturation
      if (saturation > 0.5) {
        newMarketPenalties[genre] = 0.7 - (saturation * 0.4); // 70% to 30% performance
      } else {
        newMarketPenalties[genre] = 1; // No penalty
      }
    });

    // Identify trending genres (low saturation)
    const trendingGenres = allGenres
      .filter(genre => newSaturationLevels[genre] < 0.3)
      .sort((a, b) => newSaturationLevels[a] - newSaturationLevels[b])
      .slice(0, 3);

    setSaturationState({
      saturationLevels: newSaturationLevels,
      marketPenalties: newMarketPenalties,
      trendingGenres
    });

  }, [allReleases, currentWeek]);

  // Get performance multiplier for a genre
  const getGenreMultiplier = (genre: Genre): number => {
    const penalty = saturationState.marketPenalties[genre] || 1;
    const trending = saturationState.trendingGenres.includes(genre) ? 1.2 : 1;
    return penalty * trending;
  };

  // Get market advice for genre selection
  const getGenreAdvice = (): string => {
    const { trendingGenres, saturationLevels } = saturationState;
    
    if (trendingGenres.length > 0) {
      return `Trending: ${trendingGenres.join(', ')}. Avoid oversaturated markets.`;
    }
    
    const oversaturated = Object.entries(saturationLevels)
      .filter(([_, level]) => level > 0.7)
      .map(([genre, _]) => genre);
      
    if (oversaturated.length > 0) {
      return `Oversaturated: ${oversaturated.join(', ')}. Consider alternative genres.`;
    }
    
    return "Market is balanced. Good time for diverse content.";
  };

  return {
    saturationState,
    getGenreMultiplier,
    getGenreAdvice
  };
};