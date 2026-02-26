import React, { useEffect, useState, Suspense } from 'react';
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
import { ReleaseSystem } from './ReleaseSystem';
import { CalendarManager } from './CalendarManager';
import { IntegrationMonitor } from './IntegrationMonitor';
import { AwardsCalendar } from './AwardsCalendar';
import { AIStudioManager } from './AIStudioManager';
import { AIStudioIntegrationTests } from './AIStudioIntegrationTests';
import { CompetitorMonitor } from './CompetitorMonitor';
import { TimeSystem, TimeState } from './TimeSystem';
import { BoxOfficeSystem } from './BoxOfficeSystem';
import { TVRatingsSystem } from './TVRatingsSystem';
import { updateProjectFinancials } from './FinancialCalculations';
import { TalentFilmographyManager } from '@/utils/talentFilmographyManager';
import { getProjectCastingSummary, getProjectRoleAssignments } from '@/utils/projectCasting';
import { AwardsSystem } from './AwardsSystem';
import { EnhancedAwardsSystem } from './EnhancedAwardsSystem';
import { RoleBasedCasting } from './RoleBasedCasting';
import { CharacterCastingSystem } from './CharacterCastingSystem';
import { useAwardsEngine } from '@/hooks/useAwardsEngine';
import { IndividualAwardShowModal, AwardShowCeremony } from './IndividualAwardShowModal';
import { FirstWeekBoxOfficeModal } from './FirstWeekBoxOfficeModal';
import { EnhancedLoanSystem } from './EnhancedLoanSystem';
import { MarketCompetition } from './MarketCompetition';
import { TopFilmsChart } from './TopFilmsChart';
import { AchievementsPanel } from './AchievementsPanel';
import { PerformanceMetrics } from './PerformanceMetrics';
import { AchievementNotifications } from './AchievementNotifications';
import { ReputationPanel } from './ReputationPanel';
import { DeepReputationPanel } from './DeepReputationPanel';
import { MediaAnalyticsPanel } from './MediaAnalyticsPanel';
import { BackgroundSimulation as BackgroundSimulationComponent } from './BackgroundSimulation';
import { SequelManagement as SequelManagementComponent } from './SequelManagement';
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
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { EnhancedFinancialAccuracy } from './EnhancedFinancialAccuracy';
import { EnhancedFranchiseSystem } from './EnhancedFranchiseSystem';
import { FranchiseManager } from './FranchiseManager';
import { OwnedFranchiseManager } from './OwnedFranchiseManager';
import { FranchiseProjectCreator } from './FranchiseProjectCreator';
import { EnhancedTalentManagement } from './EnhancedTalentManagement';
import { EnhancedMarketingSystem } from './EnhancedMarketingSystem';
import { FilmStatsModal } from './FilmStatsModal';
import { ReleaseStrategyModal } from './ReleaseStrategyModal';
import { ComprehensiveTelevisionSystem } from './ComprehensiveTelevisionSystem';
import { TelevisionSystemTests } from './TelevisionSystemTests';
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
import { RoleDatabase } from '../../data/RoleDatabase';
import { importRolesForScript } from '@/utils/roleImport';
import { getMandatoryCastingStatus } from '@/utils/castingRequirements';
import { finalizeScriptForSave } from '@/utils/scriptFinalization';
import { MediaFinancialIntegration } from './MediaFinancialIntegration';
import { MediaReputationIntegration } from './MediaReputationIntegration';
import { MediaResponseSystem } from './MediaResponseSystem';
import { saveGame } from '@/utils/saveLoad';
import { normalizeGameStateForLoad } from '@/utils/gameStateNormalization';
import { DebugControlPanel } from './DebugControlPanel';

// Ensure AI films have at least a Director and Lead actor so awards/crediting work
function attachBasicCastForAI(project: Project, talentPool: TalentPerson[]): Project {
  try {
    // If already has cast or assigned characters, do nothing
    if ((project.cast && project.cast.length > 0) || project.script?.characters?.some(c => !c.excluded && c.assignedTalentId)) {
      return project;
    }
    const director = talentPool.find(t => t.type === 'director');
    const lead = talentPool.find(t => t.type === 'actor');
    if (!project.script) return project;

    const baseChars = project.script.characters || [];
    const characters = baseChars.length > 0 ? baseChars.map(c => {
      if (!c.excluded && c.requiredType === 'director' && !c.assignedTalentId && director) return { ...c, assignedTalentId: director.id };
      if (!c.excluded && c.importance === 'lead' && c.requiredType !== 'director' && !c.assignedTalentId && lead) return { ...c, assignedTalentId: lead.id };
      return c;
    }) : [
      { id: `${project.id}-dir`, name: 'Director', description: 'Director', requiredType: 'director', importance: 'lead', traits: ['mandatory'], assignedTalentId: director?.id } as any,
      { id: `${project.id}-lead`, name: 'Protagonist', description: 'Lead role', requiredType: 'actor', importance: 'lead', traits: ['mandatory'], assignedTalentId: lead?.id } as any,
    ];

    const cast = [
      director && { talentId: director.id, role: 'Director', salary: Math.round((director.marketValue || 5_000_000) * 0.1), points: 0, contractTerms: { duration: new Date(), exclusivity: false, merchandising: false, sequelOptions: 0 } },
      lead && { talentId: lead.id, role: `Lead - ${characters.find(c => !c.excluded && c.importance==='lead' && c.requiredType !== 'director')?.name || 'Lead'}`, salary: Math.round((lead.marketValue || 5_000_000) * 0.1), points: 0, contractTerms: { duration: new Date(), exclusivity: false, merchandising: false, sequelOptions: 0 } },
    ].filter(Boolean) as any;

    return {
      ...project,
      script: { ...project.script, characters },
      cast: cast.length > 0 ? cast : project.cast
    };
  } catch (e) {
    console.warn('attachBasicCastForAI failed', e);
    return project;
  }
}

interface StudioMagnateGameProps {
  onPhaseChange?: (phase: string) => void;
  gameConfig?: {
    studioName: string;
    specialties: Genre[];
    difficulty: 'easy' | 'normal' | 'hard' | 'magnate';
    startingBudget: number;
  };
  initialGameState?: GameState;
  /**
   * Optional UI-related metadata from a loaded save (e.g., currentPhase).
   * This allows restoring the player's UI context on load.
   */
  initialPhase?: string;
  /**
   * Optional list of achievement IDs that were already unlocked when loading.
   * Prevents double-rewarding when rehydrating achievements on load.
   */
  initialUnlockedAchievements?: string[];
}

export const StudioMagnateGame: React.FC<StudioMagnateGameProps> = ({
  onPhaseChange,
  gameConfig,
  initialGameState,
  initialPhase,
  initialUnlockedAchievements
}) => {
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
    if (initialGameState) {
      const normalized = normalizeGameStateForLoad(initialGameState);

      // Restore in-memory calendar state from persisted projects (e.g., scheduled releases)
      CalendarManager.syncReleasesFromProjects(normalized.projects || []);

      return normalized;
    }

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
              if (rel) { releases.push(rel); releases[releases.length - 1] = attachBasicCastForAI(releases[releases.length - 1] as Project, generatedTalent); added = true; break; }
            }
            if (!added && competitorStudios[0]) {
              const fallback = sg.getStudioProfile(competitorStudios[0].name);
              if (fallback) {
                const rel = sg.generateStudioRelease(fallback, w, year);
                if (rel) {
                  releases.push(rel);
                  releases[releases.length - 1] = attachBasicCastForAI(releases[releases.length - 1] as Project, generatedTalent);
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
                  releases[releases.length - 1] = attachBasicCastForAI(releases[releases.length - 1] as Project, generatedTalent);
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
  const genreSaturation = useGenreSaturation(
    gameState.allReleases.filter((item): item is Project => 'script' in item),
    gameState.currentWeek,
    gameState.currentYear
  );
  const [currentPhase, setCurrentPhase] = useState<
    'dashboard' | 'scripts' | 'casting' | 'talent' | 'franchise' | 'media' |
    'production' | 'marketing' | 'distribution' | 'finance' |
    'awards' | 'market' | 'topfilms' | 'stats' | 'reputation' | 'loans' |
    'competition' | 'television' | 'tv-tests'
  >(((initialPhase === 'financials' ? 'finance' : initialPhase) as any) || 'dashboard');

  const achievements = useAchievements(gameState, initialUnlockedAchievements);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedFranchise, setSelectedFranchise] = useState<string | null>(null);
  const [selectedPublicDomain, setSelectedPublicDomain] = useState<string | null>(null);
  const [filmReleaseProject, setFilmReleaseProject] = useState<Project | null>(null);

  // Keep CalendarManager's in-memory events hydrated from persisted project state.
  // (CalendarManager stores events in a module-level singleton, so it needs re-hydration on reload.)
  useEffect(() => {
    CalendarManager.syncReleasesFromProjects(gameState.projects || []);
  }, [gameState.projects]);

  const selectedFilmReleaseValidation =
    selectedProject && selectedProject.type !== 'series' && selectedProject.type !== 'limited-series'
      ? ReleaseSystem.validateFilmForRelease(selectedProject)
      : null;

  const selectedFilmHasMarketing =
    !!selectedProject?.marketingCampaign || ((selectedProject?.marketingData?.totalSpent ?? 0) > 0);

  const selectedFilmStatusAllowsReleasePlanning =
    !!selectedProject &&
    ['ready-for-release', 'scheduled-for-release', 'completed'].includes(selectedProject.status as any);

  const canPlanSelectedFilmRelease =
    !!selectedFilmReleaseValidation?.canRelease && (selectedFilmHasMarketing || selectedFilmStatusAllowsReleasePlanning);

  const releasePlanningDisabledReason = !selectedFilmReleaseValidation?.canRelease
    ? 'Complete prerequisites (script + director + lead) first'
    : !selectedFilmHasMarketing && !selectedFilmStatusAllowsReleasePlanning
      ? 'Run a marketing campaign first'
      : undefined;
  
  // First week box office modal state
  const [firstWeekModalProject, setFirstWeekModalProject] = useState<Project | null>(null);
  const [showFirstWeekModal, setShowFirstWeekModal] = useState(false);
  
  // Award show modal state
  const [currentAwardShow, setCurrentAwardShow] = useState<AwardShowCeremony | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);

  // Handle achievement rewards
  const handleAchievementRewards = (unlockedAchievements: Array<{ id?: string; reward?: { reputation?: number; budget?: number } }>) => {
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

  const handleSaveGame = () => {
    try {
      const unlockedIds = achievements.getUnlockedAchievements().map(a => a.id);
      saveGame('slot1', gameState, {
        currentPhase,
        unlockedAchievementIds: unlockedIds
      });
      toast({
        title: 'Game Saved',
        description: 'Your progress has been saved in this browser.',
      });
    } catch (error) {
      console.error('Failed to save game', error);
      toast({
        title: 'Save Failed',
        description: 'Unable to save your game. Check browser storage settings.',
        variant: 'destructive',
      });
    }
  };

  const handlePhaseChange = (phase: typeof currentPhase) => {
    setCurrentPhase(phase);
    onPhaseChange?.(phase);
  };

  // Central helper: build a base project from a script, then apply any overrides
  const createProjectFromScript = (script: Script, overrides?: Partial<Project>): Project => {
    const baseProject: Project = {
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
      // Franchise & Public Domain Integration
      franchiseId: script.franchiseId,
      publicDomainId: script.publicDomainId,
      status: 'development',
      metrics: {}
    };

    // Apply any overrides (for TV/streaming, custom budgets, etc.)
    return { ...baseProject, ...overrides };
  };

  const handleProjectCreate = async (script: Script, overrides?: Partial<Project>) => {
    // Start loading for project creation
    startOperation('project-create', 'Creating Project', 2);
    updateOperation('project-create', 20, 'Validating budget...');
    
    // Use overridden total budget if provided (e.g. TV season budget), otherwise script budget
    const totalBudget = overrides?.budget?.total ?? script.budget;
    const developmentCost = totalBudget * 0.1;
    
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

    const normalizedScript = finalizeScriptForSave(script, gameState);

    const newProject: Project = createProjectFromScript(normalizedScript, overrides);

    // Auto-generate roles only if script has no characters
    let enrichedProject: Project = newProject;
    try {
      const preexisting = newProject.script.characters && newProject.script.characters.length > 0;
      const roles = preexisting ? newProject.script.characters! : importRolesForScript(newProject.script, gameState);
      const normalized = finalizeScriptForSave({ ...newProject.script, characters: roles }, gameState);
      if (normalized.characters && normalized.characters.length > 0) {
        enrichedProject = { ...newProject, script: normalized };
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
        description: `Borrowed ${Math.abs(newBudget).toLocaleString()} to greenlight project.`,
        variant: "default"
      });
    }

    setGameState(prev => {
      // If this project belongs to a franchise, append it to that franchise's entries
      const franchiseId = enrichedProject.script?.franchiseId;
      const updatedFranchises = franchiseId
        ? (prev.franchises || []).map(f => {
            if (f.id !== franchiseId) return f;
            const existingEntries = f.entries || [];
            if (existingEntries.includes(enrichedProject.id)) return f;
            return {
              ...f,
              entries: [...existingEntries, enrichedProject.id],
            };
          })
        : prev.franchises;

      return {
        ...prev,
        projects: [...prev.projects, enrichedProject],
        studio: {
          ...prev.studio,
          budget: finalBudget,
          debt: newDebt,
          lastProjectWeek: prev.currentWeek,
          weeksSinceLastProject: 0,
        },
        franchises: updatedFranchises,
      };
    });

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

  const handleTalentUpdate = (talentId: string, updates: Partial<TalentPerson>) => {
    setGameState(prev => ({
      ...prev,
      talent: prev.talent.map(t => t.id === talentId ? { ...t, ...updates } : t)
    }));
  };

  const handleCreateFranchise = (franchise: any) => {
    setGameState(prev => ({
      ...prev,
      franchises: [...(prev.franchises || []), franchise]
    }));
    toast({
      title: "Franchise Created",
      description: `"${franchise.title}" franchise has been established`,
    });
  };

  const handleUpdateFranchise = (franchiseId: string, updates: any) => {
    setGameState(prev => ({
      ...prev,
      franchises: (prev.franchises || []).map(f => 
        f.id === franchiseId ? { ...f, ...updates } : f
      )
    }));
  };

  // Handle award show triggers
  const handleAwardShow = (ceremony: AwardShowCeremony) => {
    setCurrentAwardShow(ceremony);
    setShowAwardModal(true);
  };

  // Always run awards engine in the background (independent of UI phase)
  useAwardsEngine(gameState, handleStudioUpdate, handleTalentUpdate, handleAwardShow);

  const handleProjectUpdate = (project: Project, marketingCost?: number) => {
    setGameState(prev => {
      const normalizedProject: Project = {
        ...project,
        script: finalizeScriptForSave(project.script, prev),
      };

      const prevProject = prev.projects.find(p => p.id === normalizedProject.id);
      const nextState = {
        ...prev,
        projects: prev.projects.map(p => p.id === normalizedProject.id ? normalizedProject : p),
        studio: marketingCost ? {
          ...prev.studio,
          budget: prev.studio.budget - marketingCost
        } : prev.studio
      };

      // If casting was just confirmed, lock talent availability for the production period.
      // Use script.characters as source of truth when present, falling back to legacy cast/crew.
      if (prevProject?.castingConfirmed !== true && normalizedProject.castingConfirmed) {
        const assignments = getProjectRoleAssignments(normalizedProject);

        if (assignments.length > 0) {
          const totalProdWeeks = getPhaseWeeks('pre-production') + getPhaseWeeks('production') + getPhaseWeeks('post-production');
          const busyUntilWeek = prev.currentWeek + totalProdWeeks;

          nextState.talent = nextState.talent.map(t => {
            const isInCast = assignments.some(a => a.talentId === t.id);
            if (!isInCast) return t;
            return {
              ...t,
              contractStatus: 'contracted',
              currentContractWeeks: totalProdWeeks,
              busyUntilWeek
            };
          });
        }
      }

      return nextState;
    });

    // Keep the local selectedProject in sync so UI reflects changes immediately
    setSelectedProject(prevSel => (prevSel && prevSel.id === project.id)
      ? { ...project, script: finalizeScriptForSave(project.script, gameState) }
      : prevSel);
  };

  // CRITICAL: Manual marketing campaign creation (no auto-progression)
  const handleMarketingCampaignCreate = (project: Project, strategy: MarketingStrategy, budget: number, duration: number) => {
    if (import.meta.env.DEV) {
      console.log(`🎯 MANUAL MARKETING START: ${project.title}`);
    }
    
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
    if (import.meta.env.DEV) {
      console.log(`🎬 MANUAL RELEASE STRATEGY SET: ${project.title}`);
    }

    // Prefer exact game week/year from the modal if provided
    const selectedWeek = (strategy as any).releaseWeek as number | undefined;
    const selectedYear = (strategy as any).releaseYear as number | undefined;

    if (!selectedWeek || !selectedYear) {
      toast({
        title: "Release Date Required",
        description: "Please select a release week and year from the calendar.",
        variant: "destructive"
      });
      return;
    }

    // Ensure release is not in the past relative to game time
    const currentAbsoluteWeek = (gameState.currentYear * 52) + gameState.currentWeek;
    const releaseAbsoluteWeek = (selectedYear * 52) + selectedWeek;
    if (releaseAbsoluteWeek <= currentAbsoluteWeek) {
      toast({
        title: "Invalid Release Date",
        description: "Release date must be in the future.",
        variant: "destructive"
      });
      return;
    }

    const updatedProject = {
      ...project,
      releaseStrategy: strategy,
      releaseWeek: selectedWeek,
      releaseYear: selectedYear,
      // mirror for any components reading scheduled fields
      scheduledReleaseWeek: selectedWeek,
      scheduledReleaseYear: selectedYear,
      currentPhase: 'release' as const,
      status: 'scheduled-for-release' as any,
      readyForRelease: false,
      phaseDuration: -1, // prevent auto-advancement until release week
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
      description: `${project.title} will be released in Y${selectedYear}W${selectedWeek}.`,
    });
  };

  const processWeeklyProjectEffects = (projects: Project[], timeState: TimeState): Project[] => {
    if (import.meta.env.DEV) {
      console.log(`=== WEEKLY PROJECT PROCESSING START ===`);
    }
    
    const results = projects.map((project, index) => {
      if (import.meta.env.DEV) {
        console.log(`[${index}] Processing: ${project.title} (${project.currentPhase})`);
        console.log(`    📊 BEFORE: boxOfficeTotal = ${project.metrics?.boxOfficeTotal || 0}`);
      }
      
      let updatedProject = { ...project };

      // Process development phase
      if (project.currentPhase === 'development') {
        updatedProject = processDevelopmentProgress(project, timeState.currentWeek);
      }
      
      // Handle scheduled releases when their date arrives
      let justReleased = false;
      if (project.status === 'scheduled-for-release') {
        const scheduledWeek = project.scheduledReleaseWeek ?? project.releaseWeek;
        const scheduledYear = project.scheduledReleaseYear ?? project.releaseYear;

        if (scheduledWeek && scheduledYear) {
          const currentAbsoluteWeek = (timeState.currentYear * 52) + timeState.currentWeek;
          const releaseAbsoluteWeek = (scheduledYear * 52) + scheduledWeek;

          if (currentAbsoluteWeek === releaseAbsoluteWeek) {
            if (import.meta.env.DEV) {
              console.log(`🎬 RELEASE DATE ARRIVED: ${project.title}`);
              console.log(`    📊 PRE-RELEASE: boxOfficeTotal = ${project.metrics?.boxOfficeTotal || 0}`);
            }
            if (project.type === 'series' || project.type === 'limited-series') {
              updatedProject = TVRatingsSystem.initializeAiring(updatedProject, scheduledWeek, scheduledYear);
            } else {
              updatedProject = BoxOfficeSystem.initializeRelease(updatedProject, scheduledWeek, scheduledYear);
            }
            if (import.meta.env.DEV) {
              console.log(`    📊 POST-RELEASE: boxOfficeTotal = ${updatedProject.metrics?.boxOfficeTotal || 0}`);
            }
            justReleased = true; // Flag to skip processing on release week

            // Update filmography; show box office modal only for films
            if (!(project.type === 'series' || project.type === 'limited-series')) {
              setGameState(prevState => {
                const newState = TalentFilmographyManager.updateFilmographyOnRelease(prevState, updatedProject);
                // Show first week box office modal
                setFirstWeekModalProject(updatedProject);
                setShowFirstWeekModal(true);
                return newState;
              });
            } else {
              setGameState(prevState => {
                return TalentFilmographyManager.updateFilmographyOnRelease(prevState, updatedProject);
              });
            }
          }
        }
      }
      
      // Process box office for released films (but skip on the week they just released)
       if (project.status === 'released' && !justReleased) {
         if (project.type === 'series' || project.type === 'limited-series') {
           if (import.meta.env.DEV) {
             console.log(`    📺 PROCESSING TV RATINGS: ${project.title}`);
           }
           updatedProject = TVRatingsSystem.processWeeklyRatings(
             updatedProject,
             timeState.currentWeek,
             timeState.currentYear
           );
         } else {
           if (import.meta.env.DEV) {
             console.log(`    💰 PROCESSING BOX OFFICE: ${project.title}`);
             console.log(`    📊 PRE-REVENUE: boxOfficeTotal = ${updatedProject.metrics?.boxOfficeTotal || 0}`);
           }
           
           const previousTotal = updatedProject.metrics?.boxOfficeTotal || 0;
           
           updatedProject = BoxOfficeSystem.processWeeklyRevenue(
             updatedProject, 
             timeState.currentWeek, 
             timeState.currentYear
           );
           
           const newTotal = updatedProject.metrics?.boxOfficeTotal || 0;
           const weeklyBoxOfficeRevenue = newTotal - previousTotal;
           
           if (import.meta.env.DEV) {
             console.log(`    📊 POST-REVENUE: boxOfficeTotal = ${newTotal}`);
             console.log(`    💰 WEEKLY BOX OFFICE EARNED: ${weeklyBoxOfficeRevenue.toLocaleString()}`);
           }
           
           // Add box office revenue to studio budget (studio keeps percentage after exhibitor cut)
           if (weeklyBoxOfficeRevenue > 0) {
             const studioShare = weeklyBoxOfficeRevenue * 0.55; // Studios typically get 55% of domestic box office
             if (import.meta.env.DEV) {
               console.log(`    💰 STUDIO SHARE (55%): ${studioShare.toLocaleString()}`);
             }
             
             setGameState(prevState => ({
               ...prevState,
               studio: {
                 ...prevState.studio,
                 budget: prevState.studio.budget + studioShare
               }
             }));
           }
         }
       }

  // Process marketing campaigns and advance to release phase when complete
  if (updatedProject.marketingCampaign && updatedProject.marketingCampaign.weeksRemaining > 0) {
    const updatedActivities = updatedProject.marketingCampaign.activities.map(activity => ({
      ...activity,
      weeksRemaining: Math.max(0, activity.weeksRemaining - 1),
      status: activity.weeksRemaining <= 1 ? 'completed' as const : activity.status
    }));

    const newWeeksRemaining = Math.max(0, updatedProject.marketingCampaign.weeksRemaining - 1);

    updatedProject = {
      ...updatedProject,
      marketingCampaign: {
        ...updatedProject.marketingCampaign,
        activities: updatedActivities,
        weeksRemaining: newWeeksRemaining
      }
    };

    // When marketing is complete, move to release phase
    if (newWeeksRemaining === 0) {
      if (import.meta.env.DEV) {
        console.log(`🎬 MARKETING COMPLETE: ${project.title} - Moving to release phase`);
      }

      const isAlreadyScheduled = updatedProject.status === 'scheduled-for-release';

      updatedProject = {
        ...updatedProject,
        currentPhase: 'release',
        phaseDuration: isAlreadyScheduled ? -1 : 0,
        status: isAlreadyScheduled ? updatedProject.status : 'ready-for-release',
        readyForRelease: isAlreadyScheduled ? false : true
      };
    }
  }

      // Process post-theatrical releases revenue
      if (updatedProject.postTheatricalReleases && updatedProject.postTheatricalReleases.length > 0) {
        if (import.meta.env.DEV) {
          console.log(`    💰 PROCESSING POST-THEATRICAL: ${updatedProject.title}`);
        }
        
        const updatedReleases = updatedProject.postTheatricalReleases.map(release => {
          if (release.status === 'planned') {
            // Start the release
            if (import.meta.env.DEV) {
              console.log(`      🚀 STARTING: ${release.platform} release`);
            }
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
            
            if (import.meta.env.DEV) {
              console.log(`      💰 ${release.platform}: Week ${newWeeksActive}, +${release.weeklyRevenue.toLocaleString()}, Total: ${newRevenue.toLocaleString()}`);
            }
            
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
          if (import.meta.env.DEV) {
            console.log(`      💰 TOTAL WEEKLY POST-THEATRICAL: +${weeklyPostTheatricalRevenue.toLocaleString()}`);
          }
          
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
        
        if (import.meta.env.DEV) {
          console.log(`⏱️ Phase timer for ${updatedProject.title}: ${updatedProject.phaseDuration} -> ${newPhaseDuration} (${updatedProject.currentPhase})`);
        }
        
        if (newPhaseDuration === 0) {
          const nextPhase = getNextPhase(updatedProject.currentPhase);
          
          // STOP auto-progression at post-production - stay in post-production until manual marketing
          if (updatedProject.currentPhase === 'post-production') {
            if (import.meta.env.DEV) {
              console.log(`  → POST-PRODUCTION COMPLETE: ${updatedProject.title} ready for marketing`);
            }
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
            if (import.meta.env.DEV) {
              console.log(`  → MARKETING COMPLETE: ${updatedProject.title} ready for release`);
            }
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
          // Normal progression with gating for early phases
          else if (['development', 'pre-production', 'production'].includes(updatedProject.currentPhase)) {
            // Gate: ensure roles imported before leaving development
            if (updatedProject.currentPhase === 'development' && nextPhase === 'pre-production') {
              const existingRoles = updatedProject.script?.characters || [];
              const hasActiveExisting = existingRoles.some(c => !c.excluded);
              const roles = hasActiveExisting
                ? existingRoles
                : importRolesForScript(updatedProject.script!, gameState);

              const hasAnyActiveRole = (roles || []).some(c => !c.excluded);
              if (!roles || roles.length === 0 || !hasAnyActiveRole) {
                console.warn(`⛔ Cannot advance ${updatedProject.title}: no active roles available`);
                updatedProject = { ...updatedProject, phaseDuration: 2 };
                toast({ title: 'Roles Required', description: `${updatedProject.title} needs at least one active (non-excluded) role before pre-production`, variant: 'destructive' });
              } else {
                const normalizedScript = finalizeScriptForSave(
                  { ...updatedProject.script!, characters: roles },
                  gameState
                );

                updatedProject = {
                  ...updatedProject,
                  script: normalizedScript,
                  currentPhase: nextPhase,
                  phaseDuration: getPhaseWeeks(nextPhase),
                  status: nextPhase as any
                };
                toast({ title: 'Phase Complete!', description: `${updatedProject.title} advanced to ${nextPhase.replace('-', ' ')}` });
              }
            }
            // Gate: require Director + Lead actor before entering production
            else if (updatedProject.currentPhase === 'pre-production' && nextPhase === 'production') {
              const chars = updatedProject.script?.characters || [];
              const { hasDirector, hasLead } = getMandatoryCastingStatus(chars);
              if (!hasDirector || !hasLead) {
                console.warn(`⛔ Cannot advance ${updatedProject.title}: missing mandatory cast (director=${hasDirector}, lead=${hasLead})`);
                updatedProject = { ...updatedProject, phaseDuration: 2 };
                toast({ title: 'Cast Required', description: 'Attach a Director and Lead before production', variant: 'destructive' });
              } else {
                updatedProject = {
                  ...updatedProject,
                  currentPhase: nextPhase,
                  phaseDuration: getPhaseWeeks(nextPhase),
                  status: nextPhase as any
                };
                toast({ title: 'Phase Complete!', description: `${updatedProject.title} advanced to ${nextPhase.replace('-', ' ')}` });
              }
            }
            // Other early phases progress normally
            else {
              const nextDuration = getPhaseWeeks(nextPhase);
              updatedProject = {
                ...updatedProject,
                currentPhase: nextPhase,
                phaseDuration: nextDuration,
                status: nextPhase as any
              };
              toast({ title: 'Phase Complete!', description: `${updatedProject.title} advanced to ${nextPhase.replace('-', ' ')}` });
            }
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
    
    if (import.meta.env.DEV) {
      console.log(`=== WEEKLY PROJECT PROCESSING END ===`);
    }
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

    const casting = getProjectCastingSummary(project);
    const hasAnyAttachedTalent = casting.assignedCount > 0;

    let weeklyIncrease = 5;

    if (hasAnyAttachedTalent) weeklyIncrease += 3;
    if (casting.hasDirector) weeklyIncrease += 5;

    const newProgress = {
      ...progress,
      scriptCompletion: Math.min(100, progress.scriptCompletion + weeklyIncrease),
      budgetApproval: hasAnyAttachedTalent
        ? Math.min(100, progress.budgetApproval + weeklyIncrease)
        : progress.budgetApproval,
      talentAttached: hasAnyAttachedTalent
        ? Math.min(100, progress.talentAttached + 10)
        : progress.talentAttached,
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
    
    if (import.meta.env.DEV) {
      console.log(`💰 WEEKLY COSTS: Base ${baseOperationalCost.toLocaleString()} + Projects ${(projectCount * 10000).toLocaleString()}`);
    }
    
    // Calculate production phase costs (spread over full phase duration)
    let productionCosts = 0;
    projects.forEach(project => {
      if (project.currentPhase === 'production') {
        const weeklyProductionCost = project.budget.total * 0.7 / getPhaseWeeks('production'); // 70% of budget over production weeks
        productionCosts += weeklyProductionCost;
        if (import.meta.env.DEV) {
          console.log(`🎬 Production cost for ${project.title}: ${weeklyProductionCost.toLocaleString()}`);
        }
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
      
      if (loanAmount > 0 && import.meta.env.DEV) {
        console.log(`💳 Auto-loan: ${loanAmount.toLocaleString()}`);
      }
    }
    
    // Pay down debt automatically if budget is positive (5% of surplus goes to debt)
    if (studio.budget > 1000000 && studio.debt && studio.debt > 0) { // Only pay debt if budget > $1M
      const debtPayment = Math.min(studio.debt, studio.budget * 0.05);
      studio.debt -= debtPayment;
      studio.budget -= debtPayment;
      if (import.meta.env.DEV) {
        console.log(`💳 Auto debt payment: ${debtPayment.toLocaleString()}. Remaining debt: ${studio.debt.toLocaleString()}`);
      }
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
      if (reputationLoss > 0 && import.meta.env.DEV) {
        console.log(`📉 Reputation declined by ${reputationLoss.toFixed(1)} (${studio.weeksSinceLastProject} weeks since last project)`);
      }
    }
    
    // Reputation changes from box office performance (check completed theatrical runs)
    projects.forEach(project => {
      if (project.status === 'released' && project.metrics?.boxOfficeTotal && project.metrics?.inTheaters === false) {
        const totalRevenue = project.metrics.boxOfficeTotal;
        const budget = project.budget.total;
        const profitMargin = (totalRevenue * 0.55) / budget; // Studio share vs budget
        
        if (import.meta.env.DEV) {
          console.log(`📊 Checking reputation for ${project.title}: Profit margin ${(profitMargin * 100).toFixed(0)}%`);
        }
        
        if (profitMargin > 2.0) { // 200% return - huge success
          studio.reputation = Math.min(100, studio.reputation + 3);
          if (import.meta.env.DEV) {
            console.log(`📈 Big reputation boost from blockbuster ${project.title} (${(profitMargin * 100).toFixed(0)}% return): ${studio.reputation}`);
          }
        } else if (profitMargin > 1.2) { // 120% return - solid hit
          studio.reputation = Math.min(100, studio.reputation + 1);
          if (import.meta.env.DEV) {
            console.log(`📈 Reputation boost from successful ${project.title}: ${studio.reputation}`);
          }
        } else if (profitMargin < 0.3) { // Less than 30% return - bomb
          studio.reputation = Math.max(0, studio.reputation - 2);
          if (import.meta.env.DEV) {
            console.log(`📉 Reputation hit from bomb ${project.title}: ${studio.reputation}`);
          }
        }
      }
    });
    
    if (import.meta.env.DEV) {
      console.log(`💰 STUDIO STATUS: Budget: ${studio.budget.toLocaleString()}, Debt: ${(studio.debt || 0).toLocaleString()}, Reputation: ${studio.reputation.toFixed(1)}`);
    }
    
    return { studio };
  };

  const handleAdvanceWeek = () => {
    if (import.meta.env.DEV) {
      console.log(`🕐 ADVANCING WEEK: Current Y${gameState.currentYear}W${gameState.currentWeek}`);
      console.log(`🕐 Projects count: ${gameState.projects.length}`);
      gameState.projects.forEach((p, i) => {
        console.log(`   [${i}] ${p.title}: Phase=${p.currentPhase}, Status=${p.status}, PhaseDuration=${p.phaseDuration || 0}`);
      });
    }
    
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
      
      if (import.meta.env.DEV) {
        console.log(`🕐 NEW TIME STATE: Y${newTimeState.currentYear}W${newTimeState.currentWeek}`);
      }
      
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
      
      let updatedProjects = prev.projects;
      
      updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 70, 'Calculating finances...');
      
      updatedProjects = processWeeklyProjectEffects(updatedProjects, newTimeState);

      // Simulate box office and ledger entries for released films (player + AI)
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
              let aiRelease = studioGenerator.generateStudioRelease(studioProfile, newTimeState.currentWeek, newTimeState.currentYear);
              if (aiRelease) {
                // Set proper release timing for AI films
                aiRelease.releaseWeek = newTimeState.currentWeek;
                aiRelease.releaseYear = newTimeState.currentYear;
                aiRelease.studioName = studioProfile.name; // Track which AI studio made this
                aiRelease = attachBasicCastForAI(aiRelease, prev.talent);
                newAIReleases.push(aiRelease);
                if (import.meta.env.DEV) {
                  console.log(`🤖 AI STUDIO: ${studioProfile.name} released \"${aiRelease.title}\" (${aiRelease.script.genre})`);
                }
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
      
      if (import.meta.env.DEV) {
        console.log(`📊 Weekly reputation update: ${prev.studio.reputation} -> ${weeklyResults.studio.reputation}`);
        console.log(`🏆 Deep reputation: Overall ${deepRepResult.reputation.toFixed(1)}`);
      }
      
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
      // Mark cast as busy for projects in production (script.characters is the source of truth when present)
      updatedProjects.forEach(p => {
        if (p.currentPhase === 'production' || p.status === 'filming') {
          const assignments = getProjectRoleAssignments(p);

          assignments.forEach(a => {
            const idx = updatedTalent.findIndex(t => t.id === a.talentId);
            if (idx < 0) return;

            const roleLabel = (a.role || '').toLowerCase();
            const isCameo = a.importance === 'minor' || roleLabel.includes('cameo') || roleLabel.includes('minor');
            const durationWeeks = isCameo ? 2 : 8;

            updatedTalent[idx] = {
              ...updatedTalent[idx],
              contractStatus: 'busy',
              busyUntilWeek: currentAbsWeek + durationWeeks
            };
          });
        }
      });

      // Memory management: prune old releases to prevent unbounded growth
      // Keep only releases from the last 3 in-game years (156 weeks) 
      const MAX_RELEASE_AGE_WEEKS = 156; // ~3 years
      const currentAbsoluteWeek = (newTimeState.currentYear * 52) + newTimeState.currentWeek;
      
      const prunedReleases = [...prev.allReleases, ...newAIReleases].filter((release) => {
        if (!('releaseWeek' in release) || !('releaseYear' in release)) return true;
        const releaseAbsWeek = ((release as Project).releaseYear! * 52) + (release as Project).releaseWeek!;
        return (currentAbsoluteWeek - releaseAbsWeek) <= MAX_RELEASE_AGE_WEEKS;
      });

      // Also prune old box office history if it exists
      const prunedBoxOfficeHistory = (prev.boxOfficeHistory || []).filter((entry: any) => {
        if (!entry.week || !entry.year) return true;
        const entryAbsWeek = (entry.year * 52) + entry.week;
        return (currentAbsoluteWeek - entryAbsWeek) <= MAX_RELEASE_AGE_WEEKS;
      });

      // Prune old top films history
      const prunedTopFilmsHistory = (prev.topFilmsHistory || []).slice(-52); // Keep last 52 entries max

      const newState = {
        ...prev,
        currentWeek: newTimeState.currentWeek,
        currentYear: newTimeState.currentYear,
        currentQuarter: newTimeState.currentQuarter,
        projects: updatedProjects,
        studio: enhancedStudio,
        allReleases: prunedReleases,
        aiStudioProjects: prunedReleases.filter((r): r is Project => 'script' in r),
        talent: updatedTalent,
        boxOfficeHistory: prunedBoxOfficeHistory,
        topFilmsHistory: prunedTopFilmsHistory,
      };

      // Advance ongoing PR campaigns (Response Center) each week so timers and effects progress
      try {
        MediaResponseSystem.processWeeklyCampaigns(newState);
      } catch (e) {
        console.warn('Media response campaign processing error', e);
      }

      setTimeout(() => {
        // Process media events and run system integration checks
        import('./MediaEngine').then(({ MediaEngine }) => {
          const newMediaItems = MediaEngine.processMediaEvents(newState);
          const triggeredEvents = MediaEngine.triggerAutomaticEvents(newState, gameState);
          if ((newMediaItems.length > 0 || triggeredEvents.length > 0) && import.meta.env.DEV) {
            console.log(`📰 MEDIA: Generated ${newMediaItems.length} articles, triggered ${triggeredEvents.length} events`);
          }

          // Apply financial side-effects from media coverage (lightweight integration)
          try {
            MediaFinancialIntegration.applyFinancialEffects(newState);
          } catch (e) {
            console.warn('Media financial integration error', e);
          }
        });

        // Apply media-driven reputation changes on top of deep reputation
        try {
          setGameState(current => {
            const mutated = { ...current };
            MediaReputationIntegration.processWeeklyReputationUpdates(mutated);
            return mutated;
          });
        } catch (e) {
          console.warn('Media reputation integration error', e);
        }

        // Perform memory cleanup for static classes every 10 weeks
        if (newTimeState.currentWeek % 10 === 0) {
          import('./CrisisManagement').then(({ CrisisManagement }) => {
            CrisisManagement.performMaintenanceCleanup(newTimeState.currentWeek, newTimeState.currentYear);
          });
          import('./MediaRelationships').then(({ MediaRelationships }) => {
            MediaRelationships.performMaintenanceCleanup(newTimeState.currentWeek, newTimeState.currentYear);
          });
          import('./FinancialEngine').then(({ FinancialEngine }) => {
            FinancialEngine.performMemoryCleanup(newTimeState.currentWeek, newTimeState.currentYear);
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

  const handleAdvanceWeeks = (weeks: number) => {
    const totalWeeks = Math.floor(weeks);
    if (!Number.isFinite(totalWeeks) || totalWeeks <= 0) return;

    // Use requestAnimationFrame for smoother batch processing
    // and prevent setTimeout stacking that can overwhelm the browser
    let remaining = totalWeeks;
    let isProcessing = false;

    const step = () => {
      if (remaining <= 0 || isProcessing) return;
      
      isProcessing = true;
      handleAdvanceWeek();
      remaining -= 1;
      
      // Use requestAnimationFrame to yield to the browser between weeks
      // This prevents UI freezing and allows garbage collection
      if (remaining > 0) {
        requestAnimationFrame(() => {
          isProcessing = false;
          // Add small delay to let React state settle
          setTimeout(step, 50);
        });
      } else {
        isProcessing = false;
      }
    };

    step();
  };

  const handleAdvanceToDate = (targetWeek: number, targetYear: number) => {
    const clampedWeek = TimeSystem.getWeekOfYear(targetWeek || 1);
    const year = targetYear || gameState.currentYear;

    const currentAbsolute = (gameState.currentYear * 52) + gameState.currentWeek;
    const targetAbsolute = (year * 52) + clampedWeek;
    const diff = targetAbsolute - currentAbsolute;

    if (diff <= 0) {
      toast({
        title: 'Invalid target date',
        description: 'Target week must be in the future relative to the current game time.',
        variant: 'destructive',
      });
      return;
    }

    // Prevent excessively long debug runs
    if (diff > 260) {
      toast({
        title: 'Large time skip',
        description: 'Skipping more than 5 in-game years at once is disabled for stability.',
        variant: 'destructive',
      });
      return;
    }

    handleAdvanceWeeks(diff);
  };

  return (
    <>
      <LoadingOverlay loading={loading} />
      <div className="min-h-screen bg-background font-studio">
      {/* Achievement Notifications */}
      <AchievementNotifications
        achievements={achievements.recentUnlocks}
        onDismiss={(achievementId) => {
          const achievement = achievements.recentUnlocks.find(a => a.id === achievementId);
          if (achievement) {
            handleAchievementRewards([achievement]);
          }
          if (typeof achievements.dismissRecentUnlock === 'function') {
            achievements.dismissRecentUnlock(achievementId);
          }
        }}
      />

      {/* Background financial accuracy service */}
      <EnhancedFinancialAccuracy
        gameState={gameState}
        onProjectUpdate={(projectId, updates) => {
          setGameState(prev => ({
            ...prev,
            projects: prev.projects.map(p =>
              p.id === projectId ? { ...p, ...updates } : p
            )
          }));
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
              
              {import.meta.env.DEV && (
                <Button 
                  size="sm" 
                  onClick={skipToPostTheatrical}
                  variant="outline"
                  className="mr-2"
                >
                  🚀 Skip to Post-Theatrical Test
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="mr-2"
                onClick={handleSaveGame}
              >
                Save Game
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

      {/* Debug Tools (development only) */}
      {import.meta.env.DEV && (
        <div className="border-b border-border/30 bg-background/80">
          <div className="container mx-auto px-6 py-3">
            <DebugControlPanel
                time={{
                  currentWeek: gameState.currentWeek,
                  currentYear: gameState.currentYear,
                  currentQuarter: gameState.currentQuarter,
                }}
                studioBudget={gameState.studio.budget}
                studioDebt={gameState.studio.debt || 0}
                studioReputation={gameState.studio.reputation}
                projects={gameState.projects}
                onAdvanceWeeks={handleAdvanceWeeks}
                onAdvanceToDate={handleAdvanceToDate}
                onSetBudget={(budget) =>
                  setGameState((prev) => ({
                    ...prev,
                    studio: { ...prev.studio, budget },
                  }))
                }
                onSetDebt={(debt) =>
                  setGameState((prev) => ({
                    ...prev,
                    studio: { ...prev.studio, debt },
                  }))
                }
                onSetReputation={(reputation) =>
                  setGameState((prev) => ({
                    ...prev,
                    studio: { ...prev.studio, reputation },
                  }))
                }
                onProjectUpdate={(project) => handleProjectUpdate(project)}
                onStreamingContractDebug={(projectId, contract) => {
                  const project = gameState.projects.find(p => p.id === projectId);
                  if (project) {
                    handleProjectUpdate({ ...project, streamingContract: contract });
                  }
                }}
              />
          </div>
        </div>
      )}

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
              { id: 'finance', label: 'Finance', IconComponent: BudgetIcon },
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
                    ['finance', 'competition', 'market', 'topfilms', 'stats'].includes(currentPhase)
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
                <DropdownMenuItem onClick={() => handlePhaseChange('finance')}>
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
                 <DropdownMenuItem onClick={() => handlePhaseChange('television')}>
                   <BarChartIcon className="mr-2" size={16} />
                   Television & Streaming
                 </DropdownMenuItem>
                 {import.meta.env.DEV && (
                   <DropdownMenuItem onClick={() => handlePhaseChange('tv-tests')}>
                     <BarChartIcon className="mr-2" size={16} />
                     🧪 TV System Tests
                   </DropdownMenuItem>
                 )}
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
          <div className="space-y-6">
            <OwnedFranchiseManager
              gameState={gameState}
              onUpdateFranchise={handleUpdateFranchise}
              onCreateProject={(franchiseId) => {
                // Create a basic script for a franchise film project and send it to Script Development
                const franchise = gameState.franchises.find(f => f.id === franchiseId);
                const script: Script = {
                  id: `script-${Date.now()}`,
                  title: franchise ? `${franchise.title} Entry` : 'New Franchise Film',
                  logline: '',
                  writer: 'Studio Writer',
                  pages: 100,
                  quality: 50,
                  developmentStage: 'concept',
                  genre: 'drama',
                  targetAudience: 'general',
                  estimatedRuntime: 120,
                  franchiseId,
                  characteristics: {
                    tone: 'light',
                    pacing: 'steady',
                    dialogue: 'naturalistic',
                    visualStyle: 'realistic',
                    commercialAppeal: 6,
                    criticalPotential: 5,
                    cgiIntensity: 'minimal'
                  },
                  themes: [],
                  sourceType: 'franchise',
                  budget: 15000000,
                  characters: [],
                };

                const finalized = finalizeScriptForSave(script, gameState);

                // Route to Script Development instead of immediately greenlighting a project
                setSelectedFranchise(franchiseId || null);
                setSelectedPublicDomain(null);
                handlePhaseChange('scripts');

                setGameState(prev => ({
                  ...prev,
                  scripts: [...prev.scripts, finalized]
                }));

                toast({
                  title: 'Script Draft Created',
                  description: `"${finalized.title}" has been created from the franchise and is ready for development.`,
                });
              }}
              onCreateTVProject={(franchiseId) => {
                // Route to Television & Streaming with this franchise pre-selected
                setSelectedFranchise(franchiseId);
                setSelectedPublicDomain(null);
                handlePhaseChange('television');
              }}
            />
            <EnhancedFranchiseSystem
              gameState={gameState}
              onCreateFranchise={handleCreateFranchise}
              onUpdateFranchise={handleUpdateFranchise}
              onProjectUpdate={(projectId, updates) => {
                const project = gameState.projects.find(p => p.id === projectId);
                if (project) {
                  handleProjectUpdate({ ...project, ...updates });
                }
              }}
            />
            <FranchiseProjectCreator
              gameState={gameState}
              onProjectCreate={(script) => {
                const finalized = finalizeScriptForSave(script, gameState);

                setSelectedFranchise(finalized.franchiseId || null);
                setSelectedPublicDomain(finalized.publicDomainId || null);

                const isTVScript =
                  finalized.characteristics?.pacing === 'episodic' ||
                  (finalized.estimatedRuntime && finalized.estimatedRuntime <= 60);

                // Route to the appropriate development workspace
                handlePhaseChange(isTVScript ? 'television' : 'scripts');

                setGameState(prev => ({
                  ...prev,
                  scripts: prev.scripts.some(s => s.id === finalized.id)
                    ? prev.scripts.map(s => (s.id === finalized.id ? finalized : s))
                    : [...prev.scripts, finalized]
                }));
                toast({
                  title: 'Script Draft Created',
                  description: isTVScript
                    ? `\"${finalized.title}\" is ready in TV Show Development to customize roles before greenlighting.`
                    : `\"${finalized.title}\" is ready in Script Development to customize roles before greenlighting.`,
                });
              }}
            />
            <FranchiseManager
              gameState={gameState}
              onCreateProject={(franchiseId, publicDomainId, cost) => {
                // Use existing handleCreateProject logic but adapted for the new interface
                if (cost && cost > gameState.studio.budget) {
                  toast({
                    title: "Insufficient Budget",
                    description: `Cannot afford this franchise - need $${(cost / 1000000).toFixed(1)}M`,
                    variant: "destructive"
                  });
                  return;
                }

                const franchise = franchiseId ? gameState.franchises.find(f => f.id === franchiseId) : null;
                const publicDomain = publicDomainId ? gameState.publicDomainIPs.find(ip => ip.id === publicDomainId) : null;
                
                const script: Script = {
                  id: `script-${Date.now()}`,
                  title: franchise ? `${franchise.title} Entry` : 
                         publicDomain ? `${publicDomain.name} Adaptation` : 
                         'New Project',
                  logline: '',
                  writer: 'Studio Writer',
                  pages: 100,
                  quality: 50,
                  developmentStage: 'concept',
                  genre: 'drama',
                  targetAudience: 'general',
                  estimatedRuntime: 120,
                  franchiseId,
                  publicDomainId,
                  characteristics: {
                    tone: 'light',
                    pacing: 'steady',
                    dialogue: 'naturalistic',
                    visualStyle: 'realistic',
                    commercialAppeal: 6,
                    criticalPotential: 5,
                    cgiIntensity: 'minimal'
                  },
                  themes: [],
                  sourceType: franchiseId ? 'franchise' : publicDomainId ? 'public-domain' : 'original',
                  budget: cost ? 25000000 : 15000000, // Higher budget for licensed franchises
                  characters: [],
                };

                const finalized = finalizeScriptForSave(script, gameState);

                // Deduct franchise cost if applicable
                if (cost) {
                  setGameState(prev => ({
                    ...prev,
                    studio: {
                      ...prev.studio,
                      budget: prev.studio.budget - cost
                    }
                  }));
                  
                  toast({
                    title: "Franchise Acquired!",
                    description: `Spent $${(cost / 1000000).toFixed(1)}M to license franchise`,
                  });
                }

                // Route to Script Development instead of directly greenlighting
                setSelectedFranchise(franchiseId || null);
                setSelectedPublicDomain(publicDomainId || null);
                handlePhaseChange('scripts');
                setGameState(prev => ({
                  ...prev,
                  scripts: prev.scripts.some(s => s.id === finalized.id)
                    ? prev.scripts.map(s => s.id === finalized.id ? finalized : s)
                    : [...prev.scripts, finalized]
                }));

                toast({
                  title: "Script Draft Created",
                  description: `"${finalized.title}" is ready in Script Development to customize roles before greenlighting.`,
                });
              }}
            />
            <SequelManagementComponent
              gameState={gameState}
              onProjectCreate={(script) => {
                // Route sequel scripts to Script Development for refinement instead of instant project creation
                setSelectedFranchise(script.franchiseId || null);
                setSelectedPublicDomain(null);
                handlePhaseChange('scripts');

                setGameState(prev => {
                  const finalized = finalizeScriptForSave(script, prev);
                  return {
                    ...prev,
                    scripts: prev.scripts.some(s => s.id === finalized.id)
                      ? prev.scripts.map(s => s.id === finalized.id ? finalized : s)
                      : [...prev.scripts, finalized]
                  };
                });

                toast({
                  title: 'Sequel Script Created',
                  description: `"${script.title}" has been added to Script Development. Refine it to "final" stage before greenlighting.`,
                });
              }}
              onProjectUpdate={handleProjectUpdate}
              onCreateFranchise={handleCreateFranchise}
            />
          </div>
        )}
        
        {currentPhase === 'scripts' && (
          <ScriptDevelopment 
            gameState={gameState}
            selectedFranchise={selectedFranchise}
            selectedPublicDomain={selectedPublicDomain}
            onProjectCreate={handleProjectCreate}
            onScriptUpdate={(script) => {
              // Persist selections so multiple scripts can be created within the same franchise/IP
              setGameState(prev => {
                const finalized = finalizeScriptForSave(script, prev);
                return {
                  ...prev,
                  scripts: prev.scripts.some(s => s.id === finalized.id)
                    ? prev.scripts.map(s => s.id === finalized.id ? finalized : s)
                    : [...prev.scripts, finalized]
                };
              });
            }}
          />
        )}
        
        {currentPhase === 'casting' && (
          <div className="space-y-6">
            <Tabs
              defaultValue={selectedProject ? "character-casting" : "casting-board"}
              className="space-y-4"
            >
              <TabsList>
                <TabsTrigger value="character-casting">Character Casting</TabsTrigger>
                <TabsTrigger value="role-based">Role-Based System</TabsTrigger>
                <TabsTrigger value="casting-board">Talent Marketplace</TabsTrigger>
              </TabsList>
              
              <TabsContent value="character-casting">
                {selectedProject ? (
                  <CharacterCastingSystem
                    project={selectedProject}
                    gameState={gameState}
                    onProjectUpdate={handleProjectUpdate}
                  />
                ) : (
                  <div className="p-6 border rounded-lg bg-card text-sm text-muted-foreground">
                    <p className="font-medium mb-1">No project selected for casting</p>
                    <p>
                      Select an active project from the Dashboard, then return here to manage character casting.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="role-based">
                {selectedProject ? (
                  <RoleBasedCasting
                    project={selectedProject}
                    gameState={gameState}
                    onCastRole={(characterId: string, talentId: string) => {
                      if (!selectedProject) return;
                      const updatedCharacters = (selectedProject.script?.characters || []).map(c =>
                        c.id === characterId ? { ...c, assignedTalentId: talentId } : c
                      );
                      const updatedProject = {
                        ...selectedProject,
                        script: { ...selectedProject.script!, characters: updatedCharacters }
                      };
                      handleProjectUpdate(updatedProject);
                    }}
                    onCreateRole={(role) => {
                      if (!selectedProject) return;
                      const updatedProject = {
                        ...selectedProject,
                        script: {
                          ...selectedProject.script!,
                          characters: [...(selectedProject.script?.characters || []), role]
                        }
                      };
                      handleProjectUpdate(updatedProject);
                    }}
                  />
                ) : (
                  <div className="p-6 border rounded-lg bg-card text-sm text-muted-foreground">
                    <p className="font-medium mb-1">No project selected for role-based casting</p>
                    <p>
                      Select an active project from the Dashboard to define roles and attach talent.
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="casting-board">
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
              </TabsContent>
            </Tabs>
          </div>
        )}

        {currentPhase === 'television' && (
          <ComprehensiveTelevisionSystem 
            gameState={gameState}
            selectedFranchise={selectedFranchise}
            selectedPublicDomain={selectedPublicDomain}
            onUpdateBudget={(amount) => {
              setGameState(prev => ({
                ...prev,
                studio: { ...prev.studio, budget: prev.studio.budget + amount }
              }));
            }}
            onGameStateUpdate={(updates) =>
              setGameState(prev => {
                const merged = { ...prev, ...updates } as GameState;
                if ('scripts' in updates || 'projects' in updates || 'allReleases' in updates || 'aiStudioProjects' in updates) {
                  return normalizeGameStateForLoad(merged);
                }
                return merged;
              })
            }
            onCreateTVProject={(script) => {
              // For now, assume a 13-episode season budget for TV series
              const episodes = 13;
              const seasonTotalBudget = script.budget * episodes;

              handleProjectCreate(script, {
                type: 'series',
                budget: {
                  total: seasonTotalBudget,
                  allocated: {
                    aboveTheLine: seasonTotalBudget * 0.3,
                    belowTheLine: seasonTotalBudget * 0.4,
                    postProduction: seasonTotalBudget * 0.15,
                    marketing: seasonTotalBudget * 0.1,
                    distribution: seasonTotalBudget * 0.03,
                    contingency: seasonTotalBudget * 0.02
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
                distributionStrategy: {
                  primary: {
                    platform: 'streaming',
                    type: 'streaming',
                    revenue: {
                      type: 'subscription-share',
                      studioShare: 60
                    }
                  },
                  international: [],
                  windows: [],
                  marketingBudget: seasonTotalBudget * 0.1
                }
              });
            }}
          />
        )}

        {import.meta.env.DEV && currentPhase === 'tv-tests' && (
          <TelevisionSystemTests 
            gameState={gameState} 
            onUpdateBudget={(amount) => {
              setGameState(prev => ({
                ...prev,
                studio: { ...prev.studio, budget: prev.studio.budget + amount }
              }));
            }}
            onGameStateUpdate={(updates) => {
              setGameState(prev => ({ ...prev, ...updates }));
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
                <TabsTrigger value="top-actors">Top Actors</TabsTrigger>
                {import.meta.env.DEV && (
                  <TabsTrigger value="test">🧪 Integration Test</TabsTrigger>
                )}
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

              <TabsContent value="top-actors">
                <Suspense fallback={<div>Loading top actors...</div>}>
                  {React.createElement(React.lazy(() => import('./TopActorsPanel').then(m => ({ default: m.TopActorsPanel }))), {
                    gameState
                  })}
                </Suspense>
              </TabsContent>
              
              {import.meta.env.DEV && (
                <TabsContent value="test">
                  <Suspense fallback={<div>Loading test suite...</div>}>
                    {React.createElement(
                      React.lazy(() => import('./AdvancedTalentTestSuite').then(m => ({ default: m.AdvancedTalentTestSuite }))),
                      {}
                    )}
                  </Suspense>
                </TabsContent>
              )}
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
          selectedProject ? (
            <div className="space-y-6">
              <EnhancedMarketingSystem
                project={selectedProject}
                gameState={gameState}
                onUpdateProject={(projectId, updates) => {
                  const project = gameState.projects.find(p => p.id === projectId);
                  if (project) {
                    handleProjectUpdate({ ...project, ...updates });
                  }
                }}
                onUpdateBudget={(amount) => {
                  setGameState(prev => ({
                    ...prev,
                    studio: { ...prev.studio, budget: prev.studio.budget + amount }
                  }));
                }}
              />

              {/* Film release planning entry point (reuses unified ReleaseStrategyModal) */}
              {selectedProject.type !== 'series' && selectedProject.type !== 'limited-series' && (
                <Card>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Release Planning</p>
                      <p className="text-xs text-muted-foreground">
                        Once casting and marketing are in place, choose a theatrical release window.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setFilmReleaseProject(selectedProject)}
                      disabled={!canPlanSelectedFilmRelease}
                      title={releasePlanningDisabledReason}
                    >
                      Plan Release
                    </Button>
                  </CardContent>
                </Card>
              )}

              {filmReleaseProject && (
                <ReleaseStrategyModal
                  project={filmReleaseProject}
                  isOpen={!!filmReleaseProject}
                  onClose={() => setFilmReleaseProject(null)}
                  gameState={gameState}
                  onProjectUpdate={(projectId, updates) => {
                    const project = gameState.projects.find(p => p.id === projectId);
                    if (project) {
                      handleProjectUpdate({ ...project, ...updates });
                    }
                    setFilmReleaseProject(null);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="p-6 border rounded-lg bg-card text-sm text-muted-foreground">
              <p className="font-medium mb-1">No project selected for marketing</p>
              <p>
                Select an active project from the Dashboard to plan campaigns and release strategy, then return to this tab.
              </p>
            </div>
          )
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
                  gameState: gameState,
                  onNavigatePhase: (phase: 'reputation' | 'awards') => handlePhaseChange(phase as any)
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
                <MediaAnalyticsPanel
                  gameState={gameState}
                  onNavigatePhase={(phase) => handlePhaseChange(phase as any)}
                />
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
        
        {currentPhase === 'finance' && (
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
          <Tabs defaultValue="core" className="space-y-4">
            <TabsList>
              <TabsTrigger value="core">Awards Strategy</TabsTrigger>
              <TabsTrigger value="season">Awards Season Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="core">
              <AwardsSystem 
                gameState={gameState}
                onProjectUpdate={handleProjectUpdate}
                onStudioUpdate={handleStudioUpdate}
                onNavigatePhase={(phase: 'media' | 'distribution') => handlePhaseChange(phase as any)}
              />
            </TabsContent>

            <TabsContent value="season">
              <EnhancedAwardsSystem
                gameState={gameState}
                onReputationUpdate={(studioId, change) => {
                  if (studioId === gameState.studio.id) {
                    handleStudioUpdate({
                      reputation: Math.max(
                        0,
                        Math.min(100, gameState.studio.reputation + change)
                      )
                    });
                  }
                }}
                onTalentReputationUpdate={(talentId, change) => {
                  setGameState(prev => ({
                    ...prev,
                    talent: prev.talent.map(t =>
                      t.id === talentId
                        ? {
                            ...t,
                            reputation: (t.reputation || 0) + change,
                            publicImage: Math.max(
                              0,
                              Math.min(100, (t.publicImage || t.reputation || 0) + change)
                            )
                          }
                        : t
                    )
                  }));
                }}
                onNavigatePhase={(phase: 'media' | 'distribution') => handlePhaseChange(phase as any)}
              />
            </TabsContent>
          </Tabs>
        )}
        
        {currentPhase === 'market' && (
          <MarketCompetition gameState={gameState} />
        )}
        
        {currentPhase === 'topfilms' && (
          <TopFilmsChart gameState={gameState} allReleases={gameState.allReleases.filter((item): item is Project => 'script' in item)} />
        )}
        
        {currentPhase === 'stats' && (
          <div className="space-y-6">
            <PerformanceMetrics gameState={gameState} />
            <BackgroundSimulationComponent
              gameState={gameState}
              onWorldUpdate={(updates) => setGameState(prev => ({ ...prev, ...updates }))}
              onStudioUpdate={handleStudioUpdate}
            />
            {import.meta.env.DEV && (
              <IntegrationMonitor
                gameState={gameState}
              />
            )}
          </div>
        )}
        
        {currentPhase === 'reputation' && (
          <div className="space-y-6">
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
              onNavigatePhase={(phase: 'media' | 'distribution') => handlePhaseChange(phase as any)}
            />

            <AchievementsPanel
              achievements={achievements.achievements}
              unlockedCount={achievements.getUnlockedAchievements().length}
              totalCount={achievements.achievements.length}
            />
          </div>
        )}
        
{currentPhase === 'loans' && (
  <EnhancedLoanSystem
    gameState={gameState}
    onBudgetUpdate={(newBudget) => setGameState(prev => ({
      ...prev,
      studio: { ...prev.studio, budget: newBudget }
    }))}
    onReputationChange={(change) => {
      setGameState(prev => ({
        ...prev,
        studio: {
          ...prev.studio,
          reputation: Math.max(0, Math.min(100, prev.studio.reputation + change))
        }
      }));
    }}
    onLoansUpdate={(loans) => {
      setGameState(prev => ({
        ...prev,
        studio: { ...prev.studio, loans }
      }));
    }}
  />
)}
      </div>
      
      {/* First Week Box Office Modal */}
      {firstWeekModalProject && (
        <FirstWeekBoxOfficeModal
          isOpen={showFirstWeekModal}
          onClose={() => {
            setShowFirstWeekModal(false);
            setFirstWeekModalProject(null);
          }}
          project={firstWeekModalProject}
        />
      )}
      
      {/* Award Show Modal */}
      {currentAwardShow && (
        <IndividualAwardShowModal
          isOpen={showAwardModal}
          onClose={() => {
            setShowAwardModal(false);
            setCurrentAwardShow(null);
          }}
          onSkip={() => {
            setShowAwardModal(false);
            setCurrentAwardShow(null);
          }}
          ceremony={currentAwardShow}
        />
      )}
    </div>
    </>
  );
};