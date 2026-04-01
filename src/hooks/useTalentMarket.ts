import { useState, useEffect } from 'react';
import { TalentPerson, Genre } from '@/types/game';
import { stableFloat01, stableInt } from '@/utils/stableRandom';

interface TalentMarketState {
  demandMultipliers: Record<string, number>;
  genreTrends: Record<Genre, number>;
  availabilityMap: Record<string, boolean>;
}

export const useTalentMarket = (
  talent: TalentPerson[],
  currentWeek: number,
  currentYear: number,
  universeSeed: number | string = 0
) => {
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

  const currentAbsWeek = (currentYear * 52) + currentWeek;
  const seedRoot = `talent-market|${universeSeed}|${currentAbsWeek}`;

  // Calculate dynamic market value based on recent success and demand
  const calculateMarketValue = (person: TalentPerson): number => {
    const baseValue = person.marketValue;
    
    // Apply demand multiplier (success breeds higher prices)
    const demandMultiplier = marketState.demandMultipliers[person.id] || 1;
    
    // Genre trend bonus (fallback to general genres if specialties not defined)
    const specialties = (person.specialties && person.specialties.length > 0)
      ? person.specialties
      : person.genres || [];
    const genreBonus =
      specialties.length > 0
        ? specialties.reduce((bonus, genre) => bonus + (marketState.genreTrends[genre] || 1), 0) /
          specialties.length
        : 1;
    
    // Age factor (peak years are more expensive)
    const ageFactor = person.type === 'actor'
      ? (person.age >= 25 && person.age <= 45 ? 1.2 : 0.9)
      : (person.age >= 35 && person.age <= 55 ? 1.1 : 0.95);
    
    // Award winner premium
    const awardsCount = person.awards?.length || 0;
    const awardPremium = awardsCount > 0 ? 1.3 : 1;
    
    return Math.floor(baseValue * demandMultiplier * genreBonus * ageFactor * awardPremium);
  };

  // Check if talent is available for casting
  const isAvailable = (personId: string): boolean => {
    // High-demand talent may be unavailable.
    const demandMultiplier = marketState.demandMultipliers[personId] || 1;
    if (demandMultiplier > 2) {
      return stableFloat01(`${seedRoot}|avail|${personId}|high-demand`) > 0.6; // 40% chance available if high demand
    }
    return marketState.availabilityMap[personId] !== false;
  };

  // Update market trends weekly (deterministic per save+week)
  useEffect(() => {
    setMarketState(prev => {
      const newDemandMultipliers = { ...prev.demandMultipliers };
      const newGenreTrends: Record<Genre, number> = { ...prev.genreTrends };
      const newAvailabilityMap = { ...prev.availabilityMap };

      // Simulate market fluctuations deterministically.
      const trendingGenres: Genre[] = ['action', 'horror', 'comedy', 'drama', 'sci-fi'];
      const trendingIdx = stableInt(`${seedRoot}|trending-genre`, 0, trendingGenres.length - 1);
      const randomTrendingGenre = trendingGenres[trendingIdx];
      
      // Update genre trends efficiently
      const genreKeys = Object.keys(newGenreTrends) as Genre[];
      for (const genre of genreKeys) {
        if (genre === randomTrendingGenre) {
          newGenreTrends[genre] = Math.min(1.5, (newGenreTrends[genre] || 1) + 0.1);
        } else {
          newGenreTrends[genre] = Math.max(0.8, (newGenreTrends[genre] || 1) - 0.05);
        }
      }

      // Availability changes (contracts, scheduling conflicts), deterministic per talent+week.
      talent.forEach(person => {
        const roll = stableFloat01(`${seedRoot}|availability-change|${person.id}`);
        if (roll < 0.1) {
          newAvailabilityMap[person.id] = stableFloat01(`${seedRoot}|availability-next|${person.id}`) > 0.3;
        }
      });

      return {
        demandMultipliers: newDemandMultipliers,
        genreTrends: newGenreTrends,
        availabilityMap: newAvailabilityMap
      };
    });
  }, [currentWeek, currentYear, seedRoot, talent]);

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