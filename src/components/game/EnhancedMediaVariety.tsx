import React, { useState, useEffect } from 'react';
import { GameState, Project, TalentPerson } from '@/types/game';

interface MediaStory {
  id: string;
  headline: string;
  content: string;
  outlet: string;
  type: 'awards' | 'casting' | 'production' | 'boxoffice' | 'scandal' | 'interview' | 'franchise' | 'market';
  sentiment: 'positive' | 'neutral' | 'negative';
  virality: number;
  week: number;
  year: number;
}

interface EnhancedMediaVarietyProps {
  gameState: GameState;
  onMediaStoryGenerated?: (story: MediaStory) => void;
}

export const EnhancedMediaVariety: React.FC<EnhancedMediaVarietyProps> = ({
  gameState,
  onMediaStoryGenerated
}) => {
  const [weeklyStories, setWeeklyStories] = useState<MediaStory[]>([]);

  useEffect(() => {
    generateVariedMediaStories();
  }, [gameState.currentWeek, gameState.currentYear]);

  const generateVariedMediaStories = () => {
    const stories: MediaStory[] = [];
    
    // Awards season stories (weeks 1-12)
    if (gameState.currentWeek >= 1 && gameState.currentWeek <= 12) {
      stories.push(...generateAwardsSeasonStories());
    }
    
    // Franchise and sequel stories
    stories.push(...generateFranchiseStories());
    
    // Market analysis stories
    stories.push(...generateMarketAnalysisStories());
    
    // Talent relationship/controversy stories
    stories.push(...generateTalentStories());
    
    // Production milestone stories
    stories.push(...generateProductionMilestoneStories());
    
    // Box office analysis stories
    stories.push(...generateBoxOfficeAnalysisStories());

    setWeeklyStories(stories);
    stories.forEach(story => onMediaStoryGenerated?.(story));
  };

  const generateAwardsSeasonStories = (): MediaStory[] => {
    const stories: MediaStory[] = [];
    const outlets = ['The Studio Reporter', 'Showbiz Ledger', 'Screen Weekly'];
    
    // Predictions and analysis
    if (Math.random() < 0.4) {
      stories.push({
        id: `awards-${Date.now()}-${Math.random()}`,
        headline: `Awards Season Predictions: Who Will Take Home Gold?`,
        content: `Industry experts weigh in on this year's most competitive awards season, with several dark horses emerging in major categories.`,
        outlet: outlets[Math.floor(Math.random() * outlets.length)],
        type: 'awards',
        sentiment: 'neutral',
        virality: 60 + Math.floor(Math.random() * 30),
        week: gameState.currentWeek,
        year: gameState.currentYear
      });
    }

    // Snubs and surprises
    if (Math.random() < 0.3) {
      stories.push({
        id: `awards-snub-${Date.now()}-${Math.random()}`,
        headline: `Biggest Awards Season Snubs That Have Industry Talking`,
        content: `Several expected nominees were left out of major categories, sparking debate about voting patterns and industry politics.`,
        outlet: outlets[Math.floor(Math.random() * outlets.length)],
        type: 'awards',
        sentiment: 'negative',
        virality: 75 + Math.floor(Math.random() * 20),
        week: gameState.currentWeek,
        year: gameState.currentYear
      });
    }

    return stories;
  };

  const generateFranchiseStories = (): MediaStory[] => {
    const stories: MediaStory[] = [];
    const franchises = gameState.franchises.filter(f => f.status === 'active');
    
    if (franchises.length > 0 && Math.random() < 0.2) {
      const franchise = franchises[Math.floor(Math.random() * franchises.length)];
      const franchiseProjects = gameState.projects.filter(p => p.script.franchiseId === franchise.id);
      
      if (franchiseProjects.length > 1) {
        stories.push({
          id: `franchise-${Date.now()}-${Math.random()}`,
          headline: `${franchise.title} Universe Expands: What's Next for the Franchise?`,
          content: `With ${franchiseProjects.length} films in the ${franchise.title} series, industry insiders speculate about future installments and spin-offs.`,
          outlet: 'The Studio Reporter',
          type: 'franchise',
          sentiment: 'positive',
          virality: 45 + Math.floor(Math.random() * 25),
          week: gameState.currentWeek,
          year: gameState.currentYear
        });
      }
    }

    return stories;
  };

  const generateMarketAnalysisStories = (): MediaStory[] => {
    const stories: MediaStory[] = [];
    
    if (Math.random() < 0.3) {
      const genres = ['action', 'drama', 'comedy', 'horror', 'sci-fi'];
      const trendingGenre = genres[Math.floor(Math.random() * genres.length)];
      
      stories.push({
        id: `market-${Date.now()}-${Math.random()}`,
        headline: `Market Report: ${trendingGenre.charAt(0).toUpperCase() + trendingGenre.slice(1)} Films Dominating Box Office`,
        content: `Latest box office trends show ${trendingGenre} films are resonating with audiences, leading to increased production in the genre.`,
        outlet: 'Showbiz Ledger',
        type: 'market',
        sentiment: 'neutral',
        virality: 35 + Math.floor(Math.random() * 20),
        week: gameState.currentWeek,
        year: gameState.currentYear
      });
    }

    return stories;
  };

  const generateTalentStories = (): MediaStory[] => {
    const stories: MediaStory[] = [];
    const topTalent = gameState.talent
      .filter(t => t.reputation > 70)
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, 10);
    
    if (topTalent.length > 0 && Math.random() < 0.25) {
      const talent = topTalent[Math.floor(Math.random() * topTalent.length)];
      const storyTypes = [
        {
          headline: `${talent.name} Signs Multi-Picture Deal Worth $${(talent.marketValue / 1000000).toFixed(0)}M`,
          content: `The ${talent.type} has committed to multiple projects in a groundbreaking deal that reshapes industry compensation standards.`,
          sentiment: 'positive' as const,
          type: 'casting' as const
        },
        {
          headline: `${talent.name} Launches Production Company, Eyes Directing Debut`,
          content: `The acclaimed ${talent.type} expands their creative influence with a new production banner focused on diverse storytelling.`,
          sentiment: 'positive' as const,
          type: 'interview' as const
        },
        {
          headline: `Industry Insiders React to ${talent.name}'s Latest Career Move`,
          content: `${talent.name}'s recent professional decisions have sparked discussion about talent representation and creative control.`,
          sentiment: 'neutral' as const,
          type: 'interview' as const
        }
      ];
      
      const selectedStory = storyTypes[Math.floor(Math.random() * storyTypes.length)];
      
      stories.push({
        id: `talent-${Date.now()}-${Math.random()}`,
        headline: selectedStory.headline,
        content: selectedStory.content,
        outlet: 'Screen Weekly',
        type: selectedStory.type,
        sentiment: selectedStory.sentiment,
        virality: Math.floor(talent.reputation * 0.8) + Math.floor(Math.random() * 20),
        week: gameState.currentWeek,
        year: gameState.currentYear
      });
    }

    return stories;
  };

  const generateProductionMilestoneStories = (): MediaStory[] => {
    const stories: MediaStory[] = [];
    const productionProjects = gameState.projects.filter(p => 
      p.currentPhase === 'production' || p.currentPhase === 'post-production'
    );
    
    if (productionProjects.length > 0 && Math.random() < 0.2) {
      const project = productionProjects[Math.floor(Math.random() * productionProjects.length)];
      const milestones = [
        {
          headline: `"${project.title}" Wraps Principal Photography Ahead of Schedule`,
          content: `The ${project.script.genre} film has completed its main shooting phase, with post-production now underway.`,
          sentiment: 'positive' as const
        },
        {
          headline: `Behind the Scenes: Technical Innovation on "${project.title}"`,
          content: `The production team is pushing boundaries with new filmmaking techniques and cutting-edge technology.`,
          sentiment: 'positive' as const
        },
        {
          headline: `"${project.title}" Production Faces Weather Delays`,
          content: `Adverse weather conditions have impacted the filming schedule, though producers remain optimistic about the release date.`,
          sentiment: 'neutral' as const
        }
      ];
      
      const milestone = milestones[Math.floor(Math.random() * milestones.length)];
      
      stories.push({
        id: `production-${Date.now()}-${Math.random()}`,
        headline: milestone.headline,
        content: milestone.content,
        outlet: 'Deadline Daily',
        type: 'production',
        sentiment: milestone.sentiment,
        virality: 25 + Math.floor(Math.random() * 30),
        week: gameState.currentWeek,
        year: gameState.currentYear
      });
    }

    return stories;
  };

  const generateBoxOfficeAnalysisStories = (): MediaStory[] => {
    const stories: MediaStory[] = [];
    const releasedProjects = gameState.projects.filter(p => 
      p.status === 'released' && p.metrics?.boxOfficeTotal
    );
    
    if (releasedProjects.length > 0 && Math.random() < 0.3) {
      const recentReleases = releasedProjects
        .filter(p => p.releaseYear === gameState.currentYear)
        .sort((a, b) => (b.metrics?.boxOfficeTotal || 0) - (a.metrics?.boxOfficeTotal || 0));
      
      if (recentReleases.length > 0) {
        const topProject = recentReleases[0];
        const boxOffice = topProject.metrics?.boxOfficeTotal || 0;
        const budget = topProject.budget.total;
        
        let headline: string;
        let sentiment: 'positive' | 'neutral' | 'negative';
        
        if (boxOffice > budget * 2.5) {
          headline = `Box Office Gold: "${topProject.title}" Exceeds All Expectations`;
          sentiment = 'positive';
        } else if (boxOffice > budget) {
          headline = `Steady Success: "${topProject.title}" Finds Its Audience`;
          sentiment = 'neutral';
        } else {
          headline = `Box Office Disappointment: "${topProject.title}" Underperforms`;
          sentiment = 'negative';
        }
        
        stories.push({
          id: `boxoffice-${Date.now()}-${Math.random()}`,
          headline,
          content: `"${topProject.title}" earned $${(boxOffice / 1000000).toFixed(1)}M against its $${(budget / 1000000).toFixed(0)}M budget, ${sentiment === 'positive' ? 'proving the market appetite for quality ' + topProject.script.genre + ' films' : sentiment === 'neutral' ? 'demonstrating modest but reliable performance' : 'raising questions about genre saturation and marketing strategy'}.`,
          outlet: 'Box Office Tracker',
          type: 'boxoffice',
          sentiment,
          virality: sentiment === 'positive' ? 70 : sentiment === 'negative' ? 85 : 40,
          week: gameState.currentWeek,
          year: gameState.currentYear
        });
      }
    }

    return stories;
  };

  return (
    <div className="space-y-4">
      {weeklyStories.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Generated {weeklyStories.length} media stories this week
        </div>
      )}
    </div>
  );
};