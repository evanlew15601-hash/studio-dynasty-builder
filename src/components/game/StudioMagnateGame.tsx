import React, { useState, Suspense } from 'react';
import { GameState, Studio, Project, Script, TalentPerson, BoxOfficeWeek, BoxOfficeRelease, Genre, MarketingStrategy, ReleaseStrategy } from '@/types/game';
import { ScriptDevelopment } from './ScriptDevelopment';
import { CastingBoard } from './CastingBoard';
import { ProductionManagement } from './ProductionManagement';
import { DistributionDashboard } from './DistributionDashboard';
import { MarketingReleaseManagement } from './MarketingReleaseManagement';
import { PostTheatricalManagement } from './PostTheatricalManagement';
import { StudioDashboard } from './StudioDashboard';
import { StudioStats } from './StudioStats';
import { FinancialReporting } from './FinancialReporting';
import { FinancialDashboard } from './FinancialDashboard';
import { GameplayLoops } from './GameplayLoops';
import { IntegrationMonitor } from './IntegrationMonitor';
import { AwardsCalendar } from './AwardsCalendar';
import { AIStudioManager } from './AIStudioManager';
import { AIStudioIntegrationTests } from './AIStudioIntegrationTests';
import { CompetitorMonitor } from './CompetitorMonitor';
import { TimeSystem, TimeState } from './TimeSystem';
import { BoxOfficeSystem } from './BoxOfficeSystem';
import { updateProjectFinancials } from './FinancialCalculations';
import { AwardsSystem } from './AwardsSystem';
import { MarketCompetition } from './MarketCompetition';
import { TopFilmsChart } from './TopFilmsChart';
import { AchievementsPanel } from './AchievementsPanel';
import { PerformanceMetrics } from './PerformanceMetrics';
import { AchievementNotifications } from './AchievementNotifications';
import { ReputationPanel } from './ReputationPanel';
import { DeepReputationPanel } from './DeepReputationPanel';
import { TalentGenerator } from '../../data/TalentGenerator';
import { StudioGenerator } from '../../data/StudioGenerator';
import { useTalentMarket } from '../../hooks/useTalentMarket';
import { useGenreSaturation } from '../../hooks/useGenreSaturation';
import { useAchievements } from '../../hooks/useAchievements';
import { DeepReputationSystem } from './DeepReputationSystem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initialize comprehensive talent pool
    const talentGenerator = new TalentGenerator();
    const studioGenerator = new StudioGenerator();
    const generatedTalent = talentGenerator.generateTalentPool(300, 50);
    const competitorStudios = studioGenerator.generateCompetitorStudios();

    return {
      studio: {
        id: 'player-studio',
        name: 'Untitled Pictures',
        reputation: 50,
        budget: 10000000, // $10M starting budget
        founded: new Date().getFullYear(),
        specialties: ['drama'],
        debt: 0, // Track studio debt
        lastProjectWeek: 0, // Track when last project was greenlit
        weeksSinceLastProject: 0 // Counter for reputation decay
      },
      currentYear: new Date().getFullYear(),
      currentWeek: 1,
      currentQuarter: 1,
      projects: [],
      talent: generatedTalent,
      scripts: [],
      competitorStudios,
    marketConditions: {
      trendingGenres: ['action', 'drama', 'comedy'],
      audiencePreferences: [],
      economicClimate: 'stable',
      technologicalAdvances: [],
      regulatoryChanges: [],
      seasonalTrends: [],
      competitorReleases: [],
      awardsSeasonActive: false
    },
      eventQueue: [],
      boxOfficeHistory: [],
      awardsCalendar: [],
      industryTrends: [],
      allReleases: [], // Includes AI studio releases
      topFilmsHistory: []
    };
  });

  // Market dynamics hooks  
  const talentMarket = useTalentMarket(gameState.talent, gameState.currentWeek);
  const genreSaturation = useGenreSaturation(gameState.allReleases || [], gameState.currentWeek);
  const achievements = useAchievements(gameState);

  const [currentPhase, setCurrentPhase] = useState<'dashboard' | 'scripts' | 'casting' | 'talent' | 'media' | 'production' | 'marketing' | 'distribution' | 'financials' | 'awards' | 'market' | 'topfilms' | 'stats' | 'reputation' | 'competition'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Handle achievement rewards
  const handleAchievementRewards = (unlockedAchievements: any[]) => {
    unlockedAchievements.forEach(achievement => {
      if (achievement.reward) {
        setGameState(prev => ({
          ...prev,
          studio: {
            ...prev.studio,
            reputation: prev.studio.reputation + (achievement.reward.reputation || 0),
            budget: prev.studio.budget + (achievement.reward.budget || 0)
          }
        }));
      }
    });
  };

  const handlePhaseChange = (phase: typeof currentPhase) => {
    setCurrentPhase(phase);
    onPhaseChange?.(phase);
  };

  const handleProjectCreate = (script: Script) => {
    const developmentCost = script.budget * 0.1;
    
    // Check if studio can afford the project (including potential loan capacity)
    const maxLoanCapacity = Math.max(0, 50000000 - (gameState.studio.debt || 0)); // $50M max debt
    const availableFunds = gameState.studio.budget + maxLoanCapacity;
    
    if (developmentCost > availableFunds) {
      toast({
        title: "Cannot Greenlight Project",
        description: "Project cost exceeds studio capacity even with loans.",
        variant: "destructive"
      });
      return;
    }

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

    // Deduct development cost and handle loan if needed
    const newBudget = gameState.studio.budget - developmentCost;
    let newDebt = gameState.studio.debt || 0;
    let finalBudget = newBudget;
    
    if (newBudget < 0) {
      newDebt += Math.abs(newBudget);
      finalBudget = 0;
      toast({
        title: "Loan Taken",
        description: `Borrowed $${Math.abs(newBudget).toLocaleString()} to greenlight project.`,
        variant: "default"
      });
    }

    setGameState(prev => ({
      ...prev,
      projects: [...prev.projects, newProject],
      studio: {
        ...prev.studio,
        budget: finalBudget,
        debt: newDebt,
        lastProjectWeek: prev.currentWeek,
        weeksSinceLastProject: 0
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

    // Calculate release week/year from selected date using game time
    console.log(`🕐 Converting date ${strategy.premiereDate.toDateString()} to game time`);
    console.log(`🕐 Current game time: Y${gameState.currentYear}W${gameState.currentWeek}`);
    
    // Simple approach: Convert calendar date to weeks from today
    const today = new Date();
    const daysDifference = Math.floor((strategy.premiereDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const weeksDifference = Math.floor(daysDifference / 7);
    
    console.log(`🕐 Days difference: ${daysDifference}, Weeks difference: ${weeksDifference}`);
    
    // Calculate target week/year from current game state
    let releaseYear = gameState.currentYear;
    let releaseWeek = gameState.currentWeek + weeksDifference;
    
    // Handle year rollover
    while (releaseWeek > 52) {
      releaseWeek -= 52;
      releaseYear += 1;
    }
    while (releaseWeek <= 0) {
      releaseWeek += 52;
      releaseYear -= 1;
    }
    
    // Ensure release date is not in the past
    const currentAbsoluteWeek = (gameState.currentYear * 52) + gameState.currentWeek;
    const calculatedAbsoluteWeek = (releaseYear * 52) + releaseWeek;
    
    if (calculatedAbsoluteWeek < currentAbsoluteWeek) {
      // Force release to current week if date is in the past
      releaseWeek = gameState.currentWeek;
      releaseYear = gameState.currentYear;
      console.log(`  → WARNING: Release date was in past, moved to current week Y${releaseYear}W${releaseWeek}`);
    }
    
    console.log(`  → Player selected: ${strategy.premiereDate.toDateString()} = Y${releaseYear}W${releaseWeek}`);
    
    const updatedProject = {
      ...project,
      releaseStrategy: strategy,
      releaseWeek,
      releaseYear,
      currentPhase: 'release' as const,
      status: 'scheduled-for-release' as any,
      readyForRelease: false,
      phaseDuration: 999, // Don't auto-advance until release date arrives
      metrics: {
        ...project.metrics,
        criticsScore: Math.floor(Math.random() * 40) + 50,
        audienceScore: Math.floor(Math.random() * 40) + 50,
      }
    };

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
      console.log(`    📊 BEFORE: boxOfficeTotal = ${project.metrics?.boxOfficeTotal || 0}`);
      
      let updatedProject = { ...project };

      // Process development phase
      if (project.currentPhase === 'development') {
        updatedProject = processDevelopmentProgress(project, timeState.currentWeek);
      }
      
      // Handle scheduled releases when their date arrives
      let justReleased = false;
      if (project.status === 'scheduled-for-release' && project.releaseWeek && project.releaseYear) {
        const currentAbsoluteWeek = (timeState.currentYear * 52) + timeState.currentWeek;
        const releaseAbsoluteWeek = (project.releaseYear * 52) + project.releaseWeek;
        
        if (currentAbsoluteWeek >= releaseAbsoluteWeek) {
          console.log(`🎬 RELEASE DATE ARRIVED: ${project.title}`);
          console.log(`    📊 PRE-RELEASE: boxOfficeTotal = ${project.metrics?.boxOfficeTotal || 0}`);
          updatedProject = BoxOfficeSystem.initializeRelease(updatedProject, project.releaseWeek, project.releaseYear);
          console.log(`    📊 POST-RELEASE: boxOfficeTotal = ${updatedProject.metrics?.boxOfficeTotal || 0}`);
          justReleased = true; // Flag to skip processing on release week
        }
      }
      
      // Process box office for released films (but skip on the week they just released)
      if (project.status === 'released' && !justReleased) {
        console.log(`    💰 PROCESSING BOX OFFICE: ${project.title}`);
        console.log(`    📊 PRE-REVENUE: boxOfficeTotal = ${updatedProject.metrics?.boxOfficeTotal || 0}`);
        
        const previousTotal = updatedProject.metrics?.boxOfficeTotal || 0;
        
        updatedProject = BoxOfficeSystem.processWeeklyRevenue(
          updatedProject, 
          timeState.currentWeek, 
          timeState.currentYear
        );
        
        const newTotal = updatedProject.metrics?.boxOfficeTotal || 0;
        const weeklyBoxOfficeRevenue = newTotal - previousTotal;
        
        console.log(`    📊 POST-REVENUE: boxOfficeTotal = ${newTotal}`);
        console.log(`    💰 WEEKLY BOX OFFICE EARNED: $${weeklyBoxOfficeRevenue.toLocaleString()}`);
        
        // Add box office revenue to studio budget (studio keeps percentage after exhibitor cut)
        if (weeklyBoxOfficeRevenue > 0) {
          const studioShare = weeklyBoxOfficeRevenue * 0.55; // Studios typically get 55% of domestic box office
          console.log(`    💰 STUDIO SHARE (55%): $${studioShare.toLocaleString()}`);
          
          setGameState(prevState => ({
            ...prevState,
            studio: {
              ...prevState.studio,
              budget: prevState.studio.budget + studioShare
            }
          }));
        }
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

      // Process post-theatrical releases revenue
      if (updatedProject.postTheatricalReleases && updatedProject.postTheatricalReleases.length > 0) {
        console.log(`    💰 PROCESSING POST-THEATRICAL: ${updatedProject.title}`);
        
        const updatedReleases = updatedProject.postTheatricalReleases.map(release => {
          if (release.status === 'planned') {
            // Start the release
            console.log(`      🚀 STARTING: ${release.platform} release`);
            return {
              ...release,
              status: 'active' as const,
              weeksActive: 1,
              revenue: release.weeklyRevenue
            };
          } else if (release.status === 'active') {
            // Continue generating revenue
            const newWeeksActive = release.weeksActive + 1;
            const newRevenue = release.revenue + release.weeklyRevenue;
            
            console.log(`      💰 ${release.platform}: Week ${newWeeksActive}, +$${release.weeklyRevenue.toLocaleString()}, Total: $${newRevenue.toLocaleString()}`);
            
            return {
              ...release,
              weeksActive: newWeeksActive,
              revenue: newRevenue
            };
          }
          return release;
        });

        // Calculate total weekly revenue from all active releases
        const weeklyPostTheatricalRevenue = updatedReleases
          .filter(r => r.status === 'active')
          .reduce((sum, r) => sum + r.weeklyRevenue, 0);

        if (weeklyPostTheatricalRevenue > 0) {
          console.log(`      💰 TOTAL WEEKLY POST-THEATRICAL: +$${weeklyPostTheatricalRevenue.toLocaleString()}`);
          
          // Add revenue to studio budget
          setGameState(prevState => ({
            ...prevState,
            studio: {
              ...prevState.studio,
              budget: prevState.studio.budget + weeklyPostTheatricalRevenue
            }
          }));
        }

        updatedProject = {
          ...updatedProject,
          postTheatricalReleases: updatedReleases
        };
      }

      // CRITICAL: Only process phase timers for specific phases
      if (updatedProject.phaseDuration !== undefined && updatedProject.phaseDuration > 0) {
        const newPhaseDuration = updatedProject.phaseDuration - 1;
        
        if (newPhaseDuration === 0) {
          const nextPhase = getNextPhase(updatedProject.currentPhase);
          
          // STOP auto-progression at post-production - stay in post-production until manual marketing
          if (updatedProject.currentPhase === 'post-production') {
            console.log(`  → POST-PRODUCTION COMPLETE: ${updatedProject.title} ready for marketing`);
            updatedProject = {
              ...updatedProject,
              phaseDuration: 0,
              status: 'ready-for-marketing' as any,
              readyForMarketing: true
            };
            
            toast({
              title: "Post-Production Complete!",
              description: `${updatedProject.title} is ready for marketing campaign`,
            });
          }
          // STOP auto-progression at marketing - only advance when campaign completes
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
          // Only countdown for active phases - FIXED: Include post-production
          const shouldCountdown = ['development', 'pre-production', 'production', 'post-production'].includes(updatedProject.currentPhase) ||
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

  // DEBUG: Quick test function to skip to post-theatrical phase
  const skipToPostTheatrical = () => {
    console.log('🚀 SKIPPING TO POST-THEATRICAL TESTING MODE');
    
    // Use existing project or create minimal one
    const existingProject = gameState.projects[0];
    const testProject: Project = {
      ...(existingProject || {
        id: 'test-movie',
        title: 'Test Movie',
        type: 'feature',
        genre: 'Action' as Genre,
        script: {
          id: 'test-script',
          title: 'Test Movie',
          genre: 'Action' as Genre,
          logline: 'A test movie for debugging post-theatrical features',
          writer: 'Test Writer',
          pages: 120,
          quality: 85,
          budget: 50000000,
          developmentStage: 'final' as const,
          themes: ['heroism', 'adventure'],
          targetAudience: 'general' as const,
          estimatedRuntime: 120,
          characteristics: {
            tone: 'balanced' as const,
            pacing: 'fast-paced' as const,
            dialogue: 'witty' as const,
            visualStyle: 'epic' as const,
            commercialAppeal: 8,
            criticalPotential: 7,
            cgiIntensity: 'moderate' as const
          }
        },
        cast: [],
        crew: [],
        locations: [],
        budget: { 
          total: 75000000,
          allocated: {
            aboveTheLine: 20000000,
            belowTheLine: 25000000, 
            postProduction: 5000000,
            marketing: 20000000,
            distribution: 3000000,
            contingency: 2000000
          },
          spent: {
            aboveTheLine: 20000000,
            belowTheLine: 25000000, 
            postProduction: 5000000,
            marketing: 20000000,
            distribution: 3000000,
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
        timeline: { 
          preProduction: { start: new Date(), end: new Date() },
          principalPhotography: { start: new Date(), end: new Date() },
          postProduction: { start: new Date(), end: new Date() },
          release: new Date(),
          milestones: []
        },
        distributionStrategy: null,
        marketingCampaign: null,
        weeksInPhase: 0,
        phaseDuration: 999,
        readyForRelease: false,
        contractedTalent: [],
        developmentProgress: {
          scriptCompletion: 100,
          budgetApproval: 100,
          talentAttached: 100,
          locationSecured: 100,
          completionThreshold: 80,
          issues: []
        }
      }),
      currentPhase: 'distribution' as const,
      status: 'released' as any,
      releaseWeek: gameState.currentWeek - 10,
      releaseYear: gameState.currentYear,
      postTheatricalEligible: true,
      theatricalEndDate: new Date(),
      metrics: {
        inTheaters: false,
        boxOfficeTotal: 125000000,
        theaterCount: 0,
        weeksSinceRelease: 10,
        criticsScore: 75,
        audienceScore: 80,
        boxOfficeStatus: 'Ended',
        theatricalRunLocked: true
      }
    };

    setGameState(prev => ({
      ...prev,
      projects: [testProject, ...prev.projects.slice(1)],
      currentView: 'distribution'
    }));

    toast({
      title: "Skipped to Post-Theatrical Testing",
      description: "Test movie ready for post-theatrical distribution",
    });
  };

  // Process weekly costs, debt payments, and reputation changes
  const processWeeklyCosts = (currentState: GameState, projects: Project[]) => {
    let studio = { ...currentState.studio };
    
    // Calculate weekly operational costs (basic studio overhead)
    const baseOperationalCost = 25000; // $25k per week base cost (gentler)
    const projectCount = projects.filter(p => ['development', 'pre-production', 'production', 'post-production'].includes(p.status)).length;
    const operationalCost = baseOperationalCost + (projectCount * 10000); // $10k per active project
    
    console.log(`💰 WEEKLY COSTS: Base $${baseOperationalCost.toLocaleString()} + Projects $${(projectCount * 10000).toLocaleString()}`);
    
    // Calculate production phase costs (spread over full phase duration)
    let productionCosts = 0;
    projects.forEach(project => {
      if (project.currentPhase === 'production') {
        const weeklyProductionCost = project.budget.total * 0.7 / getPhaseWeeks('production'); // 70% of budget over production weeks
        productionCosts += weeklyProductionCost;
        console.log(`🎬 Production cost for ${project.title}: $${weeklyProductionCost.toLocaleString()}`);
      }
    });
    
    const totalWeeklyCosts = operationalCost + productionCosts;
    
    // Deduct costs from budget
    studio.budget -= totalWeeklyCosts;
    
    // Handle debt if budget goes negative (easier loan terms)
    if (studio.budget < 0) {
      const loanAmount = Math.abs(studio.budget);
      studio.debt = (studio.debt || 0) + loanAmount;
      studio.budget = 0;
      
      if (loanAmount > 0) {
        console.log(`💳 Auto-loan: $${loanAmount.toLocaleString()}`);
      }
    }
    
    // Pay down debt automatically if budget is positive (5% of surplus goes to debt)
    if (studio.budget > 1000000 && studio.debt && studio.debt > 0) { // Only pay debt if budget > $1M
      const debtPayment = Math.min(studio.debt, studio.budget * 0.05);
      studio.debt -= debtPayment;
      studio.budget -= debtPayment;
      console.log(`💳 Auto debt payment: $${debtPayment.toLocaleString()}. Remaining debt: $${studio.debt.toLocaleString()}`);
    }
    
    // Very low weekly interest on debt (1% annually = ~0.02% weekly)
    if (studio.debt && studio.debt > 0) {
      const weeklyInterest = studio.debt * 0.0002;
      studio.debt += weeklyInterest;
    }
    
    // Track weeks since last project for reputation system
    studio.weeksSinceLastProject = (studio.weeksSinceLastProject || 0) + 1;
    
    // More forgiving reputation decay (only after 12 weeks = ~3 months)
    if (studio.weeksSinceLastProject > 12) {
      const reputationLoss = Math.min(1, (studio.weeksSinceLastProject - 12) * 0.25); // Very gentle decay
      studio.reputation = Math.max(0, studio.reputation - reputationLoss);
      if (reputationLoss > 0) {
        console.log(`📉 Reputation declined by ${reputationLoss.toFixed(1)} (${studio.weeksSinceLastProject} weeks since last project)`);
      }
    }
    
    // Reputation changes from box office performance (check completed theatrical runs)
    projects.forEach(project => {
      if (project.status === 'released' && project.metrics?.boxOfficeTotal && project.metrics?.inTheaters === false) {
        const totalRevenue = project.metrics.boxOfficeTotal;
        const budget = project.budget.total;
        const profitMargin = (totalRevenue * 0.55) / budget; // Studio share vs budget
        
        if (profitMargin > 2.0) { // 200% return - huge success
          studio.reputation = Math.min(100, studio.reputation + 3);
          console.log(`📈 Big reputation boost from blockbuster ${project.title} (${(profitMargin * 100).toFixed(0)}% return)`);
        } else if (profitMargin > 1.2) { // 120% return - solid hit
          studio.reputation = Math.min(100, studio.reputation + 1);
          console.log(`📈 Reputation boost from successful ${project.title}`);
        } else if (profitMargin < 0.3) { // Less than 30% return - bomb
          studio.reputation = Math.max(0, studio.reputation - 2);
          console.log(`📉 Reputation hit from bomb ${project.title}`);
        }
      }
    });
    
    console.log(`💰 STUDIO STATUS: Budget: $${studio.budget.toLocaleString()}, Debt: $${(studio.debt || 0).toLocaleString()}, Reputation: ${studio.reputation.toFixed(1)}`);
    
    return { studio };
  };

  const handleAdvanceWeek = () => {
    console.log(`🕐 ADVANCING WEEK: Current Y${gameState.currentYear}W${gameState.currentWeek}`);
    console.log(`🕐 Projects count: ${gameState.projects.length}`);
    gameState.projects.forEach((p, i) => {
      console.log(`   [${i}] ${p.title}: Phase=${p.currentPhase}, Status=${p.status}, PhaseDuration=${p.phaseDuration || 0}`);
    });
    
    setGameState(prev => {
      const newTimeState = TimeSystem.advanceWeek({
        currentWeek: prev.currentWeek,
        currentYear: prev.currentYear,
        currentQuarter: prev.currentQuarter
      });
      
      console.log(`🕐 NEW TIME STATE: Y${newTimeState.currentYear}W${newTimeState.currentWeek}`);
      
      // Process scheduled releases first
      let updatedProjects = prev.projects;
      
      import('./ReleaseSystem').then(({ ReleaseSystem }) => {
        const releasingFilms = ReleaseSystem.processReleases(newTimeState);
        
        if (releasingFilms.length > 0) {
          updatedProjects = updatedProjects.map(project => {
            const releasingFilm = releasingFilms.find(rf => rf.id === project.id);
            if (releasingFilm) {
              return {
                ...project,
                status: 'released',
                releaseWeek: newTimeState.currentWeek,
                releaseYear: newTimeState.currentYear
              };
            }
            return project;
          });
        }
      });
      
      // Simulate box office for released films
      import('./FinancialEngine').then(({ FinancialEngine }) => {
        const releasedFilms = updatedProjects
          .filter(p => p.status === 'released' && p.releaseWeek && p.releaseYear)
          .map(p => ({
            id: p.id,
            title: p.title,
            weeksSinceRelease: TimeSystem.calculateWeeksSince(
              p.releaseWeek!,
              p.releaseYear!,
              newTimeState.currentWeek,
              newTimeState.currentYear
            ),
            budget: p.budget?.total || 10000000,
            genre: p.script?.genre || 'drama'
          }));
        
        FinancialEngine.simulateBoxOfficeWeek(releasedFilms, newTimeState.currentWeek, newTimeState.currentYear);
        
        // Process weekly financial events
        FinancialEngine.processWeeklyFinancialEvents(
          newTimeState.currentWeek,
          newTimeState.currentYear,
          [prev.studio, ...prev.competitorStudios],
          updatedProjects
        );
      });
      
      updatedProjects = processWeeklyProjectEffects(updatedProjects, newTimeState);

      // Generate AI studio releases every 2-4 weeks
      const shouldGenerateRelease = Math.random() < 0.3; // 30% chance each week
      let newAIReleases: any[] = [];
      
      if (shouldGenerateRelease && prev.competitorStudios.length > 0) {
        const studioGenerator = new StudioGenerator();
        const randomStudio = prev.competitorStudios[Math.floor(Math.random() * prev.competitorStudios.length)];
        // Find corresponding studio profile by name
        const studioProfile = studioGenerator.getStudioProfile(randomStudio.name);
        if (studioProfile) {
          const aiRelease = studioGenerator.generateStudioRelease(studioProfile, newTimeState.currentWeek, newTimeState.currentYear);
          if (aiRelease) {
            newAIReleases.push(aiRelease);
          }
        }
      }
      
      // Process weekly costs and reputation with deep system
      const weeklyResults = processWeeklyCosts(prev, updatedProjects);
      
      // Update industry context and calculate deep reputation
      DeepReputationSystem.updateIndustryContext([...prev.competitorStudios, prev.studio], newTimeState);
      const deepRepResult = DeepReputationSystem.calculateDeepReputation(
        weeklyResults.studio,
        updatedProjects,
        prev.talent,
        newTimeState,
        prev.competitorStudios
      );
      
      // Apply deep reputation to studio
      const enhancedStudio = {
        ...weeklyResults.studio,
        reputation: deepRepResult.reputation
      };
      
      const newState = {
        ...prev,
        currentWeek: newTimeState.currentWeek,
        currentYear: newTimeState.currentYear,
        currentQuarter: newTimeState.currentQuarter,
        projects: updatedProjects,
        studio: enhancedStudio,
        allReleases: [...prev.allReleases, ...newAIReleases]
      };

      setTimeout(() => {
        // Run system integration checks periodically
        import('./SystemIntegration').then(({ SystemIntegration }) => {
          SystemIntegration.runDiagnostics(newState);
        });
        
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
      {/* Achievement Notifications */}
      <AchievementNotifications
        achievements={achievements.recentUnlocks}
        onDismiss={(achievementId) => {
          achievements.clearRecentUnlocks();
          handleAchievementRewards(achievements.recentUnlocks);
        }}
      />

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
                  {gameState.studio.debt && gameState.studio.debt > 0 && (
                    <span className="text-destructive text-xs ml-2">
                      Debt: ${(gameState.studio.debt / 1000000).toFixed(1)}M
                    </span>
                  )}
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
                onClick={skipToPostTheatrical}
                variant="outline"
                className="mr-4"
              >
                🚀 Skip to Post-Theatrical Test
              </Button>
              
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
            <div className="flex space-x-1 overflow-x-auto">
              {[
                { id: 'dashboard', label: 'Dashboard', IconComponent: StudioIcon },
                { id: 'scripts', label: 'Scripts', IconComponent: ScriptIcon },
                { id: 'casting', label: 'Casting', IconComponent: CastingIcon },
                { id: 'media', label: 'Media', IconComponent: BarChartIcon },
                { id: 'production', label: 'Production', IconComponent: ProductionIcon },
                { id: 'marketing', label: 'Marketing', IconComponent: MarketingIcon },
                { id: 'distribution', label: 'Distribution', IconComponent: DistributionIcon },
                { id: 'financials', label: 'Financials', IconComponent: BudgetIcon },
                { id: 'competition', label: 'AI Competition', IconComponent: BarChartIcon },
                { id: 'awards', label: 'Awards', IconComponent: ReputationIcon },
                { id: 'market', label: 'Market', IconComponent: BarChartIcon },
                { id: 'topfilms', label: 'Top Films', IconComponent: BarChartIcon },
                { id: 'stats', label: 'Stats', IconComponent: BarChartIcon },
                { id: 'reputation', label: 'Reputation', IconComponent: ReputationIcon },
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
        
        {currentPhase === 'talent' && (
          <div className="space-y-6">
            <Tabs defaultValue="marketplace" className="space-y-4">
              <TabsList>
                <TabsTrigger value="marketplace">Talent Marketplace</TabsTrigger>
                <TabsTrigger value="agencies">Agency Network</TabsTrigger>
                <TabsTrigger value="wellness">Wellness Monitor</TabsTrigger>
                <TabsTrigger value="chemistry">Chemistry & Relations</TabsTrigger>
                <TabsTrigger value="test">🧪 Integration Test</TabsTrigger>
              </TabsList>
              
              <TabsContent value="marketplace">
                <Suspense fallback={<div>Loading talent marketplace...</div>}>
                  {React.createElement(React.lazy(() => import('./TalentMarketplace').then(m => ({ default: m.TalentMarketplace }))), {
                    talent: gameState.talent,
                    currentWeek: gameState.currentWeek,
                    currentYear: gameState.currentYear,
                    onCastTalent: (talentId: string) => console.log('Cast talent:', talentId)
                  })}
                </Suspense>
              </TabsContent>
              
              <TabsContent value="agencies">
                <Suspense fallback={<div>Loading agency system...</div>}>
                  {React.createElement(React.lazy(() => import('./TalentAgencySystem').then(m => ({ default: m.TalentAgencySystem }))), {
                    agents: gameState.talent.map(t => t.agent).filter(Boolean),
                    talent: gameState.talent,
                    studioId: gameState.studio.id,
                    currentWeek: gameState.currentWeek,
                    currentYear: gameState.currentYear,
                    onNegotiateDeal: (agentId: string, talentId: string, terms: any) => console.log('Negotiating deal:', { agentId, talentId, terms }),
                    onCreateHold: (hold: any) => console.log('Creating hold:', hold)
                  })}
                </Suspense>
              </TabsContent>
              
              <TabsContent value="wellness">
                <Suspense fallback={<div>Loading wellness monitor...</div>}>
                  {React.createElement(React.lazy(() => import('./TalentBurnoutSystem').then(m => ({ default: m.TalentBurnoutSystem }))), {
                    talent: gameState.talent,
                    currentWeek: gameState.currentWeek,
                    currentYear: gameState.currentYear
                  })}
                </Suspense>
              </TabsContent>
              
              <TabsContent value="chemistry">
                <Suspense fallback={<div>Loading chemistry system...</div>}>
                  {React.createElement(React.lazy(() => import('./TalentChemistrySystem').then(m => ({ default: m.TalentChemistrySystem }))), {
                    talent: gameState.talent,
                    chemistryEvents: [],
                    currentWeek: gameState.currentWeek,
                    currentYear: gameState.currentYear
                  })}
                </Suspense>
              </TabsContent>
              
              <TabsContent value="test">
                <Suspense fallback={<div>Loading test suite...</div>}>
                  {React.createElement(React.lazy(() => import('./AdvancedTalentTestSuite').then(m => ({ default: m.AdvancedTalentTestSuite }))), {})}
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
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
        
        {currentPhase === 'media' && (
          <Suspense fallback={<div>Loading media dashboard...</div>}>
            <Tabs defaultValue="feed" className="space-y-4">
              <TabsList>
                <TabsTrigger value="feed">Media Feed</TabsTrigger>
                <TabsTrigger value="responses">Response Center</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="feed">
                {React.createElement(React.lazy(() => import('./MediaDashboard').then(m => ({ default: m.MediaDashboard }))), {
                  gameState: gameState
                })}
              </TabsContent>
              
              <TabsContent value="responses">
                {React.createElement(React.lazy(() => import('./MediaResponseDashboard').then(m => ({ default: m.MediaResponseDashboard }))), {
                  gameState: gameState,
                  onBudgetUpdate: (newBudget: number) => {
                    setGameState(prev => ({
                      ...prev,
                      studio: { ...prev.studio, budget: newBudget }
                    }));
                  },
                  onReputationUpdate: (change: number) => {
                    setGameState(prev => ({
                      ...prev,
                      studio: { ...prev.studio, reputation: Math.max(0, Math.min(100, prev.studio.reputation + change)) }
                    }));
                  }
                })}
              </TabsContent>
              
              <TabsContent value="analytics">
                <div className="text-center text-muted-foreground py-8">
                  <h3 className="text-lg font-semibold mb-2">Media Analytics Dashboard</h3>
                  <p>Advanced analytics and reputation tracking coming soon...</p>
                </div>
              </TabsContent>
            </Tabs>
          </Suspense>
        )}
        
        {currentPhase === 'distribution' && (
          <PostTheatricalManagement 
            gameState={gameState}
            onProjectUpdate={handleProjectUpdate}
          />
        )}
        
        {currentPhase === 'financials' && (
          <FinancialDashboard
            currentWeek={gameState.currentWeek}
            currentYear={gameState.currentYear}
            projects={gameState.projects}
          />
        )}
        
        {currentPhase === 'competition' && (
          <CompetitorMonitor 
            competitorStudios={gameState.competitorStudios}
            currentWeek={gameState.currentWeek}
            currentYear={gameState.currentYear}
          />
        )}
        
        {currentPhase === 'awards' && (
          <div className="space-y-6">
            <div className="text-center text-muted-foreground">
              <h2 className="text-2xl font-bold mb-4">🏆 Awards System</h2>
              <p>Awards system implementation complete!</p>
              <p className="text-sm">Awards ceremonies will trigger automatically in March (Week 12) each year.</p>
            </div>
          </div>
        )}
        
        {currentPhase === 'market' && (
          <MarketCompetition gameState={gameState} />
        )}
        
        {currentPhase === 'topfilms' && (
          <TopFilmsChart gameState={gameState} allReleases={gameState.allReleases} />
        )}
        
        {currentPhase === 'stats' && (
          <PerformanceMetrics gameState={gameState} />
        )}
        
        {currentPhase === 'reputation' && (
          <DeepReputationPanel 
            studio={gameState.studio}
            projects={gameState.projects}
            talent={gameState.talent}
            timeState={{
              currentWeek: gameState.currentWeek,
              currentYear: gameState.currentYear,
              currentQuarter: gameState.currentQuarter
            }}
            allStudios={gameState.competitorStudios}
          />
        )}
      </div>
    </div>
  );
};