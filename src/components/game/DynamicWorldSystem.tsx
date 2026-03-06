import React, { useEffect, useState } from 'react';
import type { GameState, Studio, Project, TalentPerson } from '@/types/game';
import { useGameStore } from '@/game/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, AlertTriangle, Crown, Star } from 'lucide-react';

interface DynamicWorldSystemProps {
  gameState?: GameState;
  onWorldUpdate?: (updates: Partial<GameState>) => void;
  onStudioUpdate?: (updates: Partial<Studio>) => void;
}

export interface WorldEvent {
  id: string;
  type: 'trend_shift' | 'scandal' | 'breakthrough' | 'industry_change' | 'rivalry' | 'award_buzz';
  title: string;
  description: string;
  week: number;
  year: number;
  impact: {
    reputation?: number;
    genreBoost?: { genre: string; modifier: number; duration: number };
    talentAvailability?: { affectedTalents: string[]; weeks: number };
    marketShift?: { category: string; direction: 'up' | 'down'; strength: number };
  };
  duration: number;
  severity: 'minor' | 'moderate' | 'major';
}

export interface StudioRivalry {
  studioId: string;
  rivalStudioId: string;
  intensity: number; // 1-100
  history: {
    event: string;
    week: number;
    year: number;
    impactOnPlayer: number;
  }[];
  activeCompetition?: {
    type: 'box_office' | 'awards' | 'talent_war';
    target: string; // project ID or talent ID
    escalation: number;
  };
}

export interface MarketTrendData {
  genre: string;
  momentum: number; // -100 to 100
  popularity: number; // 0-100
  saturation: number; // 0-100
  weeklyChange: number;
  peakWeeks: number; // How long it's been trending
  cyclePrediction: 'rising' | 'peak' | 'declining' | 'trough';
}

export const DynamicWorldSystem: React.FC<DynamicWorldSystemProps> = ({
  gameState: propGameState,
  onWorldUpdate: propOnWorldUpdate,
  onStudioUpdate: propOnStudioUpdate,
}) => {
  const storeGameState = useGameStore((s) => s.game);
  const mergeGameState = useGameStore((s) => s.mergeGameState);
  const updateStudio = useGameStore((s) => s.updateStudio);

  const gameState = propGameState ?? storeGameState;
  const onWorldUpdate = propOnWorldUpdate ?? ((updates: Partial<GameState>) => mergeGameState(updates));
  const onStudioUpdate = propOnStudioUpdate ?? ((updates: Partial<Studio>) => updateStudio(updates));

  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [rivalries, setRivalries] = useState<StudioRivalry[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrendData[]>([]);
  const [industryBuzz, setIndustryBuzz] = useState<{
    hotProjects: string[];
    risingStars: string[];
    controversies: string[];
  }>({ hotProjects: [], risingStars: [], controversies: [] });

  // Initialize market trends
  useEffect(() => {
    if (marketTrends.length === 0) {
      const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary'];
      const initialTrends = genres.map(genre => ({
        genre,
        momentum: Math.random() * 40 - 20, // -20 to 20
        popularity: 30 + Math.random() * 40, // 30-70
        saturation: Math.random() * 30, // 0-30
        weeklyChange: 0,
        peakWeeks: 0,
        cyclePrediction: 'rising' as const
      }));
      setMarketTrends(initialTrends);
    }
  }, [marketTrends.length]);

  // Generate weekly world events
  const generateWorldEvent = (): WorldEvent | null => {
    if (!gameState) return null;

    const eventTypes = [
      {
        type: 'trend_shift' as const,
        weight: 30,
        generator: () => {
          const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance'];
          const genre = genres[Math.floor(Math.random() * genres.length)];
          const direction = Math.random() > 0.5 ? 'surge' : 'decline';
          return {
            title: `${genre} ${direction === 'surge' ? 'Renaissance' : 'Fatigue'}`,
            description: `Market analysis shows ${direction === 'surge' ? 'renewed interest' : 'declining appetite'} for ${genre.toLowerCase()} films`,
            impact: {
              genreBoost: { genre, modifier: direction === 'surge' ? 0.2 : -0.15, duration: 8 }
            },
            severity: 'moderate' as const,
            duration: 8
          };
        }
      },
      {
        type: 'scandal' as const,
        weight: 15,
        generator: () => {
          const scandals = [
            'Major studio executive scandal rocks industry',
            'Controversy over film content sparks debate',
            'Labor dispute affects production schedules',
            'Technology breakthrough changes filmmaking'
          ];
          const scandal = scandals[Math.floor(Math.random() * scandals.length)];
          return {
            title: 'Industry Scandal',
            description: scandal,
            impact: { reputation: -5, marketShift: { category: 'public_trust', direction: 'down' as const, strength: 10 } },
            severity: 'major' as const,
            duration: 6
          };
        }
      },
      {
        type: 'breakthrough' as const,
        weight: 20,
        generator: () => {
          const breakthroughs = [
            'New filming technology reduces production costs',
            'Streaming platform announces major content deal',
            'International market opens to more content',
            'Award season creates unexpected buzz'
          ];
          const breakthrough = breakthroughs[Math.floor(Math.random() * breakthroughs.length)];
          return {
            title: 'Industry Breakthrough',
            description: breakthrough,
            impact: { reputation: 3 },
            severity: 'moderate' as const,
            duration: 4
          };
        }
      },
      {
        type: 'rivalry' as const,
        weight: 25,
        generator: () => {
          return {
            title: 'Studio Competition Heats Up',
            description: 'Rival studios are making aggressive moves in the market',
            impact: { marketShift: { category: 'competition', direction: 'up' as const, strength: 15 } },
            severity: 'moderate' as const,
            duration: 6
          };
        }
      }
    ];

    // 30% chance per week to generate an event
    if (Math.random() < 0.3) {
      const totalWeight = eventTypes.reduce((sum, type) => sum + type.weight, 0);
      const random = Math.random() * totalWeight;
      let currentWeight = 0;
      
      for (const eventType of eventTypes) {
        currentWeight += eventType.weight;
        if (random <= currentWeight) {
          const baseEvent = eventType.generator();
          return {
            id: `event-${Date.now()}-${Math.random()}`,
            type: eventType.type,
            ...baseEvent,
            week: gameState.currentWeek,
            year: gameState.currentYear
          };
        }
      }
    }
    
    return null;
  };

  // Update market trends based on world events and natural cycles
  const updateMarketTrends = () => {
    if (!gameState) return;

    setMarketTrends(prev => prev.map(trend => {
      let newMomentum = trend.momentum;
      let newPopularity = trend.popularity;
      let newSaturation = trend.saturation;
      
      // Natural market cycles
      const cycleAdjustment = Math.sin((gameState.currentWeek + gameState.currentYear * 52) * 0.1) * 2;
      newMomentum += cycleAdjustment + (Math.random() * 4 - 2); // Some randomness
      
      // Apply genre boost from world events
      const activeEvents = worldEvents.filter(e => 
        e.impact.genreBoost?.genre === trend.genre &&
        (gameState.currentWeek - e.week + (gameState.currentYear - e.year) * 52) < e.duration
      );
      
      activeEvents.forEach(event => {
        if (event.impact.genreBoost) {
          newMomentum += event.impact.genreBoost.modifier * 10;
        }
      });
      
      // Update popularity based on momentum
      newPopularity = Math.max(10, Math.min(90, newPopularity + newMomentum * 0.1));
      
      // Update saturation based on recent player projects
      const recentProjects = gameState.projects.filter(p => 
        p.script?.genre === trend.genre && 
        p.status === 'released' &&
        (gameState.currentWeek - (p.releaseWeek || 0) + (gameState.currentYear - (p.releaseYear || 0)) * 52) < 12
      );
      newSaturation = Math.min(100, newSaturation + recentProjects.length * 5);
      
      // Decay saturation over time
      newSaturation = Math.max(0, newSaturation - 2);
      
      // Clamp momentum
      newMomentum = Math.max(-50, Math.min(50, newMomentum));
      
      const weeklyChange = newPopularity - trend.popularity;
      
      // Determine cycle prediction
      let cyclePrediction: MarketTrendData['cyclePrediction'] = 'rising';
      if (newMomentum > 10) cyclePrediction = 'rising';
      else if (newMomentum > -10 && newPopularity > 70) cyclePrediction = 'peak';
      else if (newMomentum < -10) cyclePrediction = 'declining';
      else if (newPopularity < 30) cyclePrediction = 'trough';
      
      return {
        ...trend,
        momentum: newMomentum,
        popularity: newPopularity,
        saturation: newSaturation,
        weeklyChange,
        peakWeeks: cyclePrediction === 'peak' ? trend.peakWeeks + 1 : 0,
        cyclePrediction
      };
    }));
  };

  // Generate studio rivalries based on competition
  const updateRivalries = () => {
    if (!gameState) return;

    // Find competing projects (same genre, similar release dates)
    const playerProjects = gameState.projects.filter(p => p.status === 'released');
    const aiStudioIds: string[] = []; // Will be populated when AI studios are implemented
    
    aiStudioIds.forEach(rivalId => {
      const existing = rivalries.find(r => r.rivalStudioId === rivalId);
      const competingProjects = playerProjects.filter(pp => {
        // Check if AI studio had a competing project
        return false; // Will be populated when AI projects are implemented
      });
      
      if (competingProjects.length > 0 && !existing) {
        const newRivalry: StudioRivalry = {
          studioId: gameState.studio.id,
          rivalStudioId: rivalId,
          intensity: Math.min(100, competingProjects.length * 20),
          history: competingProjects.map(p => ({
            event: `Competing ${p.script?.genre} films released`,
            week: p.releaseWeek || gameState.currentWeek,
            year: p.releaseYear || gameState.currentYear,
            impactOnPlayer: (p.metrics?.boxOfficeTotal || 0) > 100000000 ? 5 : -5
          }))
        };
        setRivalries(prev => [...prev, newRivalry]);
      }
    });
  };

  // Update industry buzz
  const updateIndustryBuzz = () => {
    if (!gameState) return;

    const recentlyReleased = gameState.projects.filter(p => 
      p.status === 'released' &&
      (gameState.currentWeek - (p.releaseWeek || 0) + (gameState.currentYear - (p.releaseYear || 0)) * 52) < 4
    );
    
    const hotProjects = recentlyReleased
      .filter(p => (p.metrics?.boxOfficeTotal || 0) > p.budget.total * 2)
      .map(p => p.id)
      .slice(0, 3);
    
    const risingStars = gameState.talent
      .filter(t => t.reputation > 70 && t.age < 35)
      .sort((a, b) => b.reputation - a.reputation)
      .map(t => t.id)
      .slice(0, 2);
    
    setIndustryBuzz({ hotProjects, risingStars, controversies: [] });
  };

  // Main weekly update function
  const processWeeklyUpdate = () => {
    if (!gameState) return;

    // Generate new world event
    const newEvent = generateWorldEvent();
    if (newEvent) {
      setWorldEvents(prev => [...prev.slice(-10), newEvent]); // Keep last 10 events
    }
    
    // Update all systems
    updateMarketTrends();
    updateRivalries();
    updateIndustryBuzz();
    
    // Apply event impacts
    worldEvents.forEach(event => {
      const weeksSinceEvent = gameState.currentWeek - event.week + (gameState.currentYear - event.year) * 52;
      if (weeksSinceEvent <= event.duration && event.impact.reputation) {
        onStudioUpdate({ reputation: (gameState.studio.reputation || 50) + event.impact.reputation });
      }
    });
  };

  // Process updates when week advances
  useEffect(() => {
    if (!gameState) return;
    processWeeklyUpdate();
  }, [gameState?.currentWeek, gameState?.currentYear]);

  const getActiveTrends = () => marketTrends.filter(t => Math.abs(t.momentum) > 5);
  const getActiveEvents = () => {
    if (!gameState) return [];
    return worldEvents.filter(e => 
      (gameState.currentWeek - e.week + (gameState.currentYear - e.year) * 52) < e.duration
    );
  };

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading world simulation...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Market Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getActiveTrends().map(trend => (
              <div key={trend.genre} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{trend.genre}</div>
                  <div className="text-sm text-muted-foreground">
                    {trend.cyclePrediction} • {trend.popularity.toFixed(0)}% popular
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {trend.momentum > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    trend.momentum > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trend.momentum > 0 ? '+' : ''}{trend.momentum.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active World Events */}
      {getActiveEvents().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Industry News
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getActiveEvents().map(event => (
                <div key={event.id} className="flex items-start gap-3 p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">{event.description}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Week {event.week}, {event.year} • {event.duration - (gameState.currentWeek - event.week)} weeks remaining
                    </div>
                  </div>
                  <Badge variant={
                    event.severity === 'major' ? 'destructive' : 
                    event.severity === 'moderate' ? 'default' : 'outline'
                  }>
                    {event.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Studio Rivalries */}
      {rivalries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Studio Rivalries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rivalries.map(rivalry => (
                <div key={rivalry.rivalStudioId} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">
                      Competition with Studio {rivalry.rivalStudioId}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {rivalry.history.length} competitive encounters
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm">Intensity:</div>
                    <div className="w-16 h-2 bg-muted rounded-full">
                      <div 
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${rivalry.intensity}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{rivalry.intensity}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Buzz */}
      {(industryBuzz.hotProjects.length > 0 || industryBuzz.risingStars.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Industry Buzz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {industryBuzz.hotProjects.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Hot Projects</h4>
                  {industryBuzz.hotProjects.map(projectId => {
                    const project = gameState.projects.find(p => p.id === projectId);
                    return project ? (
                      <div key={projectId} className="text-sm text-muted-foreground">
                        "{project.title}" - Breaking box office records
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              
              {industryBuzz.risingStars.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Rising Stars</h4>
                  {industryBuzz.risingStars.map(talentId => {
                    const talent = gameState.talent.find(t => t.id === talentId);
                    return talent ? (
                      <div key={talentId} className="text-sm text-muted-foreground">
                        {talent.name} - Industry attention growing
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};