import React, { useState, Suspense } from 'react';
import { GameState, Studio, Project, Script, TalentPerson, BoxOfficeWeek, BoxOfficeRelease, Genre, MarketingStrategy, ReleaseStrategy, ProductionPhase, ScriptCharacter } from '@/types/game';
import { useLoadingContext } from '@/contexts/LoadingContext';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { LOADING_OPERATIONS, delay, simulateProgress } from '@/utils/loadingUtils';
import { FranchiseGenerator } from '@/data/FranchiseGenerator';
import { PublicDomainGenerator } from '@/data/PublicDomainGenerator';
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
import { EnhancedAwardsSystem } from './EnhancedAwardsSystem';
import { RoleBasedCasting } from './RoleBasedCasting';
import { EnhancedReleaseSystem } from './EnhancedReleaseSystem';
import { EnhancedLoanSystem } from './EnhancedLoanSystem';
import { MarketCompetition } from './MarketCompetition';
import { TopFilmsChart } from './TopFilmsChart';
import { AchievementsPanel } from './AchievementsPanel';
import { PerformanceMetrics } from './PerformanceMetrics';
import { AchievementNotifications } from './AchievementNotifications';
import { ReputationPanel } from './ReputationPanel';
import { DeepReputationPanel } from './DeepReputationPanel';
import { TalentGenerator } from '../../data/TalentGenerator';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ChevronDown } from 'lucide-react';

interface StudioMagnateGameProps {
  onPhaseChange?: (phase: string) => void;
  gameConfig?: {
    studioName: string;
    specialties: Genre[];
    difficulty: 'easy' | 'normal' | 'hard' | 'magnate';
    startingBudget: number;
  };
}

export const StudioMagnateGame: React.FC<StudioMagnateGameProps> = ({ onPhaseChange, gameConfig }) => {
  const { toast } = useToast();
  const { loading, startOperation, updateOperation, completeOperation } = useLoadingContext();
  
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
    // Start loading for game initialization
    startOperation(LOADING_OPERATIONS.GAME_INIT.id, LOADING_OPERATIONS.GAME_INIT.name, LOADING_OPERATIONS.GAME_INIT.estimatedTime);
    
    // Initialize in steps with progress updates
    updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 10, 'Setting up studio...');
    
    const studio = {
      id: 'player-studio',
      name: gameConfig?.studioName || 'Untitled Pictures',
      reputation: 50,
      budget: gameConfig?.startingBudget || 10000000,
      founded: new Date().getFullYear(),
      specialties: gameConfig?.specialties || ['drama'] as Genre[],
      debt: 0,
      lastProjectWeek: 0,
      weeksSinceLastProject: 0
    };

    updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 30, 'Generating talent pool...');
    
    // Initialize comprehensive talent pool
    const talentGenerator = new TalentGenerator();
    const generatedTalent = talentGenerator.generateTalentPool(300, 50);

    updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 60, 'Creating competitor studios...');
    
    const studioGenerator = new StudioGenerator();
    const competitorStudios = studioGenerator.generateCompetitorStudios();

    updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 80, 'Initializing systems...');

    const initialState = {
      studio,
      currentYear: new Date().getFullYear(),
      currentWeek: 1,
      currentQuarter: 1,
      projects: [],
      talent: generatedTalent,
      scripts: [],
      competitorStudios,
      marketConditions: {
        trendingGenres: ['action', 'drama', 'comedy'] as Genre[],
        audiencePreferences: [],
        economicClimate: 'stable' as const,
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
      allReleases: (() => {
        const sg = new StudioGenerator();
        const releases: Project[] = [];
        const currentYear = new Date().getFullYear();
        const yearsToSeed = [currentYear - 1, currentYear];
        for (const year of yearsToSeed) {
          for (let w = 1; w <= 52; w++) {
            let added = false;
            for (const st of competitorStudios) {
              const profile = sg.getStudioProfile(st.name);
              const rel = profile ? sg.generateStudioRelease(profile, w, year) : null;
              if (rel) { releases.push(rel); added = true; break; }
            }
            if (!added && competitorStudios[0]) {
              const fallback = sg.getStudioProfile(competitorStudios[0].name);
              if (fallback) {
                const rel = sg.generateStudioRelease(fallback, w, year);
                if (rel) {
                  releases.push(rel);
                } else {
                  // Guarantee at least one release per week: synthesize a small indie release
                  const genre = fallback.specialties[0] as Genre;
                  const script = {
                    id: `script-${year}-${w}-${Math.random().toString(36).slice(2, 8)}`,
                    title: sg.generateFilmTitle(genre, fallback.name),
                    genre,
                    logline: 'An indie story released to keep the slate full.',
                    writer: 'Staff Writer',
                    pages: 100,
                    quality: 60,
                    budget: 12000000,
                    developmentStage: 'final',
                    themes: ['indie','festival'],
                    targetAudience: 'general',
                    estimatedRuntime: 110,
                    characteristics: { tone: 'balanced', pacing: 'steady', dialogue: 'naturalistic', visualStyle: 'realistic', commercialAppeal: 5, criticalPotential: 6, cgiIntensity: 'minimal' }
                  } as Script;
                  releases.push({
                    id: `ai-project-${year}-${w}-${Math.random().toString(36).slice(2, 6)}`,
                    title: script.title,
                    script,
                    type: 'feature',
                    currentPhase: 'release',
                    status: 'released',
                    phaseDuration: 0,
                    contractedTalent: [],
                    developmentProgress: { scriptCompletion: 100, budgetApproval: 100, talentAttached: 100, locationSecured: 100, completionThreshold: 100, issues: [] },
                    budget: {
                      total: script.budget,
                      allocated: { aboveTheLine: script.budget * 0.2, belowTheLine: script.budget * 0.3, postProduction: script.budget * 0.15, marketing: script.budget * 0.25, distribution: script.budget * 0.1, contingency: 0 },
                      spent: { aboveTheLine: script.budget * 0.2, belowTheLine: script.budget * 0.3, postProduction: script.budget * 0.15, marketing: script.budget * 0.25, distribution: script.budget * 0.1, contingency: 0 },
                      overages: { aboveTheLine: 0, belowTheLine: 0, postProduction: 0, marketing: 0, distribution: 0, contingency: 0 }
                    },
                    cast: [],
                    crew: [],
                    timeline: { preProduction: { start: new Date(), end: new Date() }, principalPhotography: { start: new Date(), end: new Date() }, postProduction: { start: new Date(), end: new Date() }, release: new Date(), milestones: [] },
                    locations: [],
                    distributionStrategy: { primary: { platform: 'Theatrical', type: 'theatrical', revenue: { type: 'box-office', studioShare: 50 } }, international: [], windows: [], marketingBudget: script.budget * 0.25 },
                    metrics: {
                      inTheaters: true,
                      boxOfficeTotal: Math.floor(script.budget * 2.2),
                      theaterCount: 1200,
                      weeksSinceRelease: 0,
                      criticsScore: 70,
                      audienceScore: 72,
                      boxOfficeStatus: 'Current',
                      theatricalRunLocked: false,
                      boxOffice: { openingWeekend: 0, domesticTotal: 0, internationalTotal: 0, production: script.budget, marketing: script.budget * 0.25, profit: 0, theaters: 1200, weeks: 0 }
                    },
                    releaseWeek: w,
                    releaseYear: year,
                    studioName: fallback.name
                  } as Project);
                }
              }
            }
          }
        }
        return releases;
      })(), // Pre-generated AI releases for current and previous year
      topFilmsHistory: [],
      // Initialize Franchise & Public Domain Systems
      franchises: FranchiseGenerator.generateInitialFranchises(30),
      publicDomainIPs: PublicDomainGenerator.generateInitialPublicDomainIPs(50),
      aiStudioProjects: [] as Project[],
    };
    updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 100, 'Game ready!');
    
    // Complete initialization after a brief delay
    setTimeout(() => {
      completeOperation(LOADING_OPERATIONS.GAME_INIT.id);
    }, 500);

    return initialState;
  });

  // Market dynamics hooks  
  const talentMarket = useTalentMarket(gameState.talent, gameState.currentWeek);
  const genreSaturation = useGenreSaturation(gameState.allReleases.filter((item): item is Project => 'script' in item), gameState.currentWeek);
  const achievements = useAchievements(gameState);

  const [currentPhase, setCurrentPhase] = useState<'dashboard' | 'scripts' | 'casting' | 'talent' | 'franchise' | 'media' | 'production' | 'marketing' | 'distribution' | 'financials' | 'awards' | 'market' | 'topfilms' | 'stats' | 'reputation' | 'competition'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedFranchise, setSelectedFranchise] = useState<string | null>(null);
  const [selectedPublicDomain, setSelectedPublicDomain] = useState<string | null>(null);

  // Handle achievement rewards
  const handleAchievementRewards = (unlockedAchievements: Array<{ reward?: { reputation?: number; budget?: number } }>) => {
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

  const handleProjectCreate = async (script: Script) => {
    // Start loading for project creation
    startOperation('project-create', 'Creating Project', 2);
    updateOperation('project-create', 20, 'Validating budget...');
    
    const developmentCost = script.budget * 0.1;
    
    // Check if studio can afford the project (including potential loan capacity)
    const maxLoanCapacity = Math.max(0, 50000000 - (gameState.studio.debt || 0)); // $50M max debt
    const availableFunds = gameState.studio.budget + maxLoanCapacity;
    
    if (developmentCost > availableFunds) {
      updateOperation('project-create', 40, 'Insufficient funds available');
      completeOperation('project-create');
      toast({
        title: "Cannot Greenlight Project",
        description: "Project cost exceeds studio capacity even with loans.",
        variant: "destructive"
      });
      return;
    }

    updateOperation('project-create', 60, 'Setting up project structure...');

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

    // Auto-generate roles from source material if none defined
    let enrichedProject: Project = newProject;
    try {
      const roles: ScriptCharacter[] = [];
      if ((!newProject.script.characters || newProject.script.characters.length === 0)) {
        if (newProject.script.sourceType === 'franchise' && newProject.script.franchiseId) {
          const franchise = gameState.franchises.find(f => f.id === newProject.script.franchiseId);
          if (franchise) {
            // Common franchise roles
            if ((franchise as any).predefinedRoles && Array.isArray((franchise as any).predefinedRoles)) {
              (franchise as any).predefinedRoles.forEach((r: any) => {
                roles.push({ id: r.id, name: r.name, importance: r.importance, description: r.description, requiredType: r.requiredType, ageRange: r.ageRange });
              });
            }
            const genreList = franchise.genre.join(',').toLowerCase();
            if (genreList.includes('action')) {
              roles.push({ id: 'hero-lead', name: 'Hero', importance: 'lead', description: 'The main protagonist', requiredType: 'actor', ageRange: [25,45] });
              roles.push({ id: 'villain', name: 'Main Villain', importance: 'supporting', description: 'Primary antagonist', requiredType: 'actor', ageRange: [30,60] });
            }
            if (genreList.includes('romance')) {
              roles.push({ id: 'love-interest', name: 'Love Interest', importance: 'supporting', description: 'Romantic partner', requiredType: 'actor', ageRange: [22,40] });
            }
          }
        } else if (newProject.script.sourceType === 'public-domain' && newProject.script.publicDomainId) {
          const pd = gameState.publicDomainIPs?.find(p => p.id === newProject.script.publicDomainId);
          if (pd?.suggestedCharacters) {
            pd.suggestedCharacters.forEach(c => roles.push({ ...c }));
          }
        }
        // Always ensure a director role exists
        if (!roles.some(r => r.requiredType === 'director')) {
          roles.push({ id: 'director', name: 'Director', importance: 'crew', description: 'Film director', requiredType: 'director' });
        }
        // Ensure at least one cameo/minor role for flavor
        if (!roles.some(r => r.importance === 'minor')) {
          roles.push({ id: 'cameo-generic', name: 'Cameo Appearance', importance: 'minor', description: 'Short cameo role', requiredType: 'actor', ageRange: [25, 80] });
        }
        if (roles.length > 0) {
          enrichedProject = { ...newProject, script: { ...newProject.script, characters: roles } };
        }
      }
    } catch (e) {
      console.warn('Role auto-generation failed', e);
    }

    updateOperation('project-create', 90, 'Finalizing project...');

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
      projects: [...prev.projects, enrichedProject],
      studio: {
        ...prev.studio,
        budget: finalBudget,
        debt: newDebt,
        lastProjectWeek: prev.currentWeek,
        weeksSinceLastProject: 0
      }
    }));

    updateOperation('project-create', 100, 'Project created successfully!');

    setSelectedProject(newProject);
    toast({
      title: "Project Greenlit!",
      description: `"${script.title}" has entered development.`,
    });
    
    // Complete loading operation
    setTimeout(() => completeOperation('project-create'), 500);
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
      toast({
        title: "Invalid Release Date",
        description: "Release date cannot be in the past.",
        variant: "destructive"
      });
      return;
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
      phaseDuration: -1, // Special value to prevent auto-advancement until release date
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

      // CRITICAL: Only process phase timers for specific phases (skip if phaseDuration is -1, which means manual control)
      if (updatedProject.phaseDuration !== undefined && updatedProject.phaseDuration > 0) {
        const newPhaseDuration = updatedProject.phaseDuration - 1;
        
        console.log(`⏱️ Phase timer for ${updatedProject.title}: ${updatedProject.phaseDuration} -> ${newPhaseDuration} (${updatedProject.currentPhase})`);
        
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

  const getNextPhase = (currentPhase: string): ProductionPhase => {
    switch (currentPhase) {
      case 'development': return 'pre-production';
      case 'pre-production': return 'production';
      case 'production': return 'post-production';
      case 'post-production': return 'marketing';
      case 'marketing': return 'release';
      case 'release': return 'distribution';
      default: return currentPhase as ProductionPhase;
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
        phaseDuration: 0,
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
        
        console.log(`📊 Checking reputation for ${project.title}: Profit margin ${(profitMargin * 100).toFixed(0)}%`);
        
        if (profitMargin > 2.0) { // 200% return - huge success
          studio.reputation = Math.min(100, studio.reputation + 3);
          console.log(`📈 Big reputation boost from blockbuster ${project.title} (${(profitMargin * 100).toFixed(0)}% return): ${studio.reputation}`);
        } else if (profitMargin > 1.2) { // 120% return - solid hit
          studio.reputation = Math.min(100, studio.reputation + 1);
          console.log(`📈 Reputation boost from successful ${project.title}: ${studio.reputation}`);
        } else if (profitMargin < 0.3) { // Less than 30% return - bomb
          studio.reputation = Math.max(0, studio.reputation - 2);
          console.log(`📉 Reputation hit from bomb ${project.title}: ${studio.reputation}`);
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
    
    // Start weekly processing with loading
    startOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, LOADING_OPERATIONS.WEEKLY_PROCESSING.name, LOADING_OPERATIONS.WEEKLY_PROCESSING.estimatedTime);
    
    updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 10, 'Advancing time...');
    // Remove await since we'll handle this synchronously

    updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 50, 'Processing AI studios...');
    
    setGameState(prev => {
      const newTimeState = TimeSystem.advanceWeek({
        currentWeek: prev.currentWeek,
        currentYear: prev.currentYear,
        currentQuarter: prev.currentQuarter
      });
      
      console.log(`🕐 NEW TIME STATE: Y${newTimeState.currentYear}W${newTimeState.currentWeek}`);
      
      // Process AI studio timelines and potential new film starts
      try {
        AIStudioManager.processWeeklyAIFilms(newTimeState.currentWeek, newTimeState.currentYear);
        if (prev.competitorStudios.length > 0) {
          const shouldStartAIFilm = (newTimeState.currentWeek % 4 === 1) || Math.random() < 0.35;
          if (shouldStartAIFilm) {
            const randomStudio = prev.competitorStudios[Math.floor(Math.random() * prev.competitorStudios.length)];
            AIStudioManager.createAIFilm(
              randomStudio,
              newTimeState.currentWeek,
              newTimeState.currentYear,
              prev.talent.filter(t => t.contractStatus === 'available')
            );
          }
        }
      } catch (e) {
        console.warn('AI Studio processing error', e);
      }
      
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
        const playerReleased = updatedProjects
          .filter(p => p.status === 'released' && !!p.releaseWeek && !!p.releaseYear)
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
        const aiReleased = prev.allReleases
          .filter((r): r is Project => 'script' in r && (r as any).status === 'released' && !!r.releaseWeek && !!r.releaseYear)
          .map(r => ({
            id: r.id,
            title: r.title,
            weeksSinceRelease: TimeSystem.calculateWeeksSince(
              r.releaseWeek!,
              r.releaseYear!,
              newTimeState.currentWeek,
              newTimeState.currentYear
            ),
            budget: (r as any).budget?.total || (r as any).budget || 10000000,
            genre: (r as any).script?.genre || (r as any).genre || 'drama'
          }));
        const releasedFilms = [...playerReleased, ...aiReleased];
        
        FinancialEngine.simulateBoxOfficeWeek(releasedFilms, newTimeState.currentWeek, newTimeState.currentYear);
        
        // Process weekly financial events
        FinancialEngine.processWeeklyFinancialEvents(
          newTimeState.currentWeek,
          newTimeState.currentYear,
          [prev.studio, ...prev.competitorStudios],
          updatedProjects
        );
      });
      
      updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 70, 'Calculating finances...');
      
      updatedProjects = processWeeklyProjectEffects(updatedProjects, newTimeState);

      // Generate AI studio releases every 2-4 weeks
      const shouldGenerateRelease = Math.random() < 0.3; // 30% chance each week
      let newAIReleases: Project[] = [];
      
      updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 90, 'Finalizing updates...');
      
      if (shouldGenerateRelease && prev.competitorStudios.length > 0) {
        const studioGenerator = new StudioGenerator();
        const randomStudio = prev.competitorStudios[Math.floor(Math.random() * prev.competitorStudios.length)];
        // Find corresponding studio profile by name
        const studioProfile = studioGenerator.getStudioProfile(randomStudio.name);
        if (studioProfile) {
          const aiRelease = studioGenerator.generateStudioRelease(studioProfile, newTimeState.currentWeek, newTimeState.currentYear);
          if (aiRelease) {
            // Set proper release timing for AI films
            aiRelease.releaseWeek = newTimeState.currentWeek;
            aiRelease.releaseYear = newTimeState.currentYear;
            aiRelease.studioName = studioProfile.name; // Track which AI studio made this
            newAIReleases.push(aiRelease);
            console.log(`🤖 AI STUDIO: ${studioProfile.name} released "${aiRelease.title}" (${aiRelease.script.genre})`);
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
      
      console.log(`📊 Weekly reputation update: ${prev.studio.reputation} -> ${weeklyResults.studio.reputation}`);
      console.log(`🏆 Deep reputation: Overall ${deepRepResult.reputation.toFixed(1)}`);
      
      // Apply deep reputation to studio
      const enhancedStudio = {
        ...weeklyResults.studio,
        reputation: deepRepResult.reputation
      };
      
      // Update talent availability (prevent double-booking during filming)
      const currentAbsWeek = (newTimeState.currentYear * 52) + newTimeState.currentWeek;
      const updatedTalent = prev.talent.map(t => {
        let status = t.contractStatus;
        let busyUntil = t.busyUntilWeek;
        if (status === 'busy' && typeof busyUntil === 'number' && busyUntil <= currentAbsWeek) {
          status = 'available';
          busyUntil = undefined;
        }
        return { ...t, contractStatus: status, busyUntilWeek: busyUntil };
      });
      // Mark cast as busy for projects in production
      updatedProjects.forEach(p => {
        if (p.currentPhase === 'production' || p.status === 'filming') {
          p.cast?.forEach(c => {
            const idx = updatedTalent.findIndex(t => t.id === c.talentId);
            if (idx >= 0) {
              const isCameo = c.role.toLowerCase().includes('cameo') || c.role.toLowerCase().includes('minor');
              const durationWeeks = isCameo ? 2 : 8;
              updatedTalent[idx] = {
                ...updatedTalent[idx],
                contractStatus: 'busy',
                busyUntilWeek: currentAbsWeek + durationWeeks
              };
            }
          });
        }
      });

      const newState = {
        ...prev,
        currentWeek: newTimeState.currentWeek,
        currentYear: newTimeState.currentYear,
        currentQuarter: newTimeState.currentQuarter,
        projects: updatedProjects,
        studio: enhancedStudio,
        allReleases: [...prev.allReleases, ...newAIReleases],
        aiStudioProjects: [...prev.allReleases, ...newAIReleases].filter((r): r is Project => 'script' in r),
        talent: updatedTalent
      };

      setTimeout(() => {
        // Process media events and run system integration checks
        import('./MediaEngine').then(({ MediaEngine }) => {
          const newMediaItems = MediaEngine.processMediaEvents(newState);
          const triggeredEvents = MediaEngine.triggerAutomaticEvents(newState, gameState);
          if (newMediaItems.length > 0 || triggeredEvents.length > 0) {
            console.log(`📰 MEDIA: Generated ${newMediaItems.length} articles, triggered ${triggeredEvents.length} events`);
          }
        });

        // Perform memory cleanup for static classes every 10 weeks
        if (newTimeState.currentWeek % 10 === 0) {
          import('./CrisisManagement').then(({ CrisisManagement }) => {
            CrisisManagement.performMaintenanceCleanup(newTimeState.currentWeek, newTimeState.currentYear);
          });
          import('./MediaRelationships').then(({ MediaRelationships }) => {
            MediaRelationships.performMaintenanceCleanup(newTimeState.currentWeek, newTimeState.currentYear);
          });
        }
        
        import('./SystemIntegration').then(({ SystemIntegration }) => {
          SystemIntegration.runDiagnostics(newState);
        });
        
        toast({
          title: "New Week",
          description: `Week ${newTimeState.currentWeek}, ${newTimeState.currentYear}`,
        });
        
        // Complete the loading operation
        completeOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id);
      }, 100);

      return newState;
    });
  };

  return (
    <>
      <LoadingOverlay loading={loading} />
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
                    ${(gameState.studio.budget / 1000000).toFixed(0)}M
                  </span>
                  {gameState.studio.debt && gameState.studio.debt > 0 && (
                    <span className="text-destructive text-xs ml-2">
                      Debt: ${(gameState.studio.debt / 1000000).toFixed(0)}M
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
                <ReputationIcon className="text-accent" size={16} />
                <div className="text-sm">
                  <span className="text-muted-foreground">Reputation:</span>{' '}
                  <span className="studio-mono font-semibold text-accent">
                    {Math.round(gameState.studio.reputation)}/100
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
          <div className="flex items-center space-x-1 overflow-x-auto">
            {/* Core Navigation */}
            {[
              { id: 'dashboard', label: 'Dashboard', IconComponent: StudioIcon },
              { id: 'scripts', label: 'Scripts', IconComponent: ScriptIcon },
              { id: 'casting', label: 'Casting', IconComponent: CastingIcon },
              { id: 'production', label: 'Production', IconComponent: ProductionIcon },
              { id: 'marketing', label: 'Marketing', IconComponent: MarketingIcon },
              { id: 'distribution', label: 'Distribution', IconComponent: DistributionIcon },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={`rounded-none border-b-2 px-4 py-4 font-medium transition-all duration-300 ${
                  currentPhase === tab.id 
                    ? 'border-primary bg-gradient-to-t from-primary/20 to-primary/10 text-primary shadow-lg' 
                    : 'border-transparent hover:border-primary/40 hover:bg-primary/5 btn-ghost-premium'
                }`}
                onClick={() => handlePhaseChange(tab.id as typeof currentPhase)}
              >
                <tab.IconComponent className="mr-2" size={16} />
                {tab.label}
              </Button>
            ))}

            {/* Business Analytics Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`rounded-none border-b-2 px-4 py-4 font-medium transition-all duration-300 border-transparent hover:border-primary/40 hover:bg-primary/5 btn-ghost-premium ${
                    ['financials', 'competition', 'market', 'topfilms', 'stats'].includes(currentPhase)
                      ? 'border-primary bg-gradient-to-t from-primary/20 to-primary/10 text-primary shadow-lg' 
                      : ''
                  }`}
                >
                  <BarChartIcon className="mr-2" size={16} />
                  Analytics
                  <ChevronDown className="ml-1" size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[200px] bg-background/95 backdrop-blur-md">
                <DropdownMenuItem onClick={() => handlePhaseChange('financials')}>
                  <BudgetIcon className="mr-2" size={16} />
                  Financials
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePhaseChange('competition')}>
                  <BarChartIcon className="mr-2" size={16} />
                  AI Competition
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePhaseChange('market')}>
                  <BarChartIcon className="mr-2" size={16} />
                  Market Analysis
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePhaseChange('topfilms')}>
                  <BarChartIcon className="mr-2" size={16} />
                  Top Films
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePhaseChange('stats')}>
                  <BarChartIcon className="mr-2" size={16} />
                  Performance Stats
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Studio Management Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`rounded-none border-b-2 px-4 py-4 font-medium transition-all duration-300 border-transparent hover:border-primary/40 hover:bg-primary/5 btn-ghost-premium ${
                     ['franchise', 'media', 'talent', 'awards', 'reputation'].includes(currentPhase)
                       ? 'border-primary bg-gradient-to-t from-primary/20 to-primary/10 text-primary shadow-lg' 
                       : ''
                   }`}
                >
                  <ReputationIcon className="mr-2" size={16} />
                  Studio
                  <ChevronDown className="ml-1" size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[200px] bg-background/95 backdrop-blur-md">
                <DropdownMenuItem onClick={() => handlePhaseChange('franchise')}>
                  <ClapperboardIcon className="mr-2" size={16} />
                  Franchise Manager
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePhaseChange('media')}>
                  <BarChartIcon className="mr-2" size={16} />
                  Media Relations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePhaseChange('talent')}>
                  <CastingIcon className="mr-2" size={16} />
                  Talent Management
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePhaseChange('awards')}>
                  <ReputationIcon className="mr-2" size={16} />
                  Awards & Recognition
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePhaseChange('reputation')}>
                  <ReputationIcon className="mr-2" size={16} />
                  Reputation Management
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        
        {currentPhase === 'franchise' && (
          <Suspense fallback={<div>Loading franchise manager...</div>}>
            {React.createElement(React.lazy(() => import('./FranchiseManager').then(m => ({ default: m.FranchiseManager }))), {
              gameState: gameState,
              onCreateProject: (franchiseId?: string, publicDomainId?: string, cost?: number) => {
                console.log('Creating project from:', { franchiseId, publicDomainId, cost });
                
                // Deduct cost from studio budget if applicable
                if (cost && cost > 0) {
                  setGameState(prev => ({
                    ...prev,
                    studio: {
                      ...prev.studio,
                      budget: prev.studio.budget - cost
                    }
                  }));
                }
                
                // Store the selected franchise/PD for script auto-filling
                setSelectedFranchise(franchiseId);
                setSelectedPublicDomain(publicDomainId);
                setCurrentPhase('scripts');
              }
            })}
          </Suspense>
        )}
        
        {currentPhase === 'scripts' && (
          <ScriptDevelopment 
            gameState={gameState}
            selectedFranchise={selectedFranchise}
            selectedPublicDomain={selectedPublicDomain}
            onProjectCreate={handleProjectCreate}
            onScriptUpdate={(script) => {
              // Clear selections after script creation
              setSelectedFranchise(null);
              setSelectedPublicDomain(null);
              
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
                    agents: gameState.talent.filter(t => t.agent).map(t => t.agent!),
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
                {React.createElement(React.lazy(() => 
                  import('./MediaDashboard').then(m => ({ default: m.MediaDashboard }))
                  .catch(() => import('./MediaNotifications').then(m => ({ default: m.MediaNotifications })))
                ), {
                  gameState: gameState
                })}
              </TabsContent>
              
              <TabsContent value="responses">
                {React.createElement(React.lazy(() => 
                  import('./MediaResponseDashboard').then(m => ({ default: m.MediaResponseDashboard }))
                  .catch(() => ({ default: () => <div className="text-center py-8 text-muted-foreground">Media Response Dashboard loading...</div> }))
                ), {
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
          <AwardsSystem 
            gameState={gameState}
            onProjectUpdate={handleProjectUpdate}
            onStudioUpdate={handleStudioUpdate}
          />
        )}
        
        {currentPhase === 'market' && (
          <MarketCompetition gameState={gameState} />
        )}
        
        {currentPhase === 'topfilms' && (
          <TopFilmsChart gameState={gameState} allReleases={gameState.allReleases.filter((item): item is Project => 'script' in item)} />
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
    </>
  );
};