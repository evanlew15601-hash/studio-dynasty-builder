import { useState, useEffect } from 'react';
import { GameState } from '@/types/game';

export type AchievementIcon = "dollar" | "film" | "star" | "trophy" | "award";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: AchievementIcon;
  category: 'financial' | 'creative' | 'reputation' | 'milestone' | 'special';
  requirement: (gameState: GameState) => boolean;
  reward?: {
    reputation?: number;
    budget?: number;
    unlock?: string;
  };
  unlocked: boolean;
  unlockedAt?: Date;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-million',
    title: 'First Million',
    description: 'Earn your first $1M in box office revenue',
    icon: 'dollar',
    category: 'financial',
    requirement: (state) => state.projects.some(p => (p.metrics?.boxOfficeTotal || 0) >= 1000000),
    reward: { reputation: 5 },
    unlocked: false
  },
  {
    id: 'blockbuster-hit',
    title: 'Blockbuster Hit',
    description: 'Create a film that earns over $100M',
    icon: 'film',
    category: 'financial',
    requirement: (state) => state.projects.some(p => (p.metrics?.boxOfficeTotal || 0) >= 100000000),
    reward: { reputation: 20, budget: 5000000 },
    unlocked: false
  },
  {
    id: 'critic-darling',
    title: 'Critical Darling',
    description: 'Achieve 90+ quality on a project',
    icon: 'star',
    category: 'creative',
    requirement: (state) => state.projects.some(p => (p.script?.quality || 0) >= 90),
    reward: { reputation: 10 },
    unlocked: false
  },
  {
    id: 'studio-mogul',
    title: 'Studio Mogul',
    description: 'Reach 80+ studio reputation',
    icon: 'trophy',
    category: 'reputation',
    requirement: (state) => state.studio.reputation >= 80,
    reward: { budget: 10000000 },
    unlocked: false
  },
  {
    id: 'prolific-producer',
    title: 'Prolific Producer',
    description: 'Complete 10 projects',
    icon: 'film',
    category: 'milestone',
    requirement: (state) => state.projects.filter(p => p.status === 'released').length >= 10,
    reward: { reputation: 15 },
    unlocked: false
  },
  {
    id: 'comeback-kid',
    title: 'Comeback Kid',
    description: 'Have a hit after 3 consecutive flops',
    icon: 'award',
    category: 'special',
    requirement: (state) => {
      const released = state.projects.filter(p => p.status === 'released').slice(-4);
      if (released.length < 4) return false;
      const lastThreeFlops = released.slice(0, 3).every(p => 
        (p.metrics?.boxOfficeTotal || 0) < (typeof p.budget === 'number' ? p.budget : p.budget.total) * 0.8
      );
      const lastIsHit = (released[3].metrics?.boxOfficeTotal || 0) >= 
        (typeof released[3].budget === 'number' ? released[3].budget : released[3].budget.total) * 2.5;
      return lastThreeFlops && lastIsHit;
    },
    reward: { reputation: 25, budget: 15000000 },
    unlocked: false
  },
  {
    id: 'genre-master',
    title: 'Genre Master',
    description: 'Have 3 successful films in the same genre',
    icon: 'star',
    category: 'creative',
    requirement: (state) => {
      const successfulByGenre: Record<string, number> = {};
      state.projects.filter(p => p.status === 'released').forEach(p => {
        if ((p.metrics?.boxOfficeTotal || 0) >= (typeof p.budget === 'number' ? p.budget : p.budget.total) * 2) {
          const genre = p.script?.genre || 'unknown';
          successfulByGenre[genre] = (successfulByGenre[genre] || 0) + 1;
        }
      });
      return Object.values(successfulByGenre).some(count => count >= 3);
    },
    reward: { reputation: 15 },
    unlocked: false
  },
  {
    id: 'big-spender',
    title: 'Big Spender',
    description: 'Spend over $50M on a single project',
    icon: 'dollar',
    category: 'financial',
    requirement: (state) => state.projects.some(p => 
      (typeof p.budget === 'number' ? p.budget : p.budget.total) >= 50000000
    ),
    reward: { reputation: 5 },
    unlocked: false
  },

  // Streaming Wars (DLC)
  {
    id: 'streaming-wars-launch',
    title: 'Launch Day',
    description: 'Launch your own streaming platform',
    icon: 'trophy',
    category: 'milestone',
    requirement: (state) => state.dlc?.streamingWars === true && !!state.platformMarket?.player,
    reward: { reputation: 5 },
    unlocked: false
  },
  {
    id: 'streaming-wars-1m-subs',
    title: 'One Million Subscribers',
    description: 'Reach 1,000,000 subscribers on your platform',
    icon: 'star',
    category: 'milestone',
    requirement: (state) =>
      state.dlc?.streamingWars === true && (state.platformMarket?.player?.subscribers || 0) >= 1_000_000,
    reward: { reputation: 10, budget: 5_000_000 },
    unlocked: false
  },
  {
    id: 'streaming-wars-originals-slate',
    title: 'Originals Machine',
    description: 'Commission 3 Originals for your platform',
    icon: 'film',
    category: 'creative',
    requirement: (state) => {
      if (state.dlc?.streamingWars !== true) return false;
      const pid = state.platformMarket?.player?.id;
      if (!pid) return false;
      return state.projects.filter((p) => p.streamingContract?.platformId === pid).length >= 3;
    },
    reward: { reputation: 10 },
    unlocked: false
  },
  {
    id: 'streaming-wars-consolidation',
    title: 'The Wars Begin',
    description: 'Witness the first major streaming collapse',
    icon: 'award',
    category: 'special',
    requirement: (state) => {
      if (state.dlc?.streamingWars !== true) return false;
      return (state.platformMarket?.rivals || []).some((r) => r.status === 'collapsed');
    },
    reward: { reputation: 5 },
    unlocked: false
  }
];

export const useAchievements = (gameState: GameState, initialUnlockedIds?: string[]) => {
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    if (!initialUnlockedIds || initialUnlockedIds.length === 0) {
      return ACHIEVEMENTS;
    }
    const set = new Set(initialUnlockedIds);
    return ACHIEVEMENTS.map(a =>
      set.has(a.id)
        ? { ...a, unlocked: true, unlockedAt: a.unlockedAt ?? new Date() }
        : a
    );
  });
  const [recentUnlocks, setRecentUnlocks] = useState<Achievement[]>([]);

  useEffect(() => {
    setAchievements(prev => {
      const updated = prev.map(achievement => {
        if (!achievement.unlocked && achievement.requirement(gameState)) {
          const unlockedAchievement = {
            ...achievement,
            unlocked: true,
            unlockedAt: new Date()
          };
          
          // Add to recent unlocks for notification
          setRecentUnlocks(recent => [...recent, unlockedAchievement]);
          
          return unlockedAchievement;
        }
        return achievement;
      });
      return updated;
    });
  }, [gameState]);

  

  const getUnlockedAchievements = () => achievements.filter(a => a.unlocked);
  const getLockedAchievements = () => achievements.filter(a => !a.unlocked);
  const getAchievementsByCategory = (category: Achievement['category']) => 
    achievements.filter(a => a.category === category);

  const clearRecentUnlocks = () => setRecentUnlocks([]);

  const dismissRecentUnlock = (id: string) => {
    setRecentUnlocks(prev => prev.filter(a => a.id !== id));
  };

  return {
    achievements,
    recentUnlocks,
    getUnlockedAchievements,
    getLockedAchievements,
    getAchievementsByCategory,
    clearRecentUnlocks,
    dismissRecentUnlock
  };
};