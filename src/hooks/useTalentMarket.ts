import { useState, useEffect } from 'react';
import { TalentPerson, Genre } from '@/types/game';

interface TalentMarketState {
  demandMultipliers: Record<string, number>;
  genreTrends: Record<Genre, number>;
  availabilityMap: Record<string, boolean>;
}

export const useTalentMarket = (talent: TalentPerson[], currentWeek: number) => {
  const [marketState, setMarketState] = useState<TalentMarketState>({
    demandMultipliers: {},
    genreTrends: {
      action: 1, adventure: 1, animation: 1, biography: 1, comedy: 1, crime: 1,
      documentary: 1, drama: 1, family: 1, fantasy: 1, horror: 1, musical: 1,
      mystery: 1, romance: 1, 'sci-fi': 1, thriller: 1, war: 1, western: 1,
      superhero: 1, sports: 1, historical: 1
    },
    availabilityMap: {}
  });

  // Calculate dynamic market value based on recent success and demand
  const calculateMarketValue = (person: TalentPerson): number => {
    const baseValue = person.marketValue;
    
    // Apply demand multiplier (success breeds higher prices)
    const demandMultiplier = marketState.demandMultipliers[person.id] || 1;
    
    // Genre trend bonus
    const genreBonus = person.specialties.reduce((bonus, genre) => {
      return bonus + (marketState.genreTrends[genre] || 1);
    }, 0) / person.specialties.length;
    
    // Age factor (peak years are more expensive)
    const ageFactor = person.type === 'actor' ? 
      (person.age >= 25 && person.age <= 45 ? 1.2 : 0.9) : 
      (person.age >= 35 && person.age <= 55 ? 1.1 : 0.95);
    
    // Award winner premium
    const awardPremium = person.awards.length > 0 ? 1.3 : 1;
    
    return Math.floor(baseValue * demandMultiplier * genreBonus * ageFactor * awardPremium);
  };

  // Check if talent is available for casting
  const isAvailable = (personId: string): boolean => {
    // High-demand talent may be unavailable
    const demandMultiplier = marketState.demandMultipliers[personId] || 1;
    if (demandMultiplier > 2) {
      return Math.random() > 0.6; // 40% chance available if high demand
    }
    return marketState.availabilityMap[personId] !== false;
  };

  // Update market trends weekly
  useEffect(() => {
    setMarketState(prev => {
      const newDemandMultipliers = { ...prev.demandMultipliers };
      const newGenreTrends: Record<Genre, number> = { ...prev.genreTrends };
      const newAvailabilityMap = { ...prev.availabilityMap };

      // Simulate market fluctuations
      const trendingGenres: Genre[] = ['action', 'horror', 'comedy', 'drama', 'sci-fi'];
      const randomTrendingGenre = trendingGenres[Math.floor(Math.random() * trendingGenres.length)];
      
      // Update genre trends efficiently
      const genreKeys = Object.keys(newGenreTrends) as Genre[];
      for (const genre of genreKeys) {
        if (genre === randomTrendingGenre) {
          newGenreTrends[genre] = Math.min(1.5, (newGenreTrends[genre] || 1) + 0.1);
        } else {
          newGenreTrends[genre] = Math.max(0.8, (newGenreTrends[genre] || 1) - 0.05);
        }
      }

      // Random availability changes (contracts, scheduling conflicts)
      talent.forEach(person => {
        if (Math.random() < 0.1) { // 10% chance of availability change
          newAvailabilityMap[person.id] = Math.random() > 0.3; // 70% chance available
        }
      });

      return {
        demandMultipliers: newDemandMultipliers,
        genreTrends: newGenreTrends,
        availabilityMap: newAvailabilityMap
      };
    });
  }, [currentWeek, talent]);

  // Public API for updating market based on casting decisions
  const updateDemand = (personId: string, successLevel: 'hit' | 'average' | 'flop') => {
    setMarketState(prev => ({
      ...prev,
      demandMultipliers: {
        ...prev.demandMultipliers,
        [personId]: Math.max(0.5, Math.min(3, (prev.demandMultipliers[personId] || 1) + 
          (successLevel === 'hit' ? 0.3 : successLevel === 'flop' ? -0.2 : 0)))
      }
    }));
  };

  return {
    calculateMarketValue,
    isAvailable,
    updateDemand,
    marketState
  };
};