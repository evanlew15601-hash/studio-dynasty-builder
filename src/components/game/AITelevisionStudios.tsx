import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GameState, TalentPerson } from '@/types/game';
import { TVShowScript } from './TVShowDevelopment';
import { TVShowProject } from './TVProductionManagement';
import { Building, Tv, Users, TrendingUp, Calendar, Star } from 'lucide-react';

interface AITVStudio {
  id: string;
  name: string;
  reputation: number;
  budget: number;
  specialty: string[];
  formatPreference: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  activeTVShows: AITVShow[];
  completedTVShows: AITVShow[];
  strategy: {
    targetBudget: { min: number; max: number };
    showsPerYear: number;
    talentStrategy: 'established' | 'emerging' | 'mixed';
    contentFocus: 'original' | 'franchise' | 'adaptation' | 'mixed';
  };
  networks: string[]; // Networks they work with
}

interface AITVShow {
  id: string;
  studioId: string;
  studioName: string;
  title: string;
  genre: string;
  format: 'sitcom' | 'drama' | 'reality' | 'documentary' | 'limited-series' | 'anthology';
  status: 'development' | 'pre-production' | 'production' | 'post-production' | 'airing' | 'completed';
  developmentWeek: number;
  developmentYear: number;
  airWeek?: number;
  airYear?: number;
  episodeCount: number;
  budget: {
    perEpisode: number;
    totalSeason: number;
  };
  cast: Array<{
    talentId: string;
    role: string;
    salary: number;
  }>;
  performance?: {
    viewership: number; // millions
    criticsScore: number;
    audienceScore: number;
    awards: string[];
  };
  phase: {
    current: string;
    duration: number;
    weeksRemaining: number;
  };
  network: string;
  quality: number;
}

interface AITelevisionStudiosProps {
  gameState: GameState;
  onTalentCommitmentChange?: (talentId: string, busy: boolean, project?: string) => void;
}

export const AITelevisionStudios: React.FC<AITelevisionStudiosProps> = ({
  gameState,
  onTalentCommitmentChange
}) => {
  const [aiTVStudios, setAITVStudios] = useState<AITVStudio[]>([]);
  const [viewMode, setViewMode] = useState<'studios' | 'shows' | 'market'>('studios');

  useEffect(() => {
    if (aiTVStudios.length === 0) {
      initializeAITVStudios();
    }
  }, []);

  useEffect(() => {
    processWeeklyAITVActivity();
  }, [gameState.currentWeek, gameState.currentYear]);

  const initializeAITVStudios = () => {
    const tvStudioTemplates = [
      {
        name: 'HBO Productions',
        reputation: 90,
        budget: 300000000,
        specialty: ['prestige', 'drama'],
        formatPreference: ['drama', 'limited-series'],
        riskTolerance: 'moderate' as const,
        strategy: {
          targetBudget: { min: 3000000, max: 15000000 },
          showsPerYear: 4,
          talentStrategy: 'established' as const,
          contentFocus: 'original' as const
        },
        networks: ['HBO', 'HBO Max']
      },
      {
        name: 'Netflix TV Studios',
        reputation: 82,
        budget: 800000000,
        specialty: ['volume', 'global'],
        formatPreference: ['drama', 'reality', 'documentary'],
        riskTolerance: 'aggressive' as const,
        strategy: {
          targetBudget: { min: 1000000, max: 10000000 },
          showsPerYear: 15,
          talentStrategy: 'mixed' as const,
          contentFocus: 'mixed' as const
        },
        networks: ['Netflix']
      },
      {
        name: 'Disney Television',
        reputation: 85,
        budget: 500000000,
        specialty: ['family', 'franchise'],
        formatPreference: ['sitcom', 'drama'],
        riskTolerance: 'conservative' as const,
        strategy: {
          targetBudget: { min: 2000000, max: 8000000 },
          showsPerYear: 8,
          talentStrategy: 'established' as const,
          contentFocus: 'franchise' as const
        },
        networks: ['Disney+', 'ABC']
      },
      {
        name: 'FX Productions',
        reputation: 88,
        budget: 200000000,
        specialty: ['edgy', 'experimental'],
        formatPreference: ['drama', 'anthology'],
        riskTolerance: 'aggressive' as const,
        strategy: {
          targetBudget: { min: 2000000, max: 12000000 },
          showsPerYear: 6,
          talentStrategy: 'emerging' as const,
          contentFocus: 'original' as const
        },
        networks: ['FX', 'FX on Hulu']
      },
      {
        name: 'CBS Studios',
        reputation: 75,
        budget: 350000000,
        specialty: ['procedural', 'mainstream'],
        formatPreference: ['drama', 'sitcom'],
        riskTolerance: 'conservative' as const,
        strategy: {
          targetBudget: { min: 1500000, max: 6000000 },
          showsPerYear: 12,
          talentStrategy: 'established' as const,
          contentFocus: 'original' as const
        },
        networks: ['CBS', 'CBS All Access']
      }
    ];

    const studios = tvStudioTemplates.map((template, index) => ({
      id: `ai-tv-studio-${index}`,
      ...template,
      activeTVShows: [],
      completedTVShows: []
    }));

    setAITVStudios(studios);
    console.log('📺 Initialized AI TV Studios:', studios.length);
  };

  const processWeeklyAITVActivity = () => {
    setAITVStudios(prev => prev.map(studio => {
      let updatedStudio = { ...studio };

      // Advance existing shows
      updatedStudio.activeTVShows = studio.activeTVShows.map(show => {
        let updatedShow = { ...show };
        
        if (updatedShow.phase.weeksRemaining > 0) {
          updatedShow.phase.weeksRemaining--;
        }
        
        if (updatedShow.phase.weeksRemaining === 0) {
          updatedShow = advanceAITVShowPhase(updatedShow);
        }
        
        return updatedShow;
      });

      // Create new shows based on strategy
      const shouldCreateShow = Math.random() < (studio.strategy.showsPerYear / 52); // Weekly probability
      if (shouldCreateShow && updatedStudio.activeTVShows.length < 6) {
        const newShow = createAITVShow(studio, gameState.currentWeek, gameState.currentYear);
        if (newShow) {
          updatedStudio.activeTVShows.push(newShow);
        }
      }

      // Move completed shows
      const completedShows = updatedStudio.activeTVShows.filter(s => s.status === 'completed');
      updatedStudio.completedTVShows.push(...completedShows);
      updatedStudio.activeTVShows = updatedStudio.activeTVShows.filter(s => s.status !== 'completed');

      return updatedStudio;
    }));
  };

  const createAITVShow = (studio: AITVStudio, week: number, year: number): AITVShow | null => {
    const format = studio.formatPreference[Math.floor(Math.random() * studio.formatPreference.length)] as any;
    const genre = studio.specialty.includes('drama') ? 'drama' : 
                 studio.specialty.includes('comedy') ? 'comedy' : 'drama';
    
    const episodeCount = format === 'sitcom' ? 22 : 
                       format === 'limited-series' ? 6 : 
                       Math.floor(Math.random() * 8) + 8; // 8-16 episodes
    
    const perEpisodeBudget = studio.strategy.targetBudget.min + 
      Math.random() * (studio.strategy.targetBudget.max - studio.strategy.targetBudget.min);

    const titles = [
      'Dark Waters', 'City Lights', 'The Last Stand', 'Midnight Hour', 'Rising Tide',
      'Broken Crown', 'Silent Echo', 'Golden Age', 'Steel Hearts', 'Neon Dreams',
      'Shadow Game', 'Time Runners', 'Lost Paradise', 'Iron Will', 'Crystal Peak'
    ];
    
    const title = titles[Math.floor(Math.random() * titles.length)];
    const network = studio.networks[Math.floor(Math.random() * studio.networks.length)];

    return {
      id: `ai-tv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studioId: studio.id,
      studioName: studio.name,
      title: title,
      genre: genre,
      format: format,
      status: 'development',
      developmentWeek: week,
      developmentYear: year,
      episodeCount: episodeCount,
      budget: {
        perEpisode: perEpisodeBudget,
        totalSeason: perEpisodeBudget * episodeCount
      },
      cast: [],
      phase: {
        current: 'development',
        duration: 6, // 6 weeks development
        weeksRemaining: 6
      },
      network: network,
      quality: 50 + Math.random() * 30 + (studio.reputation - 75) * 0.5 // 50-80 + studio bonus
    };
  };

  const advanceAITVShowPhase = (show: AITVShow): AITVShow => {
    switch (show.status) {
      case 'development':
        return {
          ...show,
          status: 'pre-production',
          phase: {
            current: 'pre-production',
            duration: 4,
            weeksRemaining: 4
          }
        };
      case 'pre-production':
        // Cast talent automatically
        const castShow = castAITVShow(show);
        return {
          ...castShow,
          status: 'production',
          phase: {
            current: 'production',
            duration: Math.ceil(show.episodeCount * 0.7),
            weeksRemaining: Math.ceil(show.episodeCount * 0.7)
          }
        };
      case 'production':
        return {
          ...show,
          status: 'post-production',
          phase: {
            current: 'post-production',
            duration: Math.ceil(show.episodeCount * 0.4),
            weeksRemaining: Math.ceil(show.episodeCount * 0.4)
          }
        };
      case 'post-production':
        return {
          ...show,
          status: 'airing',
          airWeek: gameState.currentWeek,
          airYear: gameState.currentYear,
          phase: {
            current: 'airing',
            duration: show.episodeCount, // 1 week per episode
            weeksRemaining: show.episodeCount
          },
          performance: {
            viewership: Math.random() * 8 + 2, // 2-10M viewers
            criticsScore: Math.random() * 40 + 60, // 60-100
            audienceScore: Math.random() * 30 + 70, // 70-100
            awards: []
          }
        };
      case 'airing':
        return {
          ...show,
          status: 'completed',
          phase: {
            current: 'completed',
            duration: 0,
            weeksRemaining: 0
          }
        };
      default:
        return show;
    }
  };

  const castAITVShow = (show: AITVShow): AITVShow => {
    const availableTalent = gameState.talent.filter(t => 
      t.type === 'actor' && 
      !getAllBusyTalentIds().has(t.id)
    );

    const castCount = Math.min(3, availableTalent.length);
    const selectedTalent = availableTalent
      .sort(() => Math.random() - 0.5)
      .slice(0, castCount);

    const cast = selectedTalent.map((talent, index) => {
      const role = index === 0 ? 'Lead Character' : `Supporting Character ${index}`;
      const salary = talent.marketValue * 0.4; // TV pays less than films
      
      // Mark talent as busy
      onTalentCommitmentChange?.(talent.id, true, `TV: ${show.title}`);
      
      return {
        talentId: talent.id,
        role: role,
        salary: salary
      };
    });

    return {
      ...show,
      cast: cast
    };
  };

  const getAllBusyTalentIds = (): Set<string> => {
    const busyIds = new Set<string>();
    
    aiTVStudios.forEach(studio => {
      studio.activeTVShows.forEach(show => {
        show.cast.forEach(member => {
          busyIds.add(member.talentId);
        });
      });
    });
    
    return busyIds;
  };

  const getMarketStats = () => {
    const allActiveShows = aiTVStudios.flatMap(s => s.activeTVShows);
    const allCompletedShows = aiTVStudios.flatMap(s => s.completedTVShows);
    
    const totalShows = allActiveShows.length;
    const airingShows = allActiveShows.filter(s => s.status === 'airing').length;
    const avgViewership = allActiveShows
      .filter(s => s.performance?.viewership)
      .reduce((sum, s) => sum + (s.performance?.viewership || 0), 0) / Math.max(airingShows, 1);
    
    return { 
      totalShows, 
      airingShows, 
      avgViewership,
      completedShows: allCompletedShows.length 
    };
  };

  const marketStats = getMarketStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            AI Television Studios
          </h2>
          <p className="text-muted-foreground">Monitor competitive TV production landscape</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={viewMode === 'studios' ? 'default' : 'outline'} 
                 className="cursor-pointer" 
                 onClick={() => setViewMode('studios')}>
            Studios
          </Badge>
          <Badge variant={viewMode === 'shows' ? 'default' : 'outline'} 
                 className="cursor-pointer" 
                 onClick={() => setViewMode('shows')}>
            Shows
          </Badge>
          <Badge variant={viewMode === 'market' ? 'default' : 'outline'} 
                 className="cursor-pointer" 
                 onClick={() => setViewMode('market')}>
            Market
          </Badge>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">AI Studios</span>
            </div>
            <p className="text-2xl font-bold">{aiTVStudios.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Active Shows</span>
            </div>
            <p className="text-2xl font-bold">{marketStats.totalShows}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Currently Airing</span>
            </div>
            <p className="text-2xl font-bold">{marketStats.airingShows}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Avg Viewership</span>
            </div>
            <p className="text-2xl font-bold">{marketStats.avgViewership.toFixed(1)}M</p>
          </CardContent>
        </Card>
      </div>

      {/* Studios View */}
      {viewMode === 'studios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aiTVStudios.map(studio => (
            <Card key={studio.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{studio.name}</span>
                  <Badge variant="outline">Rep: {studio.reputation}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Active Shows: </span>
                    <span>{studio.activeTVShows.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed: </span>
                    <span>{studio.completedTVShows.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Budget: </span>
                    <span>${(studio.budget / 1000000).toFixed(0)}M</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shows/Year: </span>
                    <span>{studio.strategy.showsPerYear}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {studio.specialty.map(spec => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {studio.formatPreference.map(format => (
                      <Badge key={format} variant="outline" className="text-xs">
                        {format}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Current Productions</div>
                  {studio.activeTVShows.slice(0, 2).map(show => (
                    <div key={show.id} className="text-xs p-2 bg-muted rounded">
                      <div className="font-medium">{show.title}</div>
                      <div className="text-muted-foreground">{show.status} • {show.network}</div>
                    </div>
                  ))}
                  {studio.activeTVShows.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{studio.activeTVShows.length - 2} more...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Shows View */}
      {viewMode === 'shows' && (
        <div className="space-y-4">
          {aiTVStudios.map(studio => (
            <Card key={studio.id}>
              <CardHeader>
                <CardTitle>{studio.name} Productions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studio.activeTVShows.map(show => (
                    <Card key={show.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{show.title}</h4>
                          <p className="text-sm text-muted-foreground">{show.genre} • {show.format}</p>
                        </div>
                        <Badge variant={show.status === 'airing' ? 'default' : 'outline'}>
                          {show.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span>{show.phase.current}</span>
                          <span>{show.phase.weeksRemaining}w left</span>
                        </div>
                        <Progress 
                          value={((show.phase.duration - show.phase.weeksRemaining) / show.phase.duration) * 100} 
                          className="h-1" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Episodes: </span>
                          <span>{show.episodeCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Network: </span>
                          <span>{show.network}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Budget: </span>
                          <span>${(show.budget.perEpisode / 1000000).toFixed(1)}M</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cast: </span>
                          <span>{show.cast.length}</span>
                        </div>
                      </div>

                      {show.performance && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Viewers: </span>
                              <span>{show.performance.viewership.toFixed(1)}M</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Critics: </span>
                              <span>{show.performance.criticsScore.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};