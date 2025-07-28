import React, { useState } from 'react';
import { GameState, Studio, Project, Script, TalentPerson, BoxOfficeWeek, BoxOfficeRelease, Genre, MarketingStrategy, ReleaseStrategy } from '@/types/game';
import { ScriptDevelopment } from './ScriptDevelopment';
import { CastingBoard } from './CastingBoard';
import { ProductionManagement } from './ProductionManagement';
import { DistributionDashboard } from './DistributionDashboard';
import { MarketingReleaseManagement } from './MarketingReleaseManagement';
import { PostTheatricalManagement } from './PostTheatricalManagement';
import { StudioDashboard } from './StudioDashboard';
import { StudioStats } from './StudioStats';
import { TimeSystem, TimeState } from './TimeSystem';
import { BoxOfficeSystem } from './BoxOfficeSystem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  StudioIcon, 
  ScriptIcon, 
  CastingIcon, 
  ProductionIcon, 
  DistributionIcon,
  MarketingIcon,
  BudgetIcon,
  ReputationIcon,
  ClapperboardIcon,
  BarChartIcon
} from '@/components/ui/icons';

interface StudioMagnateGameProps {
  onPhaseChange?: (phase: string) => void;
}

export const StudioMagnateGame: React.FC<StudioMagnateGameProps> = ({ onPhaseChange }) => {
  const { toast } = useToast();
  
  const getPhaseWeeks = (phase: string): number => {
    switch (phase) {
      case 'development': return 8;
      case 'pre-production': return 6;
      case 'production': return 12;
      case 'post-production': return 16;
      case 'marketing': return 8;
      case 'release': return 2;
      case 'distribution': return 8;
      default: return 1;
    }
  };
  
  const [gameState, setGameState] = useState<GameState>(() => ({
    studio: {
      id: 'player-studio',
      name: 'Untitled Pictures',
      reputation: 50,
      budget: 10000000, // $10M starting budget
      founded: new Date().getFullYear(),
      specialties: ['drama']
    },
    currentYear: new Date().getFullYear(),
    currentWeek: 1,
    currentQuarter: 1,
    projects: [],
    talent: [
      // Sample talent pool
      {
        id: 'talent-1',
        name: 'Alexandra Sterling',
        type: 'actor',
        age: 28,
        experience: 5,
        reputation: 75,
        marketValue: 2500000,
        contractStatus: 'available',
        genres: ['drama', 'thriller'],
        awards: ['Golden Globe'],
        traits: ['Method Actor', 'Media Darling'],
        agent: 'CAA',
        availability: { start: new Date(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
      },
      {
        id: 'talent-2',
        name: 'Marcus Chen',
        type: 'director',
        age: 45,
        experience: 15,
        reputation: 85,
        marketValue: 5000000,
        contractStatus: 'available',
        genres: ['action', 'sci-fi'],
        awards: ['Emmy', 'Directors Guild'],
        traits: ['Visionary', 'Budget Conscious'],
        agent: 'WME',
        availability: { start: new Date(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
      },
      {
        id: 'talent-3',
        name: 'Isabella Rodriguez',
        type: 'actor',
        age: 35,
        experience: 12,
        reputation: 80,
        marketValue: 4000000,
        contractStatus: 'available',
        genres: ['comedy', 'drama'],
        awards: ['SAG Award', 'Critics Choice'],
        traits: ['Versatile', 'Box Office Draw'],
        agent: 'UTA',
        availability: { start: new Date(), end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
      }
    ],
    scripts: [],
    competitorStudios: [],
    marketConditions: {
      trendingGenres: ['action', 'drama', 'comedy'],
      audiencePreferences: [],
      economicClimate: 'stable',
      technologicalAdvances: [],
      regulatoryChanges: []
    },
    eventQueue: [],
    boxOfficeHistory: []
  }));

  const [currentPhase, setCurrentPhase] = useState<'dashboard' | 'scripts' | 'casting' | 'production' | 'marketing' | 'distribution' | 'stats'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handlePhaseChange = (phase: typeof currentPhase) => {
    setCurrentPhase(phase);
    onPhaseChange?.(phase);
  };

  const handleProjectCreate = (script: Script) => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      title: script.title,
      script,
      type: 'feature',
      currentPhase: 'development',
      phaseDuration: getPhaseWeeks('development'),
      contractedTalent: [],
      developmentProgress: {
        scriptCompletion: 25,
        budgetApproval: 0,
        talentAttached: 0,
        locationSecured: 0,
        completionThreshold: 80,
        issues: []
      },
      budget: {
        total: script.budget,
        allocated: {
          aboveTheLine: 0,
          belowTheLine: 0,
          postProduction: 0,
          marketing: 0,
          distribution: 0,
          contingency: 0
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
      cast: [],
      crew: [],
      timeline: {
        preProduction: {
          start: new Date(),
          end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        },
        principalPhotography: {
          start: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000)
        },
        postProduction: {
          start: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000)
        },
        release: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        milestones: []
      },
      locations: [],
      distributionStrategy: {
        primary: {
          platform: 'Theatrical',
          type: 'theatrical',
          revenue: {
            type: 'box-office',
            studioShare: 50
          }
        },
        international: [],
        windows: [],
        marketingBudget: script.budget * 0.5
      },
      status: 'development',
      metrics: {}
    };

    setGameState(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
      studio: {
        ...prev.studio,
        budget: prev.studio.budget - script.budget * 0.1
      }
    }));

    setSelectedProject(newProject);
    toast({
      title: "Project Greenlit!",
      description: `"${script.title}" has entered development.`,
    });
  };

  const handleStudioUpdate = (updates: Partial<Studio>) => {
    setGameState(prev => ({
      ...prev,
      studio: { ...prev.studio, ...updates }
    }));
  };

  const handleProjectUpdate = (project: Project, marketingCost?: number) => {
    setGameState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === project.id ? project : p),
      studio: marketingCost ? {
        ...prev.studio,
        budget: prev.studio.budget - marketingCost
      } : prev.studio
    }));
  };

  // CRITICAL: Manual marketing campaign creation (no auto-progression)
  const handleMarketingCampaignCreate = (project: Project, strategy: MarketingStrategy, budget: number, duration: number) => {
    console.log(`🎯 MANUAL MARKETING START: ${project.title}`);
    
    if (project.marketingCampaign && project.marketingCampaign.weeksRemaining > 0) {
      toast({
        title: "Campaign Already Active",
        description: "Complete the current campaign before starting a new one",
        variant: "destructive"
      });
      return;
    }

    if (budget > gameState.studio.budget) {
      toast({
        title: "Insufficient Budget",
        description: "Not enough studio budget for this campaign",
        variant: "destructive"
      });
      return;
    }

    const updatedProject = {
      ...project,
      currentPhase: 'marketing' as any,
      marketingCampaign: {
        id: `campaign-${Date.now()}`,
        strategy,
        budgetAllocated: budget,
        budgetSpent: 0,
        duration,
        weeksRemaining: duration,
        buzz: 20,
        activities: [],
        targetAudience: strategy.targeting.demographic,
        effectiveness: 60
      },
      phaseDuration: duration,
      status: 'marketing' as any
    };

    setGameState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === project.id ? updatedProject : p),
      studio: {
        ...prev.studio,
        budget: prev.studio.budget - budget
      }
    }));
    
    toast({
      title: "Marketing Campaign Launched!",
      description: `${project.title} marketing campaign is now active for ${duration} weeks.`,
    });
  };

  // CRITICAL: Manual release strategy creation (no auto-progression)
  const handleReleaseStrategyCreate = (project: Project, strategy: ReleaseStrategy) => {
    console.log(`🎬 MANUAL RELEASE STRATEGY SET: ${project.title}`);
    
    if (!strategy.premiereDate) {
      toast({
        title: "Release Date Required",
        description: "Please select a premiere date for the release.",
        variant: "destructive"
      });
      return;
    }

    // Calculate release week/year from selected date
    const gameStart = new Date(2024, 0, 1);
    const daysSinceGameStart = Math.floor((strategy.premiereDate.getTime() - gameStart.getTime()) / (1000 * 60 * 60 * 24));
    const weeksSinceGameStart = Math.floor(daysSinceGameStart / 7) + 1;
    
    const releaseYear = 2024 + Math.floor((weeksSinceGameStart - 1) / 52);
    const releaseWeek = ((weeksSinceGameStart - 1) % 52) + 1;
    
    console.log(`  → Player selected: ${strategy.premiereDate.toDateString()} = Y${releaseYear}W${releaseWeek}`);
    
    const updatedProject = BoxOfficeSystem.initializeRelease(
      {
        ...project,
        releaseStrategy: strategy,
        status: 'released' as any,
        readyForRelease: false,
        phaseDuration: 0
      },
      releaseWeek,
      releaseYear
    );

    setGameState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === project.id ? updatedProject : p)
    }));
    
    toast({
      title: "Release Strategy Set!",
      description: `${project.title} will be released on ${strategy.premiereDate?.toDateString()}.`,
    });
  };

  const processWeeklyProjectEffects = (projects: Project[], timeState: TimeState): Project[] => {
    console.log(`=== WEEKLY PROJECT PROCESSING START ===`);
    
    const results = projects.map((project, index) => {
      console.log(`[${index}] Processing: ${project.title} (${project.currentPhase})`);
      
      let updatedProject = { ...project };

      // Process development phase
      if (project.currentPhase === 'development') {
        updatedProject = processDevelopmentProgress(project, timeState.currentWeek);
      }
      
      // Process box office for released films
      if (project.status === 'released') {
        updatedProject = BoxOfficeSystem.processWeeklyRevenue(
          updatedProject, 
          timeState.currentWeek, 
          timeState.currentYear
        );
      }

      // Process marketing campaigns
      if (updatedProject.marketingCampaign && updatedProject.marketingCampaign.weeksRemaining > 0) {
        const updatedActivities = updatedProject.marketingCampaign.activities.map(activity => ({
          ...activity,
          weeksRemaining: Math.max(0, activity.weeksRemaining - 1),
          status: activity.weeksRemaining <= 1 ? 'completed' as const : activity.status
        }));

        updatedProject = {
          ...updatedProject,
          marketingCampaign: {
            ...updatedProject.marketingCampaign,
            activities: updatedActivities,
            weeksRemaining: Math.max(0, updatedProject.marketingCampaign.weeksRemaining - 1)
          }
        };
      }

      // CRITICAL: Only process phase timers for specific phases
      if (updatedProject.phaseDuration !== undefined && updatedProject.phaseDuration > 0) {
        const newPhaseDuration = updatedProject.phaseDuration - 1;
        
        if (newPhaseDuration === 0) {
          const nextPhase = getNextPhase(updatedProject.currentPhase);
          
          // STOP auto-progression at post-production
          if (updatedProject.currentPhase === 'post-production') {
            console.log(`  → POST-PRODUCTION COMPLETE: ${updatedProject.title} ready for marketing`);
            updatedProject = {
              ...updatedProject,
              currentPhase: 'marketing',
              phaseDuration: 0,
              status: 'ready-for-marketing' as any,
              readyForMarketing: true
            };
            
            toast({
              title: "Post-Production Complete!",
              description: `${updatedProject.title} is ready for marketing campaign`,
            });
          }
          // STOP auto-progression at marketing
          else if (updatedProject.currentPhase === 'marketing' && updatedProject.marketingCampaign && updatedProject.marketingCampaign.weeksRemaining === 0) {
            console.log(`  → MARKETING COMPLETE: ${updatedProject.title} ready for release`);
            updatedProject = {
              ...updatedProject,
              currentPhase: 'release',
              phaseDuration: 0,
              status: 'ready-for-release' as any,
              readyForRelease: true
            };
            
            toast({
              title: "Marketing Campaign Complete!",
              description: `${updatedProject.title} is ready for release strategy`,
            });
          }
          // Normal progression for early phases only
          else if (['development', 'pre-production', 'production'].includes(updatedProject.currentPhase)) {
            const nextDuration = getPhaseWeeks(nextPhase);
            
            updatedProject = {
              ...updatedProject,
              currentPhase: nextPhase,
              phaseDuration: nextDuration,
              status: nextPhase as any
            };
            
            toast({
              title: "Phase Complete!",
              description: `${updatedProject.title} advanced to ${nextPhase.replace('-', ' ')}`,
            });
          }
        } else {
          // Only countdown for active phases
          const shouldCountdown = ['development', 'pre-production', 'production'].includes(updatedProject.currentPhase) ||
                                 (updatedProject.currentPhase === 'marketing' && updatedProject.marketingCampaign);
          
          if (shouldCountdown) {
            updatedProject = {
              ...updatedProject,
              phaseDuration: newPhaseDuration
            };
          }
        }
      }

      return updatedProject;
    });
    
    console.log(`=== WEEKLY PROJECT PROCESSING END ===`);
    return results;
  };

  const getNextPhase = (currentPhase: string): any => {
    switch (currentPhase) {
      case 'development': return 'pre-production';
      case 'pre-production': return 'production';
      case 'production': return 'post-production';
      case 'post-production': return 'marketing';
      case 'marketing': return 'release';
      case 'release': return 'distribution';
      default: return currentPhase;
    }
  };

  const processDevelopmentProgress = (project: Project, currentWeek: number): Project => {
    const progress = project.developmentProgress;
    
    let weeklyIncrease = 5;
    
    if (project.cast.length > 0) weeklyIncrease += 3;
    if (project.crew.some(c => gameState.talent.find(t => t.id === c.talentId)?.type === 'director')) {
      weeklyIncrease += 5;
    }
    
    const newProgress = {
      ...progress,
      scriptCompletion: Math.min(100, progress.scriptCompletion + weeklyIncrease),
      budgetApproval: project.cast.length > 0 ? Math.min(100, progress.budgetApproval + weeklyIncrease) : progress.budgetApproval,
      talentAttached: project.cast.length > 0 ? Math.min(100, progress.talentAttached + 10) : progress.talentAttached,
      locationSecured: Math.min(100, progress.locationSecured + weeklyIncrease)
    };
    
    return {
      ...project,
      developmentProgress: newProgress
    };
  };

  const handleAdvanceWeek = () => {
    setGameState(prev => {
      const newTimeState = TimeSystem.advanceWeek({
        currentWeek: prev.currentWeek,
        currentYear: prev.currentYear,
        currentQuarter: prev.currentQuarter
      });
      
      const updatedProjects = processWeeklyProjectEffects(prev.projects, newTimeState);
      
      const newState = {
        ...prev,
        currentWeek: newTimeState.currentWeek,
        currentYear: newTimeState.currentYear,
        currentQuarter: newTimeState.currentQuarter,
        projects: updatedProjects
      };

      setTimeout(() => {
        toast({
          title: "New Week",
          description: `Week ${newTimeState.currentWeek}, ${newTimeState.currentYear}`,
        });
      }, 100);

      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-background font-studio">
      {/* Studio Header */}
      <div className="border-b border-border/50 card-premium backdrop-blur-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gradient-golden shadow-golden animate-glow">
                  <ClapperboardIcon className="text-primary-foreground" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold studio-title bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {gameState.studio.name}
                  </div>
                  <div className="text-sm text-muted-foreground studio-mono">
                    Week {gameState.currentWeek}, Q{gameState.currentQuarter} {gameState.currentYear} • Est. {gameState.studio.founded}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <BudgetIcon className="text-primary" size={16} />
                <div className="text-sm">
                  <span className="text-muted-foreground">Budget:</span>{' '}
                  <span className="studio-mono font-semibold text-primary">
                    ${(gameState.studio.budget / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
                <ReputationIcon className="text-accent" size={16} />
                <div className="text-sm">
                  <span className="text-muted-foreground">Reputation:</span>{' '}
                  <span className="studio-mono font-semibold text-accent">
                    {gameState.studio.reputation}/100
                  </span>
                </div>
              </div>
              
              <Button 
                size="sm" 
                onClick={handleAdvanceWeek}
                className="btn-studio shadow-golden hover:animate-glow transition-all duration-300"
              >
                <BudgetIcon className="mr-2" size={16} />
                Advance Week
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-border/30 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="flex space-x-1">
            {[
              { id: 'dashboard', label: 'Studio Dashboard', IconComponent: StudioIcon },
              { id: 'scripts', label: 'Script Development', IconComponent: ScriptIcon },
              { id: 'casting', label: 'Casting Board', IconComponent: CastingIcon },
              { id: 'production', label: 'Production', IconComponent: ProductionIcon },
              { id: 'marketing', label: 'Marketing & Release', IconComponent: MarketingIcon },
              { id: 'distribution', label: 'Post-Theatrical', IconComponent: DistributionIcon },
              { id: 'stats', label: 'Statistics', IconComponent: BarChartIcon },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={`rounded-none border-b-2 px-6 py-4 font-medium transition-all duration-300 ${
                  currentPhase === tab.id 
                    ? 'border-primary bg-gradient-to-t from-primary/20 to-primary/10 text-primary shadow-lg' 
                    : 'border-transparent hover:border-primary/40 hover:bg-primary/5 btn-ghost-premium'
                }`}
                onClick={() => handlePhaseChange(tab.id as typeof currentPhase)}
              >
                <tab.IconComponent className="mr-3" size={18} />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 animate-slide-up">
        {currentPhase === 'dashboard' && (
          <StudioDashboard 
            gameState={gameState}
            onStudioUpdate={handleStudioUpdate}
            onProjectSelect={setSelectedProject}
            onPhaseChange={handlePhaseChange}
          />
        )}
        
        {currentPhase === 'scripts' && (
          <ScriptDevelopment 
            gameState={gameState}
            onProjectCreate={handleProjectCreate}
            onScriptUpdate={(script) => {
              setGameState(prev => ({
                ...prev,
                scripts: prev.scripts.some(s => s.id === script.id)
                  ? prev.scripts.map(s => s.id === script.id ? script : s)
                  : [...prev.scripts, script]
              }));
            }}
          />
        )}
        
        {currentPhase === 'casting' && (
          <CastingBoard 
            gameState={gameState}
            selectedProject={selectedProject}
            onProjectUpdate={handleProjectUpdate}
            onTalentHire={(talent) => {
              setGameState(prev => ({
                ...prev,
                talent: prev.talent.some(t => t.id === talent.id)
                  ? prev.talent.map(t => t.id === talent.id ? talent : t)
                  : [...prev.talent, talent]
              }));
            }}
          />
        )}
        
        {currentPhase === 'production' && (
          <ProductionManagement 
            gameState={gameState}
            selectedProject={selectedProject}
            onProjectUpdate={handleProjectUpdate}
          />
        )}
        
        {currentPhase === 'marketing' && (
          <MarketingReleaseManagement 
            gameState={gameState}
            onProjectUpdate={handleProjectUpdate}
            onMarketingCampaignCreate={handleMarketingCampaignCreate}
            onReleaseStrategyCreate={handleReleaseStrategyCreate}
          />
        )}
        
        {currentPhase === 'distribution' && (
          <PostTheatricalManagement 
            gameState={gameState}
            onProjectUpdate={handleProjectUpdate}
          />
        )}
        
        {currentPhase === 'stats' && (
          <StudioStats gameState={gameState} />
        )}
      </div>
    </div>
  );
};