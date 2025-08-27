import React, { useEffect, useState } from 'react';
import { GameState, Studio, Project, TalentPerson } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, Users, TrendingUp, Clock, Star } from 'lucide-react';

interface BackgroundSimulationProps {
  gameState: GameState;
  onWorldUpdate: (updates: Partial<GameState>) => void;
  onStudioUpdate: (updates: Partial<Studio>) => void;
}

interface BackgroundActivity {
  id: string;
  type: 'talent_development' | 'market_shift' | 'competitor_move' | 'technology_advance' | 'social_trend';
  description: string;
  progress: number;
  impact: string;
  weekStarted: number;
  yearStarted: number;
  duration: number;
  intensity: number; // 1-100
}

interface CompetitorActivity {
  studioId: string;
  activity: 'developing_project' | 'signing_talent' | 'marketing_campaign' | 'acquiring_ip' | 'expansion';
  details: string;
  competitiveness: number;
  timeline: number; // weeks to completion
}

interface TalentEvolution {
  talentId: string;
  trajectory: 'rising' | 'stable' | 'declining' | 'breakthrough' | 'controversy';
  momentum: number; // -100 to 100
  careerEvents: {
    event: string;
    impact: number;
    week: number;
    year: number;
  }[];
}

interface MarketUndercurrent {
  sector: 'streaming' | 'theatrical' | 'international' | 'genre_fusion' | 'technology';
  trend: string;
  strength: number; // 1-100
  growth: number; // weekly change
  maturity: number; // weeks since emergence
}

export const BackgroundSimulation: React.FC<BackgroundSimulationProps> = ({
  gameState,
  onWorldUpdate,
  onStudioUpdate
}) => {
  const [backgroundActivities, setBackgroundActivities] = useState<BackgroundActivity[]>([]);
  const [competitorActivities, setCompetitorActivities] = useState<CompetitorActivity[]>([]);
  const [talentEvolution, setTalentEvolution] = useState<TalentEvolution[]>([]);
  const [marketUndercurrents, setMarketUndercurrents] = useState<MarketUndercurrent[]>([]);
  const [simulationIntensity, setSimulationIntensity] = useState(75); // How active the background is

  // Initialize background systems
  useEffect(() => {
    initializeBackgroundSystems();
  }, []);

  const initializeBackgroundSystems = () => {
    // Initialize market undercurrents
    const undercurrents: MarketUndercurrent[] = [
      {
        sector: 'streaming',
        trend: 'Premium content consolidation',
        strength: 60 + Math.random() * 30,
        growth: Math.random() * 4 - 2,
        maturity: Math.floor(Math.random() * 20)
      },
      {
        sector: 'international',
        trend: 'Cross-cultural storytelling demand',
        strength: 40 + Math.random() * 40,
        growth: Math.random() * 3,
        maturity: Math.floor(Math.random() * 15)
      },
      {
        sector: 'technology',
        trend: 'AI-assisted production tools',
        strength: 30 + Math.random() * 50,
        growth: Math.random() * 5 - 1,
        maturity: Math.floor(Math.random() * 10)
      }
    ];
    setMarketUndercurrents(undercurrents);

    // Initialize talent evolution tracking
    const topTalent = gameState.talent
      .filter(t => t.reputation > 50)
      .slice(0, 15)
      .map(t => ({
        talentId: t.id,
        trajectory: (['rising', 'stable', 'declining'] as const)[Math.floor(Math.random() * 3)],
        momentum: Math.random() * 40 - 20,
        careerEvents: []
      }));
    setTalentEvolution(topTalent);
  };

  // Generate new background activities each week
  const generateBackgroundActivity = (): BackgroundActivity | null => {
    if (Math.random() * 100 > simulationIntensity) return null;

    const activityTypes = [
      {
        type: 'talent_development' as const,
        weight: 25,
        generator: () => {
          const talent = gameState.talent[Math.floor(Math.random() * gameState.talent.length)];
          const developments = [
            'taking method acting classes',
            'training for action roles',
            'studying with renowned acting coach',
            'developing production company',
            'exploring directing opportunities'
          ];
          return {
            description: `${talent.name} ${developments[Math.floor(Math.random() * developments.length)]}`,
            impact: 'Talent skill development in progress',
            duration: 4 + Math.floor(Math.random() * 8),
            intensity: 30 + Math.random() * 40
          };
        }
      },
      {
        type: 'market_shift' as const,
        weight: 30,
        generator: () => {
          const shifts = [
            'New distribution model gaining traction',
            'Audience preferences evolving rapidly',
            'International co-production opportunities expanding',
            'Genre boundaries blurring in mainstream',
            'Social media influence on content creation growing'
          ];
          return {
            description: shifts[Math.floor(Math.random() * shifts.length)],
            impact: 'Market dynamics shifting subtly',
            duration: 6 + Math.floor(Math.random() * 12),
            intensity: 40 + Math.random() * 50
          };
        }
      },
      {
        type: 'competitor_move' as const,
        weight: 35,
        generator: () => {
          const moves = [
            'Major studio secretly developing franchise',
            'Independent studio gaining investor backing',
            'Streaming platform negotiating exclusive deals',
            'International studio entering domestic market',
            'Tech company expanding into content production'
          ];
          return {
            description: moves[Math.floor(Math.random() * moves.length)],
            impact: 'Competitive landscape evolving',
            duration: 3 + Math.floor(Math.random() * 10),
            intensity: 50 + Math.random() * 50
          };
        }
      }
    ];

    const totalWeight = activityTypes.reduce((sum, type) => sum + type.weight, 0);
    const random = Math.random() * totalWeight;
    let currentWeight = 0;

    for (const activityType of activityTypes) {
      currentWeight += activityType.weight;
      if (random <= currentWeight) {
        const baseActivity = activityType.generator();
        return {
          id: `bg-${Date.now()}-${Math.random()}`,
          type: activityType.type,
          ...baseActivity,
          progress: 0,
          weekStarted: gameState.currentWeek,
          yearStarted: gameState.currentYear
        };
      }
    }

    return null;
  };

  // Simulate competitor activities
  const updateCompetitorActivities = () => {
    const aiStudios: Studio[] = []; // Will be populated when AI studios are implemented
    
    const newActivities: CompetitorActivity[] = [];
    
    aiStudios.forEach(studio => {
      if (Math.random() < 0.4) { // 40% chance per studio per week
        const activities = [
          {
            activity: 'developing_project' as const,
            details: `Developing ${['Action blockbuster', 'Indie drama', 'Horror sequel', 'Comedy series'][Math.floor(Math.random() * 4)]}`,
            competitiveness: 30 + Math.random() * 40,
            timeline: 8 + Math.floor(Math.random() * 16)
          },
          {
            activity: 'signing_talent' as const,
            details: 'Negotiating with A-list talent for multi-picture deal',
            competitiveness: 50 + Math.random() * 30,
            timeline: 2 + Math.floor(Math.random() * 6)
          },
          {
            activity: 'marketing_campaign' as const,
            details: 'Launching innovative marketing campaign',
            competitiveness: 40 + Math.random() * 35,
            timeline: 4 + Math.floor(Math.random() * 8)
          }
        ];

        const activity = activities[Math.floor(Math.random() * activities.length)];
        newActivities.push({
          studioId: studio.id,
          ...activity
        });
      }
    });

    setCompetitorActivities(prev => [
      ...prev.filter(a => a.timeline > 0),
      ...newActivities
    ]);
  };

  // Evolve talent careers in background
  const evolveTalentCareers = () => {
    setTalentEvolution(prev => prev.map(evolution => {
      const talent = gameState.talent.find(t => t.id === evolution.talentId);
      if (!talent) return evolution;

      let newMomentum = evolution.momentum;
      let newTrajectory = evolution.trajectory;
      const newEvents = [...evolution.careerEvents];

      // Natural career fluctuations
      newMomentum += (Math.random() * 6 - 3); // ±3 per week
      
      // Career events based on current projects
      const currentProjects = gameState.projects.filter(p => 
        p.cast?.some(c => c.talentId === talent.id) ||
        p.contractedTalent?.some(c => c.talentId === talent.id)
      );

      if (currentProjects.length > 0) {
        // Being in active projects provides momentum
        newMomentum += currentProjects.length * 2;
        
        // High-profile projects create career events
        currentProjects.forEach(project => {
          if (Math.random() < 0.1 && project.budget.total > 50000000) {
            newEvents.push({
              event: `Starring in high-budget "${project.title}"`,
              impact: 15,
              week: gameState.currentWeek,
              year: gameState.currentYear
            });
            newMomentum += 15;
          }
        });
      }

      // Trajectory changes based on momentum
      if (newMomentum > 30 && newTrajectory !== 'rising') {
        newTrajectory = 'rising';
      } else if (newMomentum < -30 && newTrajectory !== 'declining') {
        newTrajectory = 'declining';
      } else if (Math.abs(newMomentum) < 10) {
        newTrajectory = 'stable';
      }

      // Breakthrough moments for rising talent
      if (newTrajectory === 'rising' && newMomentum > 40 && Math.random() < 0.05) {
        newTrajectory = 'breakthrough';
        newEvents.push({
          event: 'Career breakthrough moment',
          impact: 25,
          week: gameState.currentWeek,
          year: gameState.currentYear
        });
      }

      // Clamp momentum
      newMomentum = Math.max(-50, Math.min(50, newMomentum));

      return {
        ...evolution,
        trajectory: newTrajectory,
        momentum: newMomentum,
        careerEvents: newEvents.slice(-5) // Keep last 5 events
      };
    }));
  };

  // Update market undercurrents
  const updateMarketUndercurrents = () => {
    setMarketUndercurrents(prev => prev.map(undercurrent => {
      let newStrength = undercurrent.strength + undercurrent.growth;
      let newGrowth = undercurrent.growth;
      
      // Natural market cycles and volatility
      newGrowth += (Math.random() * 2 - 1); // Random fluctuation
      
      // Market maturity affects growth
      if (undercurrent.maturity > 20) {
        newGrowth *= 0.8; // Mature trends slow down
      }
      
      // Keep strength in bounds
      newStrength = Math.max(10, Math.min(90, newStrength));
      newGrowth = Math.max(-5, Math.min(5, newGrowth));
      
      return {
        ...undercurrent,
        strength: newStrength,
        growth: newGrowth,
        maturity: undercurrent.maturity + 1
      };
    }));
  };

  // Progress background activities
  const progressBackgroundActivities = () => {
    setBackgroundActivities(prev => prev.map(activity => {
      const weeksPassed = gameState.currentWeek - activity.weekStarted + 
                         (gameState.currentYear - activity.yearStarted) * 52;
      const progress = Math.min(100, (weeksPassed / activity.duration) * 100);
      
      // Apply impact when activity completes
      if (progress >= 100 && activity.progress < 100) {
        applyActivityImpact(activity);
      }
      
      return {
        ...activity,
        progress
      };
    }));
    
    // Remove completed activities
    setBackgroundActivities(prev => prev.filter(a => a.progress < 100));
  };

  // Apply the impact of completed background activities
  const applyActivityImpact = (activity: BackgroundActivity) => {
    switch (activity.type) {
      case 'talent_development':
        // Randomly boost a talent's skills
        const randomTalent = gameState.talent[Math.floor(Math.random() * gameState.talent.length)];
        if (randomTalent) {
          const reputationBoost = activity.intensity * 0.1;
          // This would need to be handled by the parent component
          console.log(`Background talent development: ${randomTalent.name} gains ${reputationBoost} reputation`);
        }
        break;
        
      case 'market_shift':
        // Subtle reputation adjustment based on how well-positioned the studio is
        const reputationChange = (Math.random() - 0.5) * activity.intensity * 0.05;
        onStudioUpdate({ 
          reputation: Math.max(0, Math.min(100, (gameState.studio.reputation || 50) + reputationChange))
        });
        break;
        
      case 'competitor_move':
        // Increase competitive pressure
        setSimulationIntensity(prev => Math.min(95, prev + activity.intensity * 0.1));
        break;
    }
  };

  // Main weekly processing
  const processWeeklyBackground = () => {
    // Generate new background activity
    const newActivity = generateBackgroundActivity();
    if (newActivity) {
      setBackgroundActivities(prev => [...prev.slice(-8), newActivity]); // Keep last 8
    }
    
    // Update all background systems
    updateCompetitorActivities();
    evolveTalentCareers();
    updateMarketUndercurrents();
    progressBackgroundActivities();
    
    // Adjust simulation intensity based on game state
    const projectIntensity = gameState.projects.length * 5;
    const studioMaturityBonus = Math.min(20, (gameState.studio.reputation || 0) * 0.2);
    const newIntensity = Math.min(95, 50 + projectIntensity + studioMaturityBonus);
    setSimulationIntensity(newIntensity);
  };

  // Process updates when week advances
  useEffect(() => {
    processWeeklyBackground();
  }, [gameState.currentWeek, gameState.currentYear]);

  const getActiveActivities = () => backgroundActivities.filter(a => a.progress < 100);
  const getRecentCompetitorMoves = () => competitorActivities.slice(0, 5);
  const getTrendingTalent = () => talentEvolution
    .filter(t => t.trajectory === 'rising' || t.trajectory === 'breakthrough')
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Simulation Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Background World Simulation
            <Badge variant="outline">
              Intensity: {simulationIntensity}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{getActiveActivities().length}</div>
              <div className="text-sm text-muted-foreground">Active Undercurrents</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{competitorActivities.length}</div>
              <div className="text-sm text-muted-foreground">Competitor Moves</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{getTrendingTalent().length}</div>
              <div className="text-sm text-muted-foreground">Rising Stars</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{marketUndercurrents.length}</div>
              <div className="text-sm text-muted-foreground">Market Trends</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Background Activities */}
      {getActiveActivities().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Industry Undercurrents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getActiveActivities().map(activity => (
                <div key={activity.id} className="border rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">{activity.impact}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {activity.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={activity.progress} className="flex-1" />
                    <span className="text-sm font-medium">{activity.progress.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitor Intelligence */}
      {getRecentCompetitorMoves().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Competitor Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getRecentCompetitorMoves().map((activity, index) => (
                <div key={`${activity.studioId}-${index}`} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">Studio {activity.studioId}</p>
                    <p className="text-xs text-muted-foreground">{activity.details}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs">Threat:</div>
                    <div className="w-12 h-1.5 bg-muted rounded-full">
                      <div 
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${activity.competitiveness}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Talent Career Evolution */}
      {getTrendingTalent().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Rising Talent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getTrendingTalent().map(evolution => {
                const talent = gameState.talent.find(t => t.id === evolution.talentId);
                if (!talent) return null;
                
                return (
                  <div key={evolution.talentId} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{talent.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {evolution.trajectory} trajectory • Momentum: {evolution.momentum > 0 ? '+' : ''}{evolution.momentum.toFixed(0)}
                      </p>
                      {evolution.careerEvents.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Latest: {evolution.careerEvents[evolution.careerEvents.length - 1].event}
                        </p>
                      )}
                    </div>
                    <Badge variant={evolution.trajectory === 'breakthrough' ? 'default' : 'outline'}>
                      {evolution.trajectory}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Undercurrents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Undercurrents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {marketUndercurrents.map(undercurrent => (
              <div key={undercurrent.sector} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium capitalize">{undercurrent.sector}</p>
                  <p className="text-sm text-muted-foreground">{undercurrent.trend}</p>
                  <p className="text-xs text-muted-foreground">
                    Maturity: {undercurrent.maturity} weeks
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-medium">{undercurrent.strength.toFixed(0)}%</div>
                  <div className={`text-sm ${undercurrent.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {undercurrent.growth > 0 ? '+' : ''}{undercurrent.growth.toFixed(1)}/week
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
