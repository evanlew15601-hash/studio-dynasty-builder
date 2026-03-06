import React, { useState, useEffect } from 'react';
import type { GameState, Project, Genre } from '@/types/game';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tv, Monitor, Clock, Users, TrendingUp, Calendar } from 'lucide-react';

interface TelevisionStreamingProps {
  gameState?: GameState;
  onProjectCreate?: (project: Partial<Project>) => void;
}

export interface TVShowConcept {
  id: string;
  title: string;
  genre: Genre;
  format: 'series' | 'limited-series' | 'miniseries' | 'anthology';
  platform: 'network' | 'cable' | 'streaming' | 'premium';
  episodes: number;
  episodeLength: number; // minutes
  seasons: number;
  seasonBudget: number;
  totalBudget: number;
  targetDemographic: string;
  premise: string;
  developmentStage: 'pitch' | 'greenlit' | 'production' | 'post' | 'ready' | 'airing';
  airingSchedule?: {
    startWeek: number;
    startYear: number;
    episodesPerWeek: number;
    seasonBreaks: boolean;
  };
  renewalPotential: number; // 0-100
  criticalExpectations: number;
  commercialExpectations: number;
  streamingMetrics?: {
    viewership: number;
    completionRate: number;
    bingeability: number;
    socialBuzz: number;
  };
}

export interface StreamingFeature {
  id: string;
  title: string;
  genre: Genre;
  type: 'feature' | 'documentary' | 'special' | 'concert';
  platform: 'streaming-exclusive' | 'day-and-date' | 'streaming-window';
  budget: number;
  runtime: number;
  targetAudience: string;
  releaseStrategy: 'global' | 'regional' | 'limited';
  productionValue: 'low' | 'medium' | 'high' | 'premium';
  developmentStage: 'concept' | 'development' | 'production' | 'post' | 'ready' | 'released';
  expectedViews: number;
  subscriptionImpact: number; // Expected new subscriptions
  globalAppeal: number; // 0-100
}

const generateTVConcept = (): TVShowConcept => {
  const genres: Genre[] = ['action', 'comedy', 'drama', 'thriller', 'horror', 'sci-fi', 'fantasy', 'romance'];
  const formats = ['series', 'limited-series', 'miniseries', 'anthology'] as const;
  const platforms = ['network', 'cable', 'streaming', 'premium'] as const;
  
  const genre = genres[Math.floor(Math.random() * genres.length)];
  const format = formats[Math.floor(Math.random() * formats.length)];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  
  const episodeCounts = {
    'series': 10 + Math.floor(Math.random() * 12), // 10-22 episodes
    'limited-series': 6 + Math.floor(Math.random() * 4), // 6-10 episodes
    'miniseries': 4 + Math.floor(Math.random() * 3), // 4-6 episodes
    'anthology': 8 + Math.floor(Math.random() * 6) // 8-14 episodes
  };

  const episodeLengths = {
    'network': 42, // Network TV with commercials
    'cable': 48, // Cable TV
    'streaming': 35 + Math.floor(Math.random() * 25), // 35-60 minutes
    'premium': 50 + Math.floor(Math.random() * 20) // 50-70 minutes
  };

  const episodes = episodeCounts[format];
  const episodeLength = episodeLengths[platform];
  const seasons = format === 'series' ? 1 + Math.floor(Math.random() * 5) : 1;
  
  const baseBudgetPerEpisode = {
    'network': 1500000,
    'cable': 2000000,
    'streaming': 2500000,
    'premium': 4000000
  }[platform];

  const seasonBudget = episodes * baseBudgetPerEpisode * (0.8 + Math.random() * 0.4);
  const totalBudget = seasonBudget * seasons;

  const titles = [
    'Dark Harbor', 'City of Shadows', 'The Last Stand', 'Breaking Point',
    'Hidden Truth', 'Night Watch', 'The Underground', 'Parallel Lives',
    'Code Red', 'Silent Partners', 'The Network', 'Blood Lines',
    'Mind Games', 'Power Play', 'The Divide', 'Crossroads',
    'Deep Cover', 'The Alliance', 'Ghost Protocol', 'Final Hour'
  ];

  const premises = [
    'A gripping tale of corruption and justice in a major metropolitan police department.',
    'Exploring the complex relationships between ordinary people facing extraordinary circumstances.',
    'A psychological thriller that blurs the line between reality and paranoia.',
    'Following interconnected stories of ambition, love, and betrayal in the corporate world.',
    'A character-driven drama about family secrets spanning multiple generations.',
    'High-stakes action and political intrigue in the world of international espionage.',
    'A supernatural mystery series set in a small town with dark secrets.',
    'Exploring themes of identity and belonging in a rapidly changing society.'
  ];

  const demographics = [
    'Adults 18-49', 'Adults 25-54', 'Young Adults 18-34', 'Premium Viewers 25-54',
    'Global Audience', 'Educated Urban Viewers', 'Genre Enthusiasts', 'Broad Family Audience'
  ];

  return {
    id: `tv-${Date.now()}-${Math.random()}`,
    title: titles[Math.floor(Math.random() * titles.length)],
    genre,
    format,
    platform,
    episodes,
    episodeLength,
    seasons,
    seasonBudget,
    totalBudget,
    targetDemographic: demographics[Math.floor(Math.random() * demographics.length)],
    premise: premises[Math.floor(Math.random() * premises.length)],
    developmentStage: 'pitch',
    renewalPotential: 40 + Math.floor(Math.random() * 40),
    criticalExpectations: 50 + Math.floor(Math.random() * 40),
    commercialExpectations: 50 + Math.floor(Math.random() * 40)
  };
};

const generateStreamingFeature = (): StreamingFeature => {
  const genres: Genre[] = ['action', 'comedy', 'drama', 'thriller', 'horror', 'sci-fi', 'fantasy', 'romance'];
  const types = ['feature', 'documentary', 'special', 'concert'] as const;
  const platforms = ['streaming-exclusive', 'day-and-date', 'streaming-window'] as const;
  const productionValues = ['low', 'medium', 'high', 'premium'] as const;
  const releaseStrategies = ['global', 'regional', 'limited'] as const;

  const type = types[Math.floor(Math.random() * types.length)];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  const productionValue = productionValues[Math.floor(Math.random() * productionValues.length)];
  
  const budgetRanges = {
    'low': [500000, 2000000],
    'medium': [2000000, 8000000],
    'high': [8000000, 25000000],
    'premium': [25000000, 80000000]
  };

  const [minBudget, maxBudget] = budgetRanges[productionValue];
  const budget = minBudget + Math.floor(Math.random() * (maxBudget - minBudget));

  const runtimes = {
    'feature': 90 + Math.floor(Math.random() * 60), // 90-150 minutes
    'documentary': 75 + Math.floor(Math.random() * 45), // 75-120 minutes
    'special': 60 + Math.floor(Math.random() * 30), // 60-90 minutes
    'concert': 90 + Math.floor(Math.random() * 60) // 90-150 minutes
  };

  const titles = [
    'The Last Mission', 'Breaking Through', 'Hidden Depths', 'Mind Over Matter',
    'The Road Less Traveled', 'Uncharted Waters', 'Against All Odds', 'New Horizons',
    'The Perfect Storm', 'Breakthrough Moment', 'The Journey Home', 'Rising Phoenix',
    'Untold Stories', 'Beyond the Horizon', 'The Final Chapter', 'New Beginnings'
  ];

  const audiences = [
    'Global Mainstream', 'Adult Contemporary', 'Young Adult', 'Family Friendly',
    'Genre Fans', 'International Markets', 'Art House', 'Commercial Appeal'
  ];

  return {
    id: `stream-${Date.now()}-${Math.random()}`,
    title: titles[Math.floor(Math.random() * titles.length)],
    genre: genres[Math.floor(Math.random() * genres.length)],
    type,
    platform,
    budget,
    runtime: runtimes[type],
    targetAudience: audiences[Math.floor(Math.random() * audiences.length)],
    releaseStrategy: releaseStrategies[Math.floor(Math.random() * releaseStrategies.length)],
    productionValue,
    developmentStage: 'concept',
    expectedViews: 1000000 + Math.floor(Math.random() * 20000000),
    subscriptionImpact: Math.floor(Math.random() * 500000),
    globalAppeal: 40 + Math.floor(Math.random() * 50)
  };
};

export const TelevisionStreamingSystem: React.FC<TelevisionStreamingProps> = ({
  gameState: propGameState,
  onProjectCreate: propOnProjectCreate,
}) => {
  const storeGameState = useGameStore((s) => s.game);

  const gameState = propGameState ?? storeGameState;
  const onProjectCreate = propOnProjectCreate ?? (() => {});
  const [tvConcepts, setTvConcepts] = useState<TVShowConcept[]>([]);
  const [streamingFeatures, setStreamingFeatures] = useState<StreamingFeature[]>([]);
  const [selectedView, setSelectedView] = useState<'tv' | 'streaming'>('tv');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate background TV and streaming content
  useEffect(() => {
    if (!gameState) return;

    const generateBackgroundContent = () => {
      // Generate TV concepts weekly
      if (Math.random() < 0.3) { // 30% chance per week
        setTvConcepts(prev => {
          const newConcept = generateTVConcept();
          return [...prev.slice(-9), newConcept]; // Keep last 10
        });
      }

      // Generate streaming features
      if (Math.random() < 0.2) { // 20% chance per week
        setStreamingFeatures(prev => {
          const newFeature = generateStreamingFeature();
          return [...prev.slice(-14), newFeature]; // Keep last 15
        });
      }
    };

    generateBackgroundContent();
  }, [gameState?.currentWeek, gameState?.currentYear]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading television & streaming...</div>;
  }

  const handleDevelopTVShow = (concept: TVShowConcept) => {
    setIsGenerating(true);
    
    // Convert TV concept to project
    const tvProject: Partial<Project> = {
      title: concept.title,
      type: concept.format === 'series' ? 'series' : 'limited-series',
      script: {
        id: `script-${concept.id}`,
        title: concept.title,
        genre: concept.genre,
        logline: concept.premise,
        writer: 'TV Writing Team',
        pages: concept.episodes * (concept.episodeLength / 2), // Rough page estimate
        quality: 60 + Math.floor(Math.random() * 30),
        budget: concept.seasonBudget,
        developmentStage: 'concept',
        themes: ['drama', 'character development'],
        targetAudience: concept.targetDemographic.includes('Family') ? 'family' : 'general',
        estimatedRuntime: concept.episodeLength,
        characteristics: {
          tone: 'balanced',
          pacing: 'episodic',
          dialogue: 'naturalistic',
          visualStyle: 'realistic',
          commercialAppeal: Math.floor(concept.commercialExpectations / 10),
          criticalPotential: Math.floor(concept.criticalExpectations / 10),
          cgiIntensity: concept.genre === 'sci-fi' || concept.genre === 'fantasy' ? 'moderate' : 'minimal'
        }
      },
      budget: {
        total: concept.seasonBudget,
        allocated: {
          aboveTheLine: concept.seasonBudget * 0.3,
          belowTheLine: concept.seasonBudget * 0.4,
          postProduction: concept.seasonBudget * 0.15,
          marketing: concept.seasonBudget * 0.1,
          distribution: concept.seasonBudget * 0.03,
          contingency: concept.seasonBudget * 0.02
        },
        spent: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0
        },
        overages: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0
        }
      },
      status: 'development',
      currentPhase: 'development'
    };

    onProjectCreate(tvProject);
    
    // Update concept status
    setTvConcepts(prev => prev.map(c => 
      c.id === concept.id ? { ...c, developmentStage: 'greenlit' } : c
    ));

    setIsGenerating(false);
  };

  const handleDevelopStreamingFeature = (feature: StreamingFeature) => {
    setIsGenerating(true);

    const streamingProject: Partial<Project> = {
      title: feature.title,
      type: feature.type === 'feature' ? 'feature' : 'documentary',
      script: {
        id: `script-${feature.id}`,
        title: feature.title,
        genre: feature.genre,
        logline: `A ${feature.type} designed for ${feature.platform} release`,
        writer: 'Streaming Content Team',
        pages: Math.floor(feature.runtime * 0.8), // Rough page estimate
        quality: 55 + Math.floor(Math.random() * 35),
        budget: feature.budget,
        developmentStage: 'concept',
        themes: ['contemporary', 'accessible'],
        targetAudience: feature.targetAudience.includes('Family') ? 'family' : 'general',
        estimatedRuntime: feature.runtime,
        characteristics: {
          tone: 'balanced',
          pacing: 'fast-paced',
          dialogue: 'naturalistic',
          visualStyle: feature.productionValue === 'premium' ? 'epic' : 'realistic',
          commercialAppeal: Math.floor(feature.globalAppeal / 10),
          criticalPotential: Math.floor((feature.globalAppeal + Math.random() * 20) / 10),
          cgiIntensity: feature.genre === 'sci-fi' || feature.genre === 'action' ? 'moderate' : 'minimal'
        }
      },
      budget: {
        total: feature.budget,
        allocated: {
          aboveTheLine: feature.budget * 0.25,
          belowTheLine: feature.budget * 0.45,
          postProduction: feature.budget * 0.18,
          marketing: feature.budget * 0.08,
          distribution: feature.budget * 0.02,
          contingency: feature.budget * 0.02
        },
        spent: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0
        },
        overages: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0
        }
      },
      status: 'development',
      currentPhase: 'development'
    };

    onProjectCreate(streamingProject);
    
    setStreamingFeatures(prev => prev.map(f => 
      f.id === feature.id ? { ...f, developmentStage: 'development' } : f
    ));

    setIsGenerating(false);
  };

  const getAvailableTVConcepts = () => tvConcepts.filter(c => c.developmentStage === 'pitch');
  const getAvailableStreamingFeatures = () => streamingFeatures.filter(f => f.developmentStage === 'concept');

  return (
    <div className="space-y-6">
      {/* Content Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Television & Streaming Development
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button 
              variant={selectedView === 'tv' ? 'default' : 'outline'}
              onClick={() => setSelectedView('tv')}
              className="flex items-center gap-2"
            >
              <Tv className="h-4 w-4" />
              TV Series
            </Button>
            <Button 
              variant={selectedView === 'streaming' ? 'default' : 'outline'}
              onClick={() => setSelectedView('streaming')}
              className="flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              Streaming Features
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{tvConcepts.length}</div>
              <div className="text-sm text-muted-foreground">TV Concepts</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{streamingFeatures.length}</div>
              <div className="text-sm text-muted-foreground">Streaming Features</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {gameState.projects.filter(p => p.type === 'series' || p.type === 'limited-series').length}
              </div>
              <div className="text-sm text-muted-foreground">Active TV Projects</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {gameState.projects.filter(p => p.type === 'feature' && p.budget.total < 50000000).length}
              </div>
              <div className="text-sm text-muted-foreground">Streaming Projects</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TV Series Concepts */}
      {selectedView === 'tv' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tv className="h-5 w-5" />
              Available TV Series Concepts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getAvailableTVConcepts().length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No TV concepts available. New concepts appear weekly.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getAvailableTVConcepts().map(concept => (
                  <div key={concept.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{concept.title}</h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {concept.format} • {concept.platform} • {concept.genre}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {concept.episodes} eps
                      </Badge>
                    </div>
                    
                    <p className="text-sm mb-3 line-clamp-2">{concept.premise}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Season Budget:</span>
                        <span>${concept.seasonBudget.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Target:</span>
                        <span>{concept.targetDemographic}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Renewal Potential:</span>
                        <span>{concept.renewalPotential}%</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span>Critical Expectations</span>
                        <span>{concept.criticalExpectations}%</span>
                      </div>
                      <Progress value={concept.criticalExpectations} className="h-1" />
                      
                      <div className="flex items-center justify-between text-xs">
                        <span>Commercial Expectations</span>
                        <span>{concept.commercialExpectations}%</span>
                      </div>
                      <Progress value={concept.commercialExpectations} className="h-1" />
                    </div>

                    <Button 
                      onClick={() => handleDevelopTVShow(concept)}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? 'Developing...' : 'Develop Series'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Streaming Features */}
      {selectedView === 'streaming' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Available Streaming Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getAvailableStreamingFeatures().length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No streaming features available. New concepts appear regularly.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getAvailableStreamingFeatures().map(feature => (
                  <div key={feature.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {feature.type} • {feature.platform} • {feature.genre}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {feature.productionValue}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Budget:</span>
                        <span>${feature.budget.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Runtime:</span>
                        <span>{feature.runtime} min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Release:</span>
                        <span className="capitalize">{feature.releaseStrategy}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Expected Views:</span>
                        <span>{(feature.expectedViews / 1000000).toFixed(1)}M</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span>Global Appeal</span>
                        <span>{feature.globalAppeal}%</span>
                      </div>
                      <Progress value={feature.globalAppeal} className="h-1" />
                    </div>

                    <Button 
                      onClick={() => handleDevelopStreamingFeature(feature)}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? 'Developing...' : 'Develop Feature'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};