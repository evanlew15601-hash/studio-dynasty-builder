import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import type { GameState, Studio, Project, Script, TalentPerson, Genre, MarketingStrategy, ReleaseStrategy, ProductionPhase } from '@/types/game';
import { useLoadingActions } from '@/contexts/LoadingContext';
import { LOADING_OPERATIONS, delay } from '@/utils/loadingUtils';
import { getWorldFranchiseCatalog } from '@/data/FranchiseCatalog';
import { PublicDomainGenerator } from '@/data/PublicDomainGenerator';
import { PROVIDER_DEALS } from '@/data/ProviderDealsDatabase';
import type { PlatformMarketState } from '@/types/platformEconomy';
import { ScriptDevelopment } from './ScriptDevelopment';
import { CastingBoard } from './CastingBoard';
import { ProductionManagement } from './ProductionManagement';
import { StreamingHub } from './StreamingHub';
import { Metaboxd } from './Metaboxd';
import { OnlineLeague } from './OnlineLeague';
import { PostTheatricalSystem } from './PostTheatricalSystem';
import { StudioDashboard } from './StudioDashboard';
import { FinancialDashboard } from './FinancialDashboard';
import { IntegrationMonitor } from './IntegrationMonitor';
import { AIStudioManager } from './AIStudioManager';
import { CompetitorMonitor } from './CompetitorMonitor';
import { LeagueStandings } from './LeagueStandings';
import { TimeSystem, TimeState } from './TimeSystem';
import { BoxOfficeSystem } from './BoxOfficeSystem';
import { StreamingFilmSystem } from './StreamingFilmSystem';
import { TVRatingsSystem } from './TVRatingsSystem';
import { TVEpisodeSystem } from './TVEpisodeSystem';
import { FinancialEngine } from './FinancialEngine';
import { updateProjectFinancials } from './FinancialCalculations';
import { TalentFilmographyManager } from '@/utils/talentFilmographyManager';
import { primeCompetitorTelevision } from '@/utils/televisionPatches';
import { attachBasicCastForAI } from '@/utils/attachBasicCastForAI';
import { stableInt } from '@/utils/stableRandom';
import { createRng, generateGameSeed, seedFromString } from '@/game/core/rng';
import { advanceWeek as engineAdvanceWeek } from '@/game/core/tick';
import { useUiStore } from '@/game/uiStore';
import { AwardsSystem } from './AwardsSystem';
import { AwardsSeasonAnalyticsPanel } from './AwardsSeasonAnalyticsPanel';
import { RoleBasedCasting } from './RoleBasedCasting';
import { CharacterCastingSystem } from './CharacterCastingSystem';
import { useAwardsEngine } from '@/hooks/useAwardsEngine';
import { useOnlineLeagueTickGate } from '@/hooks/useOnlineLeagueTickGate';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import { fetchOnlineLeagueSnapshots } from '@/integrations/supabase/onlineLeagueSnapshots';
import { computeLeagueAwardsCeremony, type LeagueAwardsCeremony } from '@/utils/leagueAwards';
import { LeagueAwardsCeremonyModal } from './LeagueAwardsCeremonyModal';
import { IndividualAwardShowModal, AwardShowCeremony } from './IndividualAwardShowModal';
import { FirstWeekBoxOfficeModal } from './FirstWeekBoxOfficeModal';
import { EnhancedLoanSystem } from './EnhancedLoanSystem';
import { MarketCompetition } from './MarketCompetition';
import { TopFilmsChart } from './TopFilmsChart';
import { AchievementsPanel } from './AchievementsPanel';
import { PerformanceMetrics } from './PerformanceMetrics';
import { AchievementNotifications } from './AchievementNotifications';
import { DeepReputationPanel } from './DeepReputationPanel';
import { MediaAnalyticsPanel } from './MediaAnalyticsPanel';
import { BackgroundSimulation as BackgroundSimulationComponent } from './BackgroundSimulation';
import { SequelManagement as SequelManagementComponent } from './SequelManagement';
import { generateInitialTalentPool } from '@/data/WorldGenerator';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudioGenerator } from '../../data/StudioGenerator';

import { useGenreSaturation } from '../../hooks/useGenreSaturation';
import { useAchievements } from '../../hooks/useAchievements';
import { DeepReputationSystem } from './DeepReputationSystem';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToastAction } from '@/components/ui/toast';
import { PremiumBackground } from '@/components/ui/premium-background';
import { useToast } from '@/hooks/use-toast';
import type { TickRecapCard, TickReport, TickSystemReport } from '@/types/tickReport';
import { createTickReport } from '@/utils/tickReport';
import { WeekRecapModal } from './WeekRecapModal';
import { GameEventModal } from './GameEventModal';
import { InboxDialog } from './InboxDialog';
import { NextActionsBar } from './NextActionsBar';
import { EnhancedFinancialAccuracy, applyEnhancedFinancialAccuracy } from './EnhancedFinancialAccuracy';
import { EnhancedFranchiseSystem } from './EnhancedFranchiseSystem';
import { FranchiseManager } from './FranchiseManager';
import { OwnedFranchiseManager } from './OwnedFranchiseManager';
import { FranchiseProjectCreator } from './FranchiseProjectCreator';

import { EnhancedMarketingSystem } from './EnhancedMarketingSystem';
import { PlayerCirclePanel } from './PlayerCirclePanel';

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
import { ChevronDown, Settings2 } from 'lucide-react';
import { RoleDatabase } from '../../data/RoleDatabase';
import { importRolesForScript } from '@/utils/roleImport';
import { finalizeScriptForSave } from '@/utils/scriptFinalization';
import { MediaEngine } from './MediaEngine';
import { MediaFinancialIntegration } from './MediaFinancialIntegration';
import { MediaReputationIntegration } from './MediaReputationIntegration';
import { MediaResponseSystem } from './MediaResponseSystem';
import { CrisisManagement } from './CrisisManagement';
import { MediaRelationships } from './MediaRelationships';
import { SystemIntegration } from './SystemIntegration';
import { useGameStore } from '@/game/store';
import { getActiveSaveSlotId, saveGameAsync, setAutoLoadTarget } from '@/utils/saveLoad';
import { syncAndPersistIndustryDatabase } from '@/utils/industryDatabase';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';
import { getModBundle } from '@/utils/moddingStore';
import { fetchOnlineLeagueTurnSnapshot, upsertOnlineLeagueTurnSnapshot } from '@/integrations/supabase/onlineLeagueTurnState';
import {
  fetchOnlineLeagueMemberStudioNames,
  fetchOnlineLeagueReadyOrder,
  fetchOnlineLeagueTurnResolution,
  fetchOnlineLeagueTurnSubmissions,
  fetchUnreadOnlineLeagueMessages,
  insertOnlineLeagueMessages,
  markOnlineLeagueMessagesRead,
  upsertOnlineLeagueTurnResolution,
  upsertOnlineLeagueTurnSubmission,
} from '@/integrations/supabase/onlineLeagueTurnCompile';
import { mergeLeagueReleaseSnapshotsIntoAllReleases } from '@/utils/leagueReleases';
import { dedupeReleasePoolPreferLatest } from '@/utils/releasePool';
import type { LeagueReleasedProjectSnapshot } from '@/types/onlineLeague';
import {
  applyOnlineLeagueTalentResolution,
  buildOnlineLeagueTurnSubmission,
  createOnlineLeagueTurnBaseline,
  resolveOnlineLeagueTalentConflicts,
} from '@/utils/onlineLeagueTurnCompile';
import { DebugControlPanel } from './DebugControlPanel';
import { IndustryDatabasePanel } from './IndustryDatabasePanel';
import { LoreHub } from './LoreHub';
import { TalentProfileDialog } from './TalentProfileDialog';
import { StudioIconRenderer as StudioIconRendererLazy } from './StudioIconCustomizer';
import { SaveLoadDialog } from './SaveLoadDialog';
import { GameSettingsDialog } from './GameSettingsDialog';

// Ensure AI films have credited talent so awards/filmographies have real people to reference



function createInitialPlatformMarketState(params: { currentWeek: number; currentYear: number }): PlatformMarketState {
  const totalAddressableSubs = 100_000_000;

  const rivals = PROVIDER_DEALS.filter((p) => p.dealKind === 'streaming').map((p) => ({
    id: p.id,
    name: p.name,
    subscribers: Math.floor(totalAddressableSubs * 0.8 * (p.marketShare / 100)),
    cash: Math.floor(p.marketShare * 200_000_000),
    status: 'healthy' as const,
    distressWeeks: 0,
    tierMix: { adSupportedPct: 50, adFreePct: 50 },
    priceIndex: 1,
    catalogValue: 50,
    freshness: 55,
  }));

  return {
    totalAddressableSubs,
    rivals,
    lastUpdatedWeek: params.currentWeek,
    lastUpdatedYear: params.currentYear,
  };
}

interface StudioMagnateGameProps {
  onPhaseChange?: (phase: string) => void;
  gameConfig?: {
    studioName: string;
    specialties: Genre[];
    difficulty: 'easy' | 'normal' | 'hard' | 'magnate';
    startingBudget: number;
    studioIcon?: import('./StudioIconCustomizer').StudioIconConfig;
    enableStreamingWars?: boolean;
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

  /**
   * When provided, enables Online League features as a separate mode.
   * Single-player gameplay does not depend on this.
   */
  onlineLeagueCode?: string;

  /**
   * Desired season length in years when creating a new online league.
   * Ignored when joining an existing league.
   */
  onlineSeasonYears?: number;

  /**
   * Online League (Option B): non-host clients mirror the host's game state each turn.
   * This is experimental and primarily intended for testing shared-session flows.
   */
  onlineHostSync?: boolean;
}

export const StudioMagnateGame: React.FC<StudioMagnateGameProps> = ({
  onPhaseChange,
  gameConfig,
  initialGameState,
  initialPhase,
  initialUnlockedAchievements,
  onlineLeagueCode,
  onlineSeasonYears,
  onlineHostSync = false,
}) => {
  const { toast } = useToast();
  const isOnlineMode = !!onlineLeagueCode?.trim();
  const ONLINE_LEAGUE_START_YEAR = 2026;
  const { startOperation, updateOperation, completeOperation } = useLoadingActions();
  const weeklyProcessingRef = useRef(false);
  const aiSlateGeneratorRef = useRef<{ year: number; nextWeek: number } | null>(null);
  
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
  
  const initGame = useGameStore((s) => s.initGame);
  const loadGameToStore = useGameStore((s) => s.loadGame);
  const storeGameState = useGameStore((s) => s.game);
  const setGameState = useGameStore((s) => s.setGameState);
  const mergeGameState = useGameStore((s) => s.mergeGameState);
  const updateStudio = useGameStore((s) => s.updateStudio);
  const updateTalent = useGameStore((s) => s.updateTalent);
  const replaceProject = useGameStore((s) => s.replaceProject);
  const addProject = useGameStore((s) => s.addProject);
  const appendFranchiseEntry = useGameStore((s) => s.appendFranchiseEntry);
  const upsertFranchise = useGameStore((s) => s.upsertFranchise);
  const upsertScript = useGameStore((s) => s.upsertScript);
  const updateBudget = useGameStore((s) => s.updateBudget);
  const updateReputation = useGameStore((s) => s.updateReputation);
  const gameRegistry = useGameStore((s) => s.registry);

  const [bootstrapGameState] = useState<GameState>(() => {
    // If we have a loaded game, use it directly and skip heavy init
    if (initialGameState) {
      const derivedUniverseSeed =
        typeof initialGameState.universeSeed === 'number'
          ? initialGameState.universeSeed
          : seedFromString(`${initialGameState.studio?.id ?? 'studio'}`);

      const derivedRngState =
        typeof initialGameState.rngState === 'number'
          ? initialGameState.rngState
          : derivedUniverseSeed;

      const seeded = { ...initialGameState, universeSeed: derivedUniverseSeed, rngState: derivedRngState };
      return isOnlineMode ? seeded : primeCompetitorTelevision(seeded);
    }

    // Lightweight placeholder so the LoadingOverlay can render before heavy init starts.
    // The real world state is generated in an effect below.
    const universeSeed = generateGameSeed();

    const currentYear = isOnlineMode ? ONLINE_LEAGUE_START_YEAR : new Date().getFullYear();
    const streamingWarsEnabled = !!gameConfig?.enableStreamingWars;

    return {
      universeSeed,
      rngState: universeSeed,
      mode: isOnlineMode ? 'online' : 'single',
      dlc: {
        streamingWars: streamingWarsEnabled,
      },
      platformMarket: streamingWarsEnabled ? createInitialPlatformMarketState({ currentWeek: 1, currentYear }) : undefined,
      studio: {
        id: 'player-studio',
        name: gameConfig?.studioName || 'Untitled Pictures',
        reputation: 50,
        budget: gameConfig?.startingBudget || 10000000,
        founded: 1965,
        specialties: gameConfig?.specialties || (['drama'] as Genre[]),
        debt: 0,
        lastProjectWeek: 0,
        weeksSinceLastProject: 0,
      },
      currentYear,
      currentWeek: 1,
      currentQuarter: 1,
      projects: [],
      talent: [],
      scripts: [],
      competitorStudios: [],
      marketConditions: {
        trendingGenres: ['action', 'drama', 'comedy'] as Genre[],
        audiencePreferences: [],
        economicClimate: 'stable' as const,
        technologicalAdvances: [],
        regulatoryChanges: [],
        seasonalTrends: [],
        competitorReleases: [],
        awardsSeasonActive: false,
      },
      eventQueue: [],
      boxOfficeHistory: [],
      awardsCalendar: [],
      industryTrends: [],
      allReleases: [],
      topFilmsHistory: [],
      franchises: [],
      publicDomainIPs: [],
      aiStudioProjects: [],
      aiStudioState: { aiFilms: [], talentCommitments: [], nextFilmId: 1 },
      mediaState: {
        engine: { history: [], memories: [], eventQueue: [] },
        response: { campaigns: [], reactions: [], nextCampaignId: 1 },
      },
    } as GameState;
  });

  // Hydrate the store from an existing save.
  useEffect(() => {
    if (storeGameState) return;
    if (!initialGameState) return;

    const derivedUniverseSeed =
      typeof initialGameState.universeSeed === 'number'
        ? initialGameState.universeSeed
        : seedFromString(`${initialGameState.studio?.id ?? 'studio'}`);

    const derivedRngState =
      typeof initialGameState.rngState === 'number'
        ? initialGameState.rngState
        : derivedUniverseSeed;

    const seeded = {
      ...initialGameState,
      universeSeed: derivedUniverseSeed,
      rngState: derivedRngState,
    };

    const next = isOnlineMode ? seeded : primeCompetitorTelevision(seeded);

    MediaEngine.cleanup();
    loadGameToStore(next, next.rngState ?? next.universeSeed);
  }, [storeGameState, initialGameState, loadGameToStore, isOnlineMode]);

  // Generate a fresh world asynchronously so the loading overlay can appear immediately.
  const newGameInitStartedRef = useRef(false);
  const [newGameInitAttempt, setNewGameInitAttempt] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (storeGameState) return;
    if (initialGameState) return;
    if (newGameInitStartedRef.current) return;
    newGameInitStartedRef.current = true;

    let cancelled = false;

    const run = async () => {
      startOperation(LOADING_OPERATIONS.GAME_INIT.id, LOADING_OPERATIONS.GAME_INIT.name, LOADING_OPERATIONS.GAME_INIT.estimatedTime);
      updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 1, 'Preparing the world...');

      await delay(0);

      const universeSeed = generateGameSeed();

      const studio = {
        id: 'player-studio',
        name: gameConfig?.studioName || 'Untitled Pictures',
        reputation: 50,
        budget: gameConfig?.startingBudget || 10000000,
        founded: 1965,
        specialties: gameConfig?.specialties || (['drama'] as Genre[]),
        debt: 0,
        lastProjectWeek: 0,
        weeksSinceLastProject: 0,
      };

      const mods = getModBundle();

      updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 10, 'Generating talent pool...');
      await delay(0);

      const worldStartYear = isOnlineMode ? ONLINE_LEAGUE_START_YEAR : new Date().getFullYear();

      const generatedTalent = applyPatchesByKey(
        generateInitialTalentPool({ currentYear: worldStartYear }),
        getPatchesForEntity(mods, 'talent'),
        (t) => t.id
      );

      let competitorStudios: Studio[] = [];

      if (!isOnlineMode) {
        updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 25, 'Generating competitor studios...');
        await delay(0);

        const studioGenerator = new StudioGenerator();
        competitorStudios = studioGenerator.generateCompetitorStudios();
      } else {
        updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 25, 'Online League: skipping AI studios...');
        await delay(0);
      }

      const releases: Project[] = [];

      if (!isOnlineMode) {
        updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 30, 'Seeding AI releases...');
        await delay(0);

        const sg = new StudioGenerator();
        const currentYear = new Date().getFullYear();
        const yearsToSeed = [currentYear - 1, currentYear];
        const totalWeeks = yearsToSeed.length * 52;
        let processedWeeks = 0;

        const yieldToBrowser = () => delay(0);
        const YIELD_EVERY_OPS = 25;
        let processedOps = 0;

        for (const year of yearsToSeed) {
          for (let w = 1; w <= 52; w++) {
            if (cancelled) return;

            processedWeeks += 1;
            let releasesThisWeek = 0;

            for (const st of competitorStudios) {
              if (cancelled) return;

              const profile = sg.getStudioProfile(st.name);
              const rel = profile ? sg.generateDeterministicStudioRelease(profile, w, year, universeSeed) : null;
              if (rel) {
                releases.push(rel);
                releases[releases.length - 1] = attachBasicCastForAI(releases[releases.length - 1] as Project, generatedTalent);
                releasesThisWeek += 1;
              }

              processedOps += 1;
              if (processedOps % YIELD_EVERY_OPS === 0) {
                await yieldToBrowser();
              }
            }

            if (releasesThisWeek === 0 && competitorStudios[0]) {
              const fallback = sg.getStudioProfile(competitorStudios[0].name);
              if (fallback) {
                const rel = sg.generateDeterministicStudioRelease(fallback, w, year, universeSeed);
                releases.push(rel || sg.generateDeterministicIndieRelease(fallback, w, year, universeSeed));

                releases[releases.length - 1] = attachBasicCastForAI(releases[releases.length - 1] as Project, generatedTalent);
              }
            }

            processedOps += 1;
            if (processedOps % YIELD_EVERY_OPS === 0) {
              await yieldToBrowser();
            }

            if (processedWeeks % 2 === 0) {
              const progress = 30 + (processedWeeks / totalWeeks) * 45;
              updateOperation(
                LOADING_OPERATIONS.GAME_INIT.id,
                Math.min(75, Math.round(progress)),
                `Seeding AI releases... (Y${year}W${w})`
              );
              await yieldToBrowser();
            }
          }
        }
      }

      updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 78, 'Generating franchises & public-domain IPs...');
      await delay(0);

      let initialState: GameState = {
        universeSeed,
        rngState: universeSeed,
        mode: isOnlineMode ? 'online' : 'single',
        dlc: {
          streamingWars: !!gameConfig?.enableStreamingWars,
        },
        platformMarket: gameConfig?.enableStreamingWars
          ? createInitialPlatformMarketState({ currentWeek: 1, currentYear: worldStartYear })
          : undefined,
        studio,
        currentYear: worldStartYear,
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
          awardsSeasonActive: false,
        },
        eventQueue: [],
        boxOfficeHistory: [],
        awardsCalendar: [],
        industryTrends: [],
        allReleases: releases,
        topFilmsHistory: [],
        franchises: applyPatchesByKey(
          getWorldFranchiseCatalog(999),
          getPatchesForEntity(mods, 'franchise'),
          (f) => f.id
        ),
        publicDomainIPs: PublicDomainGenerator.generateInitialPublicDomainIPs(50, mods),
        aiStudioProjects: [] as Project[],
        aiStudioState: { aiFilms: [], talentCommitments: [], nextFilmId: 1 },
        mediaState: {
          engine: { history: [], memories: [], eventQueue: [] },
          response: { campaigns: [], reactions: [], nextCampaignId: 1 },
        },
      };

      updateOperation(
        LOADING_OPERATIONS.GAME_INIT.id,
        82,
        isOnlineMode ? 'Online League: skipping competitor television...' : 'Priming competitor television...'
      );
      await delay(0);

      if (!isOnlineMode) {
        initialState = primeCompetitorTelevision(initialState);
      }

      updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 88, 'Seeding filmographies...');
      await delay(0);

      try {
        let filmographyState = initialState;
        let i = 0;
        const total = initialState.allReleases.length;

        for (const release of initialState.allReleases) {
          if (cancelled) return;

          i += 1;
          if ('script' in release) {
            filmographyState = TalentFilmographyManager.updateFilmographyOnRelease(filmographyState, release as Project);
          }

          if (i % 25 === 0) {
            const p = 88 + (i / Math.max(1, total)) * 10;
            updateOperation(LOADING_OPERATIONS.GAME_INIT.id, Math.min(98, Math.round(p)), `Seeding filmographies... (${i}/${total})`);
            await delay(0);
          }
        }

        initialState = filmographyState;
      } catch (e) {
        console.warn('Failed to seed talent filmographies from AI releases', e);
      }

      if (cancelled) return;

      updateOperation(LOADING_OPERATIONS.GAME_INIT.id, 100, 'Finalizing...');
      MediaEngine.cleanup();
      initGame(initialState, initialState.universeSeed);

      setTimeout(() => {
        completeOperation(LOADING_OPERATIONS.GAME_INIT.id);
      }, 0);
    };

    run().catch((e) => {
      console.error('[Game Init] Failed to generate a new world', e);
      newGameInitStartedRef.current = false;
      completeOperation(LOADING_OPERATIONS.GAME_INIT.id);

      toast({
        title: 'World Generation Failed',
        description: 'Something went wrong while generating a new game world. You can retry without reloading the page.',
        variant: 'destructive',
        action: (
          <ToastAction
            altText="Retry"
            onClick={() => {
              newGameInitStartedRef.current = false;
              setNewGameInitAttempt((n) => n + 1);
            }}
          >
            Retry
          </ToastAction>
        ),
      });
    });

    return () => {
      cancelled = true;
      completeOperation(LOADING_OPERATIONS.GAME_INIT.id);
    };
  }, [newGameInitAttempt]);

  const gameState = storeGameState ?? bootstrapGameState;

  // Keep singleton-style managers in sync with persisted state.
  useEffect(() => {
    if (isOnlineMode) {
      AIStudioManager.resetAISystem();
    } else {
      AIStudioManager.hydrate(gameState.aiStudioState);
    }

    MediaEngine.hydrate(gameState.mediaState);
    MediaResponseSystem.hydrate(gameState.mediaState);
  }, [gameState.aiStudioState, gameState.mediaState, isOnlineMode]);

  // Market dynamics hooks  
  const genreSaturation = useGenreSaturation(
    gameState.allReleases.filter((item) => 'script' in item) as any,
    gameState.currentWeek,
    gameState.currentYear
  );
  const currentPhase = useUiStore((s) => s.phase) as any;
  const setPhase = useUiStore((s) => s.setPhase);
  const selectedProjectId = useUiStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useUiStore((s) => s.setSelectedProjectId);

  const phaseInitRef = useRef(false);
  const initialPhaseNormalizedRaw = (((initialPhase === 'financials' ? 'finance' : initialPhase) as any) || 'dashboard') as string;
  const initialPhaseNormalized = !onlineLeagueCode && initialPhaseNormalizedRaw === 'online' ? 'dashboard' : initialPhaseNormalizedRaw;

  useEffect(() => {
    if (phaseInitRef.current) return;
    phaseInitRef.current = true;
    setPhase(initialPhaseNormalized);
  }, [initialPhaseNormalized, setPhase]);

  const achievements = useAchievements(gameState, initialUnlockedAchievements);
  const selectedProject = selectedProjectId
    ? (gameState.projects.find(p => p.id === selectedProjectId) || null)
    : null;
  const [selectedFranchise, setSelectedFranchise] = useState<string | null>(null);
  const [selectedPublicDomain, setSelectedPublicDomain] = useState<string | null>(null);
  const [filmReleaseProject, setFilmReleaseProject] = useState<Project | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);

  // Post-tick persistence (strict single-button progression contract):
  // Any persistence that should happen "because a week advanced" is scheduled by the tick
  // and executed after the state commit (never as an ambient effect of mounting UI panels).
  const pendingPostTickStateRef = useRef<GameState | null>(null);
  const pendingPostTickPersistRef = useRef(false);
  const pendingOnlineTurnPublishRef = useRef<{ leagueId: string; turn: number } | null>(null);

  // First week box office modal state
  const [firstWeekModalProject, setFirstWeekModalProject] = useState<Project | null>(null);
  const [showFirstWeekModal, setShowFirstWeekModal] = useState(false);

  const lastFirstWeekModalKeyRef = useRef<string>('');

  // Show the first-week box office modal automatically when a film is released.
  // This replaces the previous pattern of calling setState from inside the weekly processing loop.
  useEffect(() => {
    if (showFirstWeekModal) return;

    const newlyReleasedFilm = gameState.projects.find(p =>
      p.status === 'released' &&
      p.type !== 'series' &&
      p.type !== 'limited-series' &&
      p.metrics?.weeksSinceRelease === 0
    );

    if (!newlyReleasedFilm) return;

    const key = `${gameState.currentYear}-${gameState.currentWeek}-${newlyReleasedFilm.id}`;
    if (key === lastFirstWeekModalKeyRef.current) return;

    lastFirstWeekModalKeyRef.current = key;
    setFirstWeekModalProject(newlyReleasedFilm);
    setShowFirstWeekModal(true);
  }, [gameState.currentWeek, gameState.currentYear, gameState.projects, showFirstWeekModal]);
  
  // Award show modal state
  const [currentAwardShow, setCurrentAwardShow] = useState<AwardShowCeremony | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);

  // Online League shared "League Awards" ceremony (synchronized via league snapshots)
  const [leagueAwardsCeremony, setLeagueAwardsCeremony] = useState<LeagueAwardsCeremony | null>(null);
  const [showLeagueAwardsModal, setShowLeagueAwardsModal] = useState(false);
  const lastLeagueAwardsKeyRef = useRef<string>('');

  // Week Recap (Tick Report)
  const pendingTickReportRef = useRef<TickReport | null>(null);
  const pendingTickReportOpenRef = useRef(false);
  const [lastTickReport, setLastTickReport] = useState<TickReport | null>(null);
  const [showWeekRecap, setShowWeekRecap] = useState(false);

  // Post-tick: consume any tick report computed during the Advance Week reducer.
  // The week/year change is our "tick committed" signal.
  useEffect(() => {
    // Explicit post-tick persistence (industry DB, etc.)
    if (pendingPostTickPersistRef.current) {
      pendingPostTickPersistRef.current = false;

      // Persist a long-lived, cross-session industry catalog (films/TV/talent/awards/studios).
      // This is separate from the save-game snapshot and continues to accrue even if the in-memory
      // simulation prunes older releases for performance.
      try {
        syncAndPersistIndustryDatabase(getActiveSaveSlotId(), gameState);
      } catch (e) {
        console.warn('Failed to persist industry database', e);
      }

      // Online League (Option B): the host publishes an authoritative state for this turn.
      const pendingOnline = pendingOnlineTurnPublishRef.current;
      if (pendingOnline) {
        pendingOnlineTurnPublishRef.current = null;

        void upsertOnlineLeagueTurnSnapshot({
          leagueId: pendingOnline.leagueId,
          turn: pendingOnline.turn,
          snapshot: {
            gameState,
            meta: {
              savedAt: new Date().toISOString(),
              version: 'online-1',
            },
          },
        }).catch((e) => {
          console.warn('Failed to publish online league turn snapshot', e);
          toast({
            title: 'Online League',
            description: 'Failed to publish host state for the new turn.',
            variant: 'destructive',
          });
        });
      }

      pendingPostTickStateRef.current = null;
    }

    const report = pendingTickReportRef.current;
    if (!report) return;

    pendingTickReportRef.current = null;
    setLastTickReport(report);

    if (pendingTickReportOpenRef.current) {
      setShowWeekRecap(true);
    }
    pendingTickReportOpenRef.current = false;
  }, [gameState.currentWeek, gameState.currentYear]);

  // Handle achievement rewards
  const handleAchievementRewards = (unlockedAchievements: Array<{ id?: string; reward?: { reputation?: number; budget?: number } }>) => {
    unlockedAchievements.forEach((achievement) => {
      if (!achievement.reward) return;

      if (achievement.reward.reputation) {
        updateReputation(achievement.reward.reputation);
      }
      if (achievement.reward.budget) {
        updateBudget(achievement.reward.budget);
      }
    });
  };

  const handleSaveGame = async () => {
    try {
      const unlockedIds = achievements.getUnlockedAchievements().map(a => a.id);
      const slotId = getActiveSaveSlotId();

      await saveGameAsync(slotId, gameState, {
        currentPhase,
        unlockedAchievementIds: unlockedIds
      });

      toast({
        title: 'Game Saved',
        description: `Saved to ${slotId}.`,
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

  const handlePhaseChange = (phase: string) => {
    setPhase(phase);
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

    const newProject: Project = createProjectFromScript(script, overrides);

    // Auto-generate roles only if script has no characters
    let enrichedProject: Project = newProject;
    try {
      const preexisting = newProject.script.characters && newProject.script.characters.length > 0;
      const roles = preexisting ? newProject.script.characters! : importRolesForScript(newProject.script, gameState);
      if (roles && roles.length > 0) {
        enrichedProject = { ...newProject, script: { ...newProject.script, characters: roles } };
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

    addProject(enrichedProject);

    updateStudio({
      budget: finalBudget,
      debt: newDebt,
      lastProjectWeek: gameState.currentWeek,
      weeksSinceLastProject: 0,
    });

    const franchiseId = enrichedProject.script?.franchiseId;
    if (franchiseId) {
      appendFranchiseEntry(franchiseId, enrichedProject.id);
    }

    updateOperation('project-create', 100, 'Project created successfully!');

    setSelectedProjectId(newProject.id);
    toast({
      title: "Project Greenlit!",
      description: `"${script.title}" has entered development.`,
    });
    
    // Complete loading operation
    setTimeout(() => completeOperation('project-create'), 500);
  };

  const handleStudioUpdate = (updates: Partial<Studio>) => {
    updateStudio(updates);
  };

  const handleTalentUpdate = (talentId: string, updates: Partial<TalentPerson>) => {
    updateTalent(talentId, updates);
  };

  const handleCreateFranchise = (franchise: any) => {
    upsertFranchise(franchise);
    toast({
      title: "Franchise Created",
      description: `"${franchise.title}" franchise has been established`,
    });
  };

  

  // Handle award show triggers
  const handleAwardShow = (ceremony: AwardShowCeremony) => {
    // In Online League mode (without host-sync), award ceremonies are not shared across members.
    // Suppress the local award show modal and instead surface a synchronized "League Awards" gala.
    if (isOnlineMode && !onlineHostSync) return;

    setCurrentAwardShow(ceremony);
    setShowAwardModal(true);
  };

  // Always run awards engine in the background (independent of UI phase)
  useAwardsEngine(gameState, handleStudioUpdate, handleTalentUpdate, handleAwardShow, mergeGameState);

  

  // CRITICAL: Manual marketing campaign creation (no auto-progression)
  const handleMarketingCampaignCreate = (project: Project, strategy: MarketingStrategy, budget: number, duration: number) => {
    if (import.meta.env.DEV) {
      console.log(`MANUAL MARKETING START: ${project.title}`);
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

    const hasScheduledRelease = !!project.scheduledReleaseWeek && !!project.scheduledReleaseYear;
    const startingBuzz = project.marketingData?.currentBuzz ?? project.marketingCampaign?.buzz ?? 20;

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
        buzz: startingBuzz,
        activities: [],
        targetAudience: strategy.targeting.demographic,
        effectiveness: 60
      },
      phaseDuration: duration,
      status: (hasScheduledRelease ? 'scheduled-for-release' : 'marketing') as any
    };

    replaceProject(updatedProject);
    updateBudget(-budget);
    
    toast({
      title: "Marketing Campaign Launched!",
      description: `${project.title} marketing campaign is now active for ${duration} weeks.`,
    });
  };

  // CRITICAL: Manual release strategy creation (no auto-progression)
  const handleReleaseStrategyCreate = (project: Project, strategy: ReleaseStrategy) => {
    if (import.meta.env.DEV) {
      console.log(`MANUAL RELEASE STRATEGY SET: ${project.title}`);
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

    const schedulingDuringMarketing =
      project.currentPhase === 'marketing' &&
      !!project.marketingCampaign &&
      project.marketingCampaign.weeksRemaining > 0;

    const updatedProject = {
      ...project,
      releaseStrategy: strategy,
      scheduledReleaseWeek: selectedWeek,
      scheduledReleaseYear: selectedYear,
      status: 'scheduled-for-release' as any,
      readyForRelease: false,
      ...(schedulingDuringMarketing
        ? {}
        : {
            currentPhase: 'release' as const,
            phaseDuration: -1, // prevent auto-advancement until release week
          }),
      metrics: {
        ...project.metrics,
        criticsScore:
          project.metrics?.criticsScore ??
          stableInt(`${project.id}|critics|${selectedYear}|${selectedWeek}`, 50, 90),
        audienceScore:
          project.metrics?.audienceScore ??
          stableInt(`${project.id}|audience|${selectedYear}|${selectedWeek}`, 50, 90),
      }
    };

    replaceProject(updatedProject);

    toast({
      title: "Release Strategy Set!",
      description: `${project.title} will be released in Y${selectedYear}W${selectedWeek}.`,
    });
  };

  type WeeklyProjectEffectsResult = {
    projects: Project[];
    studioRevenueDelta: number;
    releasedProjects: Project[];
  };

  const processWeeklyProjectEffects = (projects: Project[], timeState: TimeState, baseState: GameState, toastEnabled: boolean, diagnosticsEnabled: boolean): WeeklyProjectEffectsResult => {
    if (diagnosticsEnabled) {
      console.log(`=== WEEKLY PROJECT PROCESSING START ===`);
    }

    let studioRevenueDelta = 0;
    const releasedProjects: Project[] = [];

    const results = projects.map((project, index) => {
      if (diagnosticsEnabled) {
        console.log(`[${index}] Processing: ${project.title} (${project.currentPhase})`);
        console.log(`    BEFORE: boxOfficeTotal = ${project.metrics?.boxOfficeTotal || 0}`);
      }
      
      let updatedProject = { ...project };

      // Process development phase
      if (project.currentPhase === 'development') {
        updatedProject = processDevelopmentProgress(project, timeState.currentWeek);
      }
      
      // Handle scheduled releases when their date arrives
      let justReleased = false;
      // scheduledReleaseWeek/Year is the canonical planned release date
      const effectiveReleaseWeek = project.scheduledReleaseWeek || project.releaseWeek;
      const effectiveReleaseYear = project.scheduledReleaseYear || project.releaseYear;
      const hasPlannedReleaseDate = !!project.scheduledReleaseWeek && !!project.scheduledReleaseYear;
      const isScheduledLike = project.status === 'scheduled-for-release' || (project.currentPhase === 'release' && hasPlannedReleaseDate);
      if (isScheduledLike && effectiveReleaseWeek && effectiveReleaseYear) {
        const currentAbsoluteWeek = (timeState.currentYear * 52) + timeState.currentWeek;
        const releaseAbsoluteWeek = (effectiveReleaseYear * 52) + effectiveReleaseWeek;
        
          if (currentAbsoluteWeek >= releaseAbsoluteWeek) {
            if (diagnosticsEnabled) {
              console.log(`RELEASE DATE ARRIVED: ${project.title}`);
              console.log(`    PRE-RELEASE: boxOfficeTotal = ${project.metrics?.boxOfficeTotal || 0}`);
            }
            const resolvedReleaseWeek = effectiveReleaseWeek;
            const resolvedReleaseYear = effectiveReleaseYear;

            // Normalize release date fields so downstream systems (TV ratings / box office / post-theatrical)
            // always have a canonical releaseWeek/releaseYear, even if the project was scheduled via
            // scheduledReleaseWeek/scheduledReleaseYear.
            updatedProject = {
              ...updatedProject,
              releaseWeek: resolvedReleaseWeek,
              releaseYear: resolvedReleaseYear,
              scheduledReleaseWeek: resolvedReleaseWeek,
              scheduledReleaseYear: resolvedReleaseYear,
            };

            let openingWeekRevenue = 0;

            if (project.type === 'series' || project.type === 'limited-series') {
              // TV: do not initialize ratings until the first episode actually airs.
              updatedProject = {
                ...updatedProject,
                status: 'released' as const,
                currentPhase: 'distribution' as const,
                phaseDuration: -1,
              };

              // Ensure season exists and perform the premiere drop if due (weekly/batch/binge).
              updatedProject = TVEpisodeSystem.ensureSeason(updatedProject);
              updatedProject = TVEpisodeSystem.autoReleaseEpisodesIfDue(updatedProject, timeState.currentWeek, timeState.currentYear);
              updatedProject = TVEpisodeSystem.processWeeklyEpisodeDecay(updatedProject, timeState.currentWeek, timeState.currentYear);
            } else {
              const isPrimaryStreaming = updatedProject.releaseStrategy?.type === 'streaming';

              if (isPrimaryStreaming) {
                const premierePlatformLabel =
                  updatedProject.distributionStrategy?.primary?.type === 'streaming'
                    ? updatedProject.distributionStrategy.primary.platform
                    : undefined;

                updatedProject = StreamingFilmSystem.initializeRelease(
                  updatedProject,
                  resolvedReleaseWeek,
                  resolvedReleaseYear,
                  premierePlatformLabel
                );

                const alreadyHasStreamingWindow = (updatedProject.postTheatricalReleases || []).some(
                  (r) => r.platform === 'streaming'
                );

                const critics = updatedProject.metrics?.criticsScore || 50;
                const audience = updatedProject.metrics?.audienceScore || 50;
                const avgScore = (critics + audience) / 2;

                const buzz = updatedProject.marketingData?.currentBuzz ?? updatedProject.marketingCampaign?.buzz ?? 0;
                const viewsFirstWeek = updatedProject.metrics?.streaming?.viewsFirstWeek || 0;

                const scoreMultiplier = Math.min(1.4, Math.max(0.6, avgScore / 70));
                const buzzMultiplier = 1 + Math.min(0.5, Math.max(0, buzz / 250));

                const estimatedTotalRevenue = Math.max(
                  100_000,
                  Math.floor(viewsFirstWeek * 0.35 * scoreMultiplier * buzzMultiplier)
                );

                const durationWeeks = 26;
                const weeklyRevenue = Math.max(10_000, Math.round(estimatedTotalRevenue / durationWeeks));

                updatedProject = {
                  ...updatedProject,
                  postTheatricalEligible: true,
                  theatricalEndDate: new Date(),
                  postTheatricalReleases: alreadyHasStreamingWindow
                    ? updatedProject.postTheatricalReleases
                    : [
                        ...(updatedProject.postTheatricalReleases || []),
                        {
                          id: `release-${updatedProject.id}-${resolvedReleaseYear}-${resolvedReleaseWeek}-streaming`,
                          projectId: updatedProject.id,
                          platform: 'streaming',
                          providerId:
                            updatedProject.releaseStrategy?.streamingProviderId ||
                            updatedProject.streamingPremiereDeal?.providerId ||
                            undefined,
                          releaseDate: new Date(),
                          revenue: 0,
                          weeklyRevenue,
                          weeksActive: 0,
                          status: 'planned',
                          cost: 0,
                          durationWeeks,
                        },
                      ],
                };
              } else {
                updatedProject = {
                  ...BoxOfficeSystem.initializeRelease(updatedProject, resolvedReleaseWeek, resolvedReleaseYear),
                  currentPhase: 'distribution' as const,
                  phaseDuration: -1,
                };

                openingWeekRevenue = updatedProject.metrics?.boxOfficeTotal || 0;
                if (openingWeekRevenue > 0) {
                  studioRevenueDelta += openingWeekRevenue * 0.55;
                }
              }
            }

            // Media coverage for player releases (release + opening weekend)
            MediaEngine.queueMediaEvent({
              type: 'release',
              triggerType: 'automatic',
              priority: 'high',
              entities: {
                studios: [baseState.studio.id],
                projects: [updatedProject.id],
                talent: (updatedProject.cast || []).map(c => c.talentId)
              },
              eventData: { project: updatedProject },
              week: timeState.currentWeek,
              year: timeState.currentYear
            });

            if (openingWeekRevenue > 0 && updatedProject.type !== 'series' && updatedProject.type !== 'limited-series') {
              MediaEngine.triggerBoxOfficeReport(updatedProject, openingWeekRevenue, baseState);
            }

            if (diagnosticsEnabled) {
              console.log(`    POST-RELEASE: boxOfficeTotal = ${updatedProject.metrics?.boxOfficeTotal || 0}`);
            }
            justReleased = true; // Flag to skip processing on release week

            // Track releases for end-of-week filmography updates (no nested setState)
            releasedProjects.push(updatedProject);
          }
      }
      
      // Process box office for released films (but skip on the week they just released)
       if (updatedProject.status === 'released' && !justReleased) {
         if (project.type === 'series' || project.type === 'limited-series') {
           if (diagnosticsEnabled) {
             console.log(`    PROCESSING TV RATINGS: ${project.title}`);
           }

           updatedProject = TVEpisodeSystem.ensureSeason(updatedProject);
           updatedProject = TVEpisodeSystem.autoReleaseEpisodesIfDue(updatedProject, timeState.currentWeek, timeState.currentYear);
           updatedProject = TVEpisodeSystem.processWeeklyEpisodeDecay(updatedProject, timeState.currentWeek, timeState.currentYear);

           updatedProject = TVRatingsSystem.processWeeklyRatings(
             updatedProject,
             timeState.currentWeek,
             timeState.currentYear
           );
         } else {
           if (updatedProject.releaseStrategy?.type === 'streaming') {
             if (diagnosticsEnabled) {
               console.log(`    PROCESSING STREAMING: ${project.title}`);
             }

             updatedProject = StreamingFilmSystem.processWeeklyPerformance(
               updatedProject,
               timeState.currentWeek,
               timeState.currentYear
             );
           } else {
             // Box office simulation is now handled by the deterministic engine tick.
             // Here, we only credit the studio share + ledger entries based on the engine result.
             if (diagnosticsEnabled) {
               console.log(`    BOX OFFICE (ENGINE): ${project.title}`);
               console.log(`    boxOfficeTotal = ${updatedProject.metrics?.boxOfficeTotal || 0}`);
             }

             const releaseWeek = updatedProject.releaseWeek;
             const releaseYear = updatedProject.releaseYear;

             const expectedWeeksSinceRelease =
               typeof releaseWeek === 'number' && typeof releaseYear === 'number'
                 ? TimeSystem.calculateWeeksSince(releaseWeek, releaseYear, timeState.currentWeek, timeState.currentYear)
                 : 0;

             const currentWeeksSinceRelease =
               typeof updatedProject.metrics?.weeksSinceRelease === 'number'
                 ? updatedProject.metrics.weeksSinceRelease
                 : expectedWeeksSinceRelease;

             const weeklyBoxOfficeRevenue =
               expectedWeeksSinceRelease >= 1 &&
               currentWeeksSinceRelease === expectedWeeksSinceRelease &&
               updatedProject.metrics?.theatricalRunLocked !== true
                 ? (updatedProject.metrics?.lastWeeklyRevenue || 0)
                 : 0;

             if (diagnosticsEnabled) {
               console.log(`    WEEKLY BOX OFFICE (ENGINE): ${weeklyBoxOfficeRevenue.toLocaleString()}`);
             }

             if (weeklyBoxOfficeRevenue > 0) {
               const alreadyRecorded = FinancialEngine.getFilmFinancials(updatedProject.id).transactions.some(
                 t => t.type === 'revenue' && t.category === 'boxoffice' && t.week === timeState.currentWeek && t.year === timeState.currentYear
               );

               if (!alreadyRecorded) {
                 FinancialEngine.recordFilmRevenue(updatedProject.id, weeklyBoxOfficeRevenue, timeState.currentWeek, timeState.currentYear, `Week ${expectedWeeksSinceRelease + 1}`);
               }

               const studioShare = weeklyBoxOfficeRevenue * 0.55;
               if (diagnosticsEnabled) {
                 console.log(`    STUDIO SHARE (55%): ${studioShare.toLocaleString()}`);
               }

               studioRevenueDelta += studioShare;
             }
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

    // Calculate weekly buzz growth from campaign spending
    const campaignBudget = updatedProject.marketingCampaign.budgetAllocated || 0;
    const weeklySpend = campaignBudget / updatedProject.marketingCampaign.duration;
    const weeklyBuzzGrowth = Math.max(2, Math.floor(weeklySpend / 500000)); // ~2-10 buzz per week
    const buzzCap = (updatedProject.type === 'series' || updatedProject.type === 'limited-series') ? 250 : 150;
    const newBuzz = Math.min(buzzCap, (updatedProject.marketingCampaign.buzz || 0) + weeklyBuzzGrowth);
    const newBudgetSpent = (updatedProject.marketingCampaign.budgetSpent || 0) + weeklySpend;

    updatedProject = {
      ...updatedProject,
      marketingCampaign: {
        ...updatedProject.marketingCampaign,
        activities: updatedActivities,
        weeksRemaining: newWeeksRemaining,
        buzz: newBuzz,
        budgetSpent: Math.min(campaignBudget, newBudgetSpent),
        effectiveness: Math.min(100, (updatedProject.marketingCampaign.effectiveness || 50) + 2)
      },
      // CRITICAL: Sync buzz to marketingData so UI and release validation can see it
      marketingData: {
        ...updatedProject.marketingData,
        currentBuzz: newBuzz,
        totalSpent: updatedProject.marketingData?.totalSpent || campaignBudget,
        campaigns: updatedProject.marketingData?.campaigns || []
      }
    };

    // When marketing is complete, move to release phase
    if (newWeeksRemaining === 0) {
      if (diagnosticsEnabled) {
        console.log(`MARKETING COMPLETE: ${project.title} - Moving to release phase`);
      }

      const hasScheduledRelease = !!updatedProject.scheduledReleaseWeek && !!updatedProject.scheduledReleaseYear;

      updatedProject = {
        ...updatedProject,
        currentPhase: 'release',
        status: (hasScheduledRelease ? 'scheduled-for-release' : 'ready-for-release') as any,
        readyForRelease: !hasScheduledRelease,
        ...(hasScheduledRelease ? { phaseDuration: -1 } : {})
      };
    }
  }

      // Process post-theatrical releases revenue
      if (updatedProject.postTheatricalReleases && updatedProject.postTheatricalReleases.length > 0) {
        if (diagnosticsEnabled) {
          console.log(`    PROCESSING POST-THEATRICAL: ${updatedProject.title}`);
        }

        const postTheatrical = PostTheatricalSystem.processWeeklyRevenue(
          updatedProject,
          timeState.currentWeek,
          timeState.currentYear,
          diagnosticsEnabled
        );

        updatedProject = postTheatrical.project;

        if (postTheatrical.revenueDelta > 0) {
          if (diagnosticsEnabled) {
            console.log(`      TOTAL WEEKLY POST-THEATRICAL: +${postTheatrical.revenueDelta.toLocaleString()}`);
          }
          studioRevenueDelta += postTheatrical.revenueDelta;
        }
      }

      // CRITICAL: Only process phase timers for specific phases (skip if phaseDuration is -1, which means manual control)
      if (updatedProject.phaseDuration !== undefined && updatedProject.phaseDuration > 0) {
        const newPhaseDuration = updatedProject.phaseDuration - 1;
        
        if (diagnosticsEnabled) {
          console.log(`⏱️ Phase timer for ${updatedProject.title}: ${updatedProject.phaseDuration} -> ${newPhaseDuration} (${updatedProject.currentPhase})`);
        }
        
        if (newPhaseDuration === 0) {
          const nextPhase = getNextPhase(updatedProject.currentPhase);
          
          // STOP auto-progression at post-production - stay in post-production until manual marketing
          if (updatedProject.currentPhase === 'post-production') {
            if (diagnosticsEnabled) {
              console.log(`  → POST-PRODUCTION COMPLETE: ${updatedProject.title} ready for marketing`);
            }
            updatedProject = {
              ...updatedProject,
              phaseDuration: 0,
              status: 'ready-for-marketing' as any,
              readyForMarketing: true
            };
            
            if (toastEnabled) {
              toast({
                title: "Post-Production Complete!",
                description: `${updatedProject.title} is ready for marketing campaign`,
              });
            }
          }
          // STOP auto-progression at marketing - only advance when campaign completes
          else if (updatedProject.currentPhase === 'marketing' && updatedProject.marketingCampaign && updatedProject.marketingCampaign.weeksRemaining === 0) {
            if (diagnosticsEnabled) {
              console.log(`  → MARKETING COMPLETE: ${updatedProject.title} ready for release`);
            }

            const hasScheduledRelease = !!updatedProject.scheduledReleaseWeek && !!updatedProject.scheduledReleaseYear;

            updatedProject = {
              ...updatedProject,
              currentPhase: 'release',
              phaseDuration: hasScheduledRelease ? -1 : 0,
              status: (hasScheduledRelease ? 'scheduled-for-release' : 'ready-for-release') as any,
              readyForRelease: !hasScheduledRelease
            };
            
            if (toastEnabled) {
              toast({
                title: "Marketing Campaign Complete!",
                description: hasScheduledRelease
                  ? `${updatedProject.title} is scheduled for release in Y${updatedProject.scheduledReleaseYear}W${updatedProject.scheduledReleaseWeek}.`
                  : `${updatedProject.title} is ready for release strategy`,
              });
            }
          }
          // Normal progression with gating for early phases
          else if (['development', 'pre-production', 'production'].includes(updatedProject.currentPhase)) {
            // Gate: ensure roles imported before leaving development
            if (updatedProject.currentPhase === 'development' && nextPhase === 'pre-production') {
              const roles = updatedProject.script?.characters && updatedProject.script.characters.length > 0
                ? updatedProject.script.characters
                : importRolesForScript(updatedProject.script!, baseState);
              if (!roles || roles.length === 0) {
                console.warn(`Cannot advance ${updatedProject.title}: no roles imported yet`);
                updatedProject = { ...updatedProject, phaseDuration: 2 };
                if (toastEnabled) {
                  toast({ title: 'Roles Required', description: `${updatedProject.title} needs characters imported before pre-production`, variant: 'destructive' });
                }
              } else {
                updatedProject = {
                  ...updatedProject,
                  script: { ...updatedProject.script!, characters: roles },
                  currentPhase: nextPhase,
                  phaseDuration: getPhaseWeeks(nextPhase),
                  status: nextPhase as any
                };
                if (toastEnabled) {
                  toast({ title: 'Phase Complete!', description: `${updatedProject.title} advanced to ${nextPhase.replace('-', ' ')}` });
                }
              }
            }
            // Gate: require Director + Lead actor before entering production
            else if (updatedProject.currentPhase === 'pre-production' && nextPhase === 'production') {
              const chars = updatedProject.script?.characters || [];
              const hasDirector = chars.some(c => c.requiredType === 'director' && c.assignedTalentId);
              const hasLead = chars.some(c => c.importance === 'lead' && c.requiredType !== 'director' && c.assignedTalentId);
              if (!hasDirector || !hasLead) {
                console.warn(`Cannot advance ${updatedProject.title}: missing mandatory cast (director=${hasDirector}, lead=${hasLead})`);
                updatedProject = { ...updatedProject, phaseDuration: 2 };
                if (toastEnabled) {
                  toast({ title: 'Cast Required', description: 'Attach a Director and Lead before production', variant: 'destructive' });
                }
              } else {
                updatedProject = {
                  ...updatedProject,
                  currentPhase: nextPhase,
                  phaseDuration: getPhaseWeeks(nextPhase),
                  status: nextPhase as any
                };
                if (toastEnabled) {
                  toast({ title: 'Phase Complete!', description: `${updatedProject.title} advanced to ${nextPhase.replace('-', ' ')}` });
                }
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
              if (toastEnabled) {
                toast({ title: 'Phase Complete!', description: `${updatedProject.title} advanced to ${nextPhase.replace('-', ' ')}` });
              }
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
    
    if (diagnosticsEnabled) {
      console.log(`=== WEEKLY PROJECT PROCESSING END ===`);
    }

    return {
      projects: results,
      studioRevenueDelta,
      releasedProjects,
    };
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
    console.log('SKIPPING TO POST-THEATRICAL TESTING MODE');
    
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

    mergeGameState({
      projects: [testProject, ...gameState.projects.slice(1)],
    });

    toast({
      title: "Skipped to Post-Theatrical Testing",
      description: "Test movie ready for post-theatrical distribution",
    });
  };

  // Process weekly costs, debt payments, and reputation changes
  const processWeeklyCosts = (currentState: GameState, projects: Project[], diagnosticsEnabled: boolean) => {
    const studio = { ...currentState.studio };
    
    // Calculate weekly operational costs (basic studio overhead)
    const baseOperationalCost = 25000; // $25k per week base cost (gentler)
    const projectCount = projects.filter(p => ['development', 'pre-production', 'production', 'post-production'].includes(p.status)).length;
    const operationalCost = baseOperationalCost + (projectCount * 10000); // $10k per active project
    
    if (diagnosticsEnabled) {
      console.log(`WEEKLY COSTS: Base ${baseOperationalCost.toLocaleString()} + Projects ${(projectCount * 10000).toLocaleString()}`);
    }
    
    // Calculate production phase costs (spread over full phase duration)
    let productionCosts = 0;
    projects.forEach(project => {
      if (project.currentPhase === 'production') {
        const weeklyProductionCost = project.budget.total * 0.7 / getPhaseWeeks('production'); // 70% of budget over production weeks
        productionCosts += weeklyProductionCost;
        if (diagnosticsEnabled) {
          console.log(`Production cost for ${project.title}: ${weeklyProductionCost.toLocaleString()}`);
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
      
      if (loanAmount > 0 && diagnosticsEnabled) {
        console.log(`Auto-loan: ${loanAmount.toLocaleString()}`);
      }
    }
    
    // Pay down debt automatically if budget is positive (5% of surplus goes to debt)
    if (studio.budget > 1000000 && studio.debt && studio.debt > 0) { // Only pay debt if budget > $1M
      const debtPayment = Math.min(studio.debt, studio.budget * 0.05);
      studio.debt -= debtPayment;
      studio.budget -= debtPayment;
      if (diagnosticsEnabled) {
        console.log(`Auto debt payment: ${debtPayment.toLocaleString()}. Remaining debt: ${studio.debt.toLocaleString()}`);
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
      if (reputationLoss > 0 && diagnosticsEnabled) {
        console.log(`Reputation declined by ${reputationLoss.toFixed(1)} (${studio.weeksSinceLastProject} weeks since last project)`);
      }
    }
    
    // Reputation changes from box office performance (check completed theatrical runs)
    projects.forEach(project => {
      if (project.status === 'released' && project.metrics?.boxOfficeTotal && project.metrics?.inTheaters === false) {
        const totalRevenue = project.metrics.boxOfficeTotal;
        const budget = project.budget.total;
        const profitMargin = (totalRevenue * 0.55) / budget; // Studio share vs budget
        
        if (diagnosticsEnabled) {
          console.log(`Checking reputation for ${project.title}: Profit margin ${(profitMargin * 100).toFixed(0)}%`);
        }
        
        if (profitMargin > 2.0) { // 200% return - huge success
          studio.reputation = Math.min(100, studio.reputation + 3);
          if (diagnosticsEnabled) {
            console.log(`Big reputation boost from blockbuster ${project.title} (${(profitMargin * 100).toFixed(0)}% return): ${studio.reputation}`);
          }
        } else if (profitMargin > 1.2) { // 120% return - solid hit
          studio.reputation = Math.min(100, studio.reputation + 1);
          if (diagnosticsEnabled) {
            console.log(`Reputation boost from successful ${project.title}: ${studio.reputation}`);
          }
        } else if (profitMargin < 0.3) { // Less than 30% return - bomb
          studio.reputation = Math.max(0, studio.reputation - 2);
          if (diagnosticsEnabled) {
            console.log(`Reputation hit from bomb ${project.title}: ${studio.reputation}`);
          }
        }
      }
    });
    
    if (diagnosticsEnabled) {
      console.log(`STUDIO STATUS: Budget: ${studio.budget.toLocaleString()}, Debt: ${(studio.debt || 0).toLocaleString()}, Reputation: ${studio.reputation.toFixed(1)}`);
    }
    
    return { studio };
  };

  const advanceWeekCore = (options?: { suppressToast?: boolean; suppressLoading?: boolean; suppressDiagnostics?: boolean; suppressRecap?: boolean }) => {
    const diagnosticsEnabled = import.meta.env.DEV && !options?.suppressDiagnostics;

    if (diagnosticsEnabled) {
      console.log(`ADVANCING WEEK: Current Y${gameState.currentYear}W${gameState.currentWeek}`);
      console.log(`Projects count: ${gameState.projects.length}`);
      gameState.projects.forEach((p, i) => {
        console.log(`   [${i}] ${p.title}: Phase=${p.currentPhase}, Status=${p.status}, PhaseDuration=${p.phaseDuration || 0}`);
      });
    }
    
    const toastEnabled = !options?.suppressToast;
    const loadingEnabled = !options?.suppressLoading;
    const recapEnabled = !options?.suppressRecap;

    if (loadingEnabled) {
      if (weeklyProcessingRef.current) return;
      weeklyProcessingRef.current = true;
      // Start weekly processing with loading
      startOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, LOADING_OPERATIONS.WEEKLY_PROCESSING.name, LOADING_OPERATIONS.WEEKLY_PROCESSING.estimatedTime);
      updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 5, 'Advancing time...');
    }

    const runTick = () => {
      setGameState((prev) => {
      const tickStart = performance.now();
      const startedAtIso = new Date().toISOString();

      const systems: TickSystemReport[] = [];
      const recap: TickRecapCard[] = [];

      const measure = <T,>(id: string, label: string, fn: () => T): T => {
        const start = performance.now();
        const result = fn();
        systems.push({ id, label, ms: performance.now() - start });
        return result;
      };

      const engineRng = createRng(prev.rngState ?? prev.universeSeed ?? 0);
      const engineSystems = gameRegistry.getOrdered();

      const engineTick = measure('engineTick', 'Engine tick (time + systems)', () =>
        engineAdvanceWeek(prev, engineRng, engineSystems, { debug: diagnosticsEnabled })
      );

      const baseAfterEngine = engineTick.nextState;

      // Hydrate singleton-style runtime systems from persisted game state before they run.
      if (!isOnlineMode) {
        AIStudioManager.hydrate(baseAfterEngine.aiStudioState);
      }
      MediaEngine.hydrate(baseAfterEngine.mediaState);
      MediaResponseSystem.hydrate(baseAfterEngine.mediaState);

      const newTimeState = {
        currentWeek: baseAfterEngine.currentWeek,
        currentYear: baseAfterEngine.currentYear,
        currentQuarter: baseAfterEngine.currentQuarter,
      };

      if (recapEnabled) {
        const isFallbackOnly =
          engineTick.recap.length === 1 &&
          engineTick.recap[0].type === 'system' &&
          engineTick.recap[0].title === 'Week advanced';
        if (!isFallbackOnly) recap.push(...engineTick.recap);
      }

      if (diagnosticsEnabled) {
        console.log(`NEW TIME STATE: Y${newTimeState.currentYear}W${newTimeState.currentWeek}`);
      }
      
      // Process AI studio timelines and potential new film starts
      if (!isOnlineMode) {
        measure('ai', 'AI studios', () => {
          AIStudioManager.processWeeklyAIFilms(newTimeState.currentWeek, newTimeState.currentYear, engineRng);

          if (baseAfterEngine.competitorStudios.length > 0) {
            const shouldStartAIFilm = (newTimeState.currentWeek % 4 === 1) || engineRng.chance(0.35);
            if (shouldStartAIFilm) {
              const randomStudio = engineRng.pick(baseAfterEngine.competitorStudios);
              if (randomStudio) {
                AIStudioManager.createAIFilm(
                  randomStudio,
                  newTimeState.currentWeek,
                  newTimeState.currentYear,
                  baseAfterEngine.talent.filter(t => t.contractStatus === 'available'),
                  engineRng
                );
              }
            }
          }
        });
      }
      
      let updatedProjects = baseAfterEngine.projects;

      // Process weekly financial events
      // NOTE: This must be synchronous inside the state transition; async imports would
      // run after this updater returns and would not be applied to the new state.
      measure('financeEvents', 'Financial events', () => {
        FinancialEngine.processWeeklyFinancialEvents(
          newTimeState.currentWeek,
          newTimeState.currentYear,
          [baseAfterEngine.studio],
          updatedProjects
        );
      });
      
      if (loadingEnabled) {
        updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 70, 'Calculating finances...');
      }
      
      const weeklyProjectEffects = measure('projects', 'Projects (phases/releases)', () =>
        processWeeklyProjectEffects(updatedProjects, newTimeState, prev, toastEnabled, diagnosticsEnabled)
      );
      updatedProjects = weeklyProjectEffects.projects;

      const financialAccuracy = measure('financialAccuracy', 'Financial recalculation', () =>
        applyEnhancedFinancialAccuracy(updatedProjects)
      );
      updatedProjects = financialAccuracy.projects;

      

      if (weeklyProjectEffects.releasedProjects.length > 0) {
        recap.push({
          type: 'release',
          title: `${weeklyProjectEffects.releasedProjects.length} release${weeklyProjectEffects.releasedProjects.length === 1 ? '' : 's'} this week`,
          body: weeklyProjectEffects.releasedProjects.map(p => `• ${p.title}`).join('\n'),
          severity: 'good',
        });
      }

      if (weeklyProjectEffects.studioRevenueDelta > 0) {
        recap.push({
          type: 'financial',
          title: 'Box office revenue',
          body: 'Studio share earned: \u0024' + Math.round(weeklyProjectEffects.studioRevenueDelta).toLocaleString(),
          severity: 'good',
        });
      }

      const newAIReleases: Project[] = [];

      if (loadingEnabled) {
        updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 90, 'Finalizing updates...');
      }

      if (!isOnlineMode) {
        // If the simulation has advanced into a year without a pre-generated competitor slate,
        // generate competitor releases incrementally (generating all 52 weeks in one tick can freeze the tab).
        const hasAiSlateForYear = prev.allReleases.some(
          (r): r is Project => 'script' in r && r.releaseYear === newTimeState.currentYear
        );

      const slateYear = newTimeState.currentYear;

      // If we have a partial slate (e.g., older saves), attempt to resume generation.
      const maxAiWeekForYear = prev.allReleases
        .filter((r): r is Project =>
          'script' in r &&
          (r as any).releaseYear === slateYear &&
          !!(r as any).releaseWeek &&
          !!(r as any).studioName &&
          (r as any).studioName !== prev.studio.name
        )
        .reduce((max, r) => Math.max(max, r.releaseWeek || 0), 0);

      if (
        prev.competitorStudios.length > 0 &&
        aiSlateGeneratorRef.current?.year !== slateYear &&
        (!hasAiSlateForYear || (maxAiWeekForYear > 0 && maxAiWeekForYear < 52))
      ) {
        aiSlateGeneratorRef.current = { year: slateYear, nextWeek: Math.max(1, maxAiWeekForYear + 1) };
      }

      const activeAiSlate = aiSlateGeneratorRef.current;

      if (activeAiSlate && activeAiSlate.year === slateYear && prev.competitorStudios.length > 0) {
        const sg = new StudioGenerator();
        const universeSeed = prev.universeSeed ?? 0;

        while (activeAiSlate.nextWeek <= Math.min(52, newTimeState.currentWeek)) {
          const w = activeAiSlate.nextWeek;
          activeAiSlate.nextWeek += 1;

          let releasesThisWeek = 0;

          for (const st of prev.competitorStudios) {
            const profile = sg.getStudioProfile(st.name);
            const rel = profile ? sg.generateDeterministicStudioRelease(profile, w, slateYear, universeSeed) : null;
            if (rel) {
              newAIReleases.push(attachBasicCastForAI(rel, baseAfterEngine.talent));
              releasesThisWeek += 1;
            }
          }

          if (releasesThisWeek === 0 && prev.competitorStudios[0]) {
            const fallback = sg.getStudioProfile(prev.competitorStudios[0].name);
            if (fallback) {
              const rel = sg.generateDeterministicStudioRelease(fallback, w, slateYear, universeSeed);
              const ensured = rel || sg.generateDeterministicIndieRelease(fallback, w, slateYear, universeSeed);
              newAIReleases.push(attachBasicCastForAI(ensured, baseAfterEngine.talent));
            }
          }
        }

        // Queue a single media story for one competitor release happening this week.
        const thisWeekRelease = newAIReleases.find(r => r.releaseWeek === newTimeState.currentWeek);
        if (thisWeekRelease) {
          const studio = prev.competitorStudios.find(s => s.name === thisWeekRelease.studioName) || prev.competitorStudios[0];

          MediaEngine.queueMediaEvent({
            type: 'release',
            triggerType: 'competitor_action',
            priority: 'low',
            entities: {
              studios: studio ? [studio.id] : undefined,
              projects: [thisWeekRelease.id],
              talent: (thisWeekRelease.cast || []).slice(0, 2).map(c => c.talentId)
            },
            eventData: { project: thisWeekRelease },
            week: newTimeState.currentWeek,
            year: slateYear
          });
        }

        if (diagnosticsEnabled && newAIReleases.length > 0) {
          console.log(`AI SLATE: Generated competitor releases for ${slateYear} (+${newAIReleases.length} this tick) (week ${newTimeState.currentWeek})`);
        }

        if (activeAiSlate.nextWeek > 52) {
          aiSlateGeneratorRef.current = null;
        }
      }
      }
      
      // Process weekly costs and reputation with deep system
      const weeklyResults = measure('weeklyCosts', 'Weekly costs & debt', () => processWeeklyCosts(baseAfterEngine, updatedProjects, diagnosticsEnabled));
      
      const competitorStudiosForWeek = isOnlineMode ? leagueCompetitorStudios : baseAfterEngine.competitorStudios;

      // Update industry context and calculate deep reputation
      const deepRepResult = measure('reputation', 'Reputation', () => {
        DeepReputationSystem.updateIndustryContext([...competitorStudiosForWeek, baseAfterEngine.studio], newTimeState);
        return DeepReputationSystem.calculateDeepReputation(
          weeklyResults.studio,
          updatedProjects,
          baseAfterEngine.talent,
          newTimeState,
          competitorStudiosForWeek
        );
      });
      
      if (diagnosticsEnabled) {
        console.log(`Weekly reputation update: ${prev.studio.reputation} -> ${weeklyResults.studio.reputation}`);
        console.log(`Deep reputation: Overall ${deepRepResult.reputation.toFixed(1)}`);
      }
      
      // Apply deep reputation to studio
      const enhancedStudio = {
        ...weeklyResults.studio,
        reputation: deepRepResult.reputation,
        budget: weeklyResults.studio.budget + weeklyProjectEffects.studioRevenueDelta
      };
      
      // Update talent availability (prevent double-booking during filming)
      const currentAbsWeek = (newTimeState.currentYear * 52) + newTimeState.currentWeek;
      let updatedTalent = (baseAfterEngine.talent || []).map(t => {
        let status = t.contractStatus;
        let busyUntil = t.busyUntilWeek;
        if (status === 'busy' && typeof busyUntil === 'number' && busyUntil <= currentAbsWeek) {
          status = 'available';
          busyUntil = undefined;
        }
        return { ...t, contractStatus: status, busyUntilWeek: busyUntil };
      });

      if (!isOnlineMode) {
        // Mark talent as busy if they're currently committed to an AI studio project
        updatedTalent = updatedTalent.map(t => {
          const commitment = AIStudioManager.getTalentCommitment(t.id, newTimeState.currentWeek, newTimeState.currentYear);
          if (!commitment) return t;

          const endAbsWeek = commitment.endAbsWeek;
          const existingBusyUntil = typeof t.busyUntilWeek === 'number' ? t.busyUntilWeek : 0;

          return {
            ...t,
            contractStatus: 'busy',
            busyUntilWeek: Math.max(existingBusyUntil, endAbsWeek)
          };
        });
      }

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

      // Apply filmography/fame updates for newly released projects (no nested setState)
      const releasedForFilmography = [
        ...weeklyProjectEffects.releasedProjects,
        ...newAIReleases.filter(r => r.status === 'released')
      ];

      if (releasedForFilmography.length > 0) {
        const beforeById = new Map(
          updatedTalent.map(t => [t.id, { filmographyCount: (t.filmography || []).length, fame: t.fame ?? 0 }] as const)
        );

        let filmographyState: GameState = { ...baseAfterEngine, talent: updatedTalent };
        for (const released of releasedForFilmography) {
          filmographyState = TalentFilmographyManager.updateFilmographyOnRelease(filmographyState, released);
        }
        updatedTalent = filmographyState.talent as typeof updatedTalent;

        const changes = updatedTalent
          .map(t => {
            const before = beforeById.get(t.id);
            if (!before) return null;
            const afterCount = (t.filmography || []).length;
            const deltaCredits = afterCount - before.filmographyCount;
            if (deltaCredits <= 0) return null;
            const fameAfter = t.fame ?? 0;
            const fameDelta = fameAfter - before.fame;
            return { name: t.name, deltaCredits, fameDelta };
          })
          .filter(Boolean) as Array<{ name: string; deltaCredits: number; fameDelta: number }>;

        if (recapEnabled && changes.length > 0) {
          const totalFameDelta = changes.reduce((sum, c) => sum + c.fameDelta, 0);
          const visible = changes.slice(0, 8);
          const remaining = changes.length - visible.length;

          recap.push({
            type: 'talent',
            title: `Filmographies updated (${changes.length} talent)`,
            body:
              visible
                .map(c => {
                  const fame = Number.isFinite(c.fameDelta) && Math.abs(c.fameDelta) > 0.01
                    ? `, Fame ${c.fameDelta > 0 ? '+' : ''}${c.fameDelta.toFixed(1)}`
                    : '';
                  const credits = c.deltaCredits === 1 ? '1 new credit' : `${c.deltaCredits} new credits`;
                  return `• ${c.name}: ${credits}${fame}`;
                })
                .join('\n') + (remaining > 0 ? `\n…and ${remaining} more` : ''),
            severity: totalFameDelta > 0.1 ? 'good' : totalFameDelta < -0.1 ? 'bad' : 'info',
          });
        }
      }

      // Memory management: prune old releases to prevent unbounded growth
      // Keep only releases from the last 3 in-game years (156 weeks) 
      const MAX_RELEASE_AGE_WEEKS = 156; // ~3 years
      const currentAbsoluteWeek = (newTimeState.currentYear * 52) + newTimeState.currentWeek;
      
      const playerReleases = updatedProjects.filter(
        (p) => p.status === 'released' && !!p.releaseWeek && !!p.releaseYear
      );

      const releasePool = [...baseAfterEngine.allReleases, ...newAIReleases, ...playerReleases];

      const dedupedReleases = dedupeReleasePoolPreferLatest(releasePool as any);

      const prunedReleases = dedupedReleases.filter((release) => {
        if (!('releaseWeek' in release) || !('releaseYear' in release)) return true;
        const releaseAbsWeek = ((release as Project).releaseYear! * 52) + (release as Project).releaseWeek!;
        return (currentAbsoluteWeek - releaseAbsWeek) <= MAX_RELEASE_AGE_WEEKS;
      });

      const sanitizedReleases = isOnlineMode
        ? prunedReleases.filter((release: any) => {
            const studioName = release?.studioName;
            if (!studioName) return true;
            return studioName === enhancedStudio.name;
          })
        : prunedReleases;

      const keepYears = 12;
      const minHistoryYear = newTimeState.currentYear - keepYears;

      // Also prune old box office history if it exists (align with WorldArchiveSystem).
      const prunedBoxOfficeHistory = (baseAfterEngine.boxOfficeHistory || []).filter((entry: any) => {
        if (!entry.year) return true;
        return entry.year >= minHistoryYear;
      });

      // Prune old top films history (align with WorldArchiveSystem).
      const prunedTopFilmsHistory = (baseAfterEngine.topFilmsHistory || []).filter((entry: any) => {
        if (!entry.year) return true;
        return entry.year >= minHistoryYear;
      });

      let newState = {
        ...baseAfterEngine,
        rngState: engineRng.state,
        currentWeek: newTimeState.currentWeek,
        currentYear: newTimeState.currentYear,
        currentQuarter: newTimeState.currentQuarter,
        projects: updatedProjects,
        studio: enhancedStudio,
        competitorStudios: competitorStudiosForWeek,
        allReleases: sanitizedReleases,
        aiStudioProjects: isOnlineMode
          ? []
          : sanitizedReleases.filter(
              (r): r is Project => 'script' in r && !!(r as any).studioName && (r as any).studioName !== enhancedStudio.name
            ),
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

      // Process media events and run system integration checks
      try {
        const triggeredEvents = MediaEngine.triggerAutomaticEvents(newState, prev);
        const newMediaItems = MediaEngine.processMediaEvents(newState);
        if ((newMediaItems.length > 0 || triggeredEvents.length > 0) && diagnosticsEnabled) {
          console.log(`MEDIA: Generated ${newMediaItems.length} articles, triggered ${triggeredEvents.length} events`);
        }

        // Apply financial side-effects from media coverage (lightweight integration)
        try {
          MediaFinancialIntegration.applyFinancialEffects(newState);
        } catch (e) {
          console.warn('Media financial integration error', e);
        }
      } catch (e) {
        console.warn('Media engine processing error', e);
      }

      // Apply media-driven reputation changes on top of deep reputation (in-place on newState)
      const repBeforeMedia = newState.studio.reputation;
      try {
        MediaReputationIntegration.processWeeklyReputationUpdates(newState);
      } catch (e) {
        console.warn('Media reputation integration error', e);
      }
      const repAfterMedia = newState.studio.reputation;

      if (recapEnabled) {
        const repDelta = repAfterMedia - prev.studio.reputation;
        if (Math.abs(repDelta) >= 0.05) {
          recap.push({
            type: 'market',
            title: 'Studio reputation updated',
            body: `Reputation ${prev.studio.reputation.toFixed(1)} → ${repAfterMedia.toFixed(1)} (${repDelta > 0 ? '+' : ''}${repDelta.toFixed(1)})`,
            severity: repDelta > 0.05 ? 'good' : repDelta < -0.05 ? 'bad' : 'info',
          });
        }

        const mediaDelta = repAfterMedia - repBeforeMedia;
        if (Math.abs(mediaDelta) >= 0.05) {
          recap.push({
            type: 'media',
            title: 'Media impact on reputation',
            body: `Media adjusted reputation ${mediaDelta > 0 ? '+' : ''}${mediaDelta.toFixed(1)} this week.`,
            severity: mediaDelta > 0.05 ? 'good' : mediaDelta < -0.05 ? 'bad' : 'info',
          });
        }
      }

      // Perform memory cleanup for static classes every 10 weeks
      if (newTimeState.currentWeek % 10 === 0) {
        CrisisManagement.performMaintenanceCleanup(newTimeState.currentWeek, newTimeState.currentYear);
        MediaRelationships.performMaintenanceCleanup(newTimeState.currentWeek, newTimeState.currentYear);
        FinancialEngine.performMemoryCleanup(newTimeState.currentWeek, newTimeState.currentYear);
      }

      if (diagnosticsEnabled) {
        SystemIntegration.runDiagnostics(newState);
      }

      // Persist singleton system state into GameState so save/load is stable.
      newState = {
        ...newState,
        aiStudioState: isOnlineMode
          ? { aiFilms: [], talentCommitments: [], nextFilmId: 1 }
          : AIStudioManager.snapshot(),
        mediaState: {
          engine: MediaEngine.snapshot(),
          response: MediaResponseSystem.snapshot(),
        },
      };

      // Post-tick persistence: schedule after the tick commits.
      pendingPostTickStateRef.current = newState;
      pendingPostTickPersistRef.current = true;

      // Tick report: store for the UI to show a "Week Recap".
      if (recapEnabled) {
        try {
          const finishedAtIso = new Date().toISOString();
          const totalMs = performance.now() - tickStart;
          const report = createTickReport({
            prev,
            next: newState,
            systems,
            recap,
            startedAtIso,
            finishedAtIso,
            totalMs,
          });

          pendingTickReportRef.current = report;
          pendingTickReportOpenRef.current = true;
        } catch (e) {
          console.warn('Failed to build tick report', e);
        }
      }

      if (!options?.suppressToast) {
        toast({
          title: "New Week",
          description: `Week ${newTimeState.currentWeek}, ${newTimeState.currentYear}`,
        });
      }

      // Complete the loading operation
      if (loadingEnabled) {
        updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 100, 'Finalizing...');
        requestAnimationFrame(() => {
          completeOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id);
          weeklyProcessingRef.current = false;
        });
      }

      return newState;
    });
    };

    // Defer the heavy tick work by one frame when showing the loading UI.
    // This allows the popup to render before the main-thread work begins.
    if (loadingEnabled) {
      requestAnimationFrame(runTick);
    } else {
      runTick();
    }
  };

  const onlineSyncBusyRef = useRef(false);
  const initialOnlineSyncRef = useRef(false);
  const initialOnlinePublishRef = useRef(false);
  const onlineSyncToastTurnRef = useRef<number | null>(null);

  // End-of-turn compilation baseline: used to compute what changed during the current turn
  // so we can submit a minimal intent list when the player readies up.
  const onlineTurnBaselineRef = useRef<ReturnType<typeof createOnlineLeagueTurnBaseline> | null>(null);
  const appliedOnlineResolutionTurnRef = useRef<number | null>(null);
  const onlineSelfUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOnlineMode) return;
    onlineTurnBaselineRef.current = createOnlineLeagueTurnBaseline(gameState);
  }, [isOnlineMode, gameState.currentWeek, gameState.currentYear]);

  const syncFromHostTurn = async (leagueId: string, turn: number) => {
    if (onlineSyncBusyRef.current) return;
    onlineSyncBusyRef.current = true;

    try {
      if (onlineSyncToastTurnRef.current !== turn) {
        onlineSyncToastTurnRef.current = turn;
        toast({
          title: 'Online League',
          description: `Syncing from host (turn ${turn})...`,
        });
      }

      const timeoutMs = 35_000;
      const startedAt = Date.now();

      while (Date.now() - startedAt < timeoutMs) {
        const snap = await fetchOnlineLeagueTurnSnapshot({ leagueId, turn });
        if (snap?.gameState) {
          const incoming = snap.gameState;

          const derivedUniverseSeed =
            typeof incoming.universeSeed === 'number'
              ? incoming.universeSeed
              : seedFromString(`${incoming.studio?.id ?? 'studio'}`);

          const derivedRngState = typeof incoming.rngState === 'number' ? incoming.rngState : derivedUniverseSeed;

          const seeded = {
            ...incoming,
            universeSeed: derivedUniverseSeed,
            rngState: derivedRngState,
            aiStudioState: incoming.aiStudioState ?? { aiFilms: [], talentCommitments: [], nextFilmId: 1 },
            mediaState:
              incoming.mediaState ??
              {
                engine: { history: [], memories: [], eventQueue: [] },
                response: { campaigns: [], reactions: [], nextCampaignId: 1 },
              },
          };

          loadGameToStore(seeded, seeded.rngState ?? seeded.universeSeed);
          return;
        }

        await delay(600);
      }

      toast({
        title: 'Online League',
        description: 'Timed out waiting for host state. Try again in a moment.',
        variant: 'destructive',
      });
    } catch (e) {
      console.warn('Online league sync failed', e);
      toast({
        title: 'Online League',
        description: 'Failed to sync from host.',
        variant: 'destructive',
      });
    } finally {
      onlineSyncBusyRef.current = false;
    }
  };

  const ensureOnlineTurnResolution = async (leagueId: string, turn: number, isHost: boolean) => {
    try {
      const existing = await fetchOnlineLeagueTurnResolution({ leagueId, turn });
      if (existing) return existing;

      if (!isHost) return null;

      const studioNameByUserId = await fetchOnlineLeagueMemberStudioNames({ leagueId });
      const readyOrderUserIds = await fetchOnlineLeagueReadyOrder({ leagueId, turn });
      const submissionsByUserId = await fetchOnlineLeagueTurnSubmissions({ leagueId, turn });

      const initiallyTakenTalentIds = new Set(
        (gameState.talent || []).filter((t) => t.contractStatus !== 'available').map((t) => t.id)
      );

      const resolution = resolveOnlineLeagueTalentConflicts({
        turn,
        readyOrderUserIds,
        submissionsByUserId,
        initiallyTakenTalentIds,
      });

      await upsertOnlineLeagueTurnResolution({ leagueId, turn, resolution });

      const messages: Array<{ userId: string; turn: number; title: string; body: string }> = [];

      for (const [loserUserId, talentIds] of Object.entries(resolution.rejectedTalentIdsByUserId || {})) {
        const submission = submissionsByUserId[loserUserId];

        for (const talentId of talentIds || []) {
          const winnerUserId = resolution.winnerUserIdByTalentId[talentId];
          const winnerName = (winnerUserId && studioNameByUserId[winnerUserId]) || 'another studio';
          const talentName = gameState.talent.find((t) => t.id === talentId)?.name || 'a rival star';

          const cmd = submission?.commands?.find((c) => c.type === 'SIGN_TALENT' && c.payload?.talentId === talentId);
          const projectTitle = cmd?.payload?.projectId
            ? submission?.state?.projects?.find((p) => p.id === cmd.payload.projectId)?.title
            : undefined;
          const role = cmd?.payload?.role;

          const roleLine = projectTitle
            ? `The ${role || 'role'} on “${projectTitle}” is now unfilled.`
            : 'You will need to line up a replacement.';

          messages.push({
            userId: loserUserId,
            turn,
            title: `${talentName} signed elsewhere`,
            body:
              `Your agent called before dawn: ${talentName} countersigned with ${winnerName} while your paperwork was still in transit.\n\n${roleLine}`,
          });
        }
      }

      await insertOnlineLeagueMessages({ leagueId, messages });

      return resolution;
    } catch (e) {
      console.warn('Online League: failed to resolve turn conflicts', e);
      return null;
    }
  };

  const applyOnlineTurnResolution = async (
    leagueId: string,
    turn: number,
    selfUserId: string | null,
    resolution?: ReturnType<typeof resolveOnlineLeagueTalentConflicts> | null
  ) => {
    if (appliedOnlineResolutionTurnRef.current === turn) return;

    let res = resolution ?? null;

    if (!res) {
      const timeoutMs = 12_000;
      const startedAt = Date.now();

      while (Date.now() - startedAt < timeoutMs) {
        try {
          const existing = await fetchOnlineLeagueTurnResolution({ leagueId, turn });
          if (existing) {
            res = existing;
            break;
          }
        } catch {
          // ignore and retry
        }

        await delay(400);
      }
    }

    if (!res) return;

    appliedOnlineResolutionTurnRef.current = turn;

    setGameState((prev) => {
      const applied = applyOnlineLeagueTalentResolution({ prev, selfUserId, resolution: res });
      return applied.next;
    });

    try {
      const messages = await fetchUnreadOnlineLeagueMessages({ leagueId });
      if (messages.length > 0) {
        const toShow = messages.slice(0, 3);
        toShow.forEach((m) => {
          toast({
            title: m.title,
            description: m.body,
          });
        });

        if (messages.length > toShow.length) {
          toast({
            title: 'More messages from your agents',
            description: `${messages.length - toShow.length} additional update${messages.length - toShow.length === 1 ? '' : 's'} in your inbox.`,
          });
        }

        await markOnlineLeagueMessagesRead({ messageIds: messages.map((m) => m.id) });
      }
    } catch (e) {
      console.warn('Online League: failed to fetch/ack messages', e);
    }
  };

  const onlineTickGate = useOnlineLeagueTickGate({
    enabled: !!onlineLeagueCode?.trim(),
    leagueCode: onlineLeagueCode ?? '',
    studioName: gameState.studio.name,
    seasonYears: onlineSeasonYears,
    onTurnAdvanced: (turn, info) => {
      void (async () => {
        const leagueId = info.leagueId;
        const selfUserId = onlineSelfUserIdRef.current;

        const resolution = await ensureOnlineTurnResolution(leagueId, turn, info.isHost);

        if (!info.isHost && onlineHostSync) {
          await syncFromHostTurn(leagueId, turn);
          return;
        }

        await applyOnlineTurnResolution(leagueId, turn, selfUserId, resolution);

        if (info.isHost) {
          pendingOnlineTurnPublishRef.current = { leagueId, turn };
        }

        advanceWeekCore({ suppressDiagnostics: true });
      })();
    },
  });

  useEffect(() => {
    onlineSelfUserIdRef.current = onlineTickGate.userId;
  }, [onlineTickGate.userId]);

  useEffect(() => {
    if (!onlineLeagueCode?.trim()) return;
    if (onlineTickGate.status !== 'ready') return;
    if (!onlineTickGate.leagueId) return;

    if (onlineTickGate.isHost) {
      if (initialOnlinePublishRef.current) return;
      if (!storeGameState) return;

      initialOnlinePublishRef.current = true;

      void upsertOnlineLeagueTurnSnapshot({
        leagueId: onlineTickGate.leagueId,
        turn: onlineTickGate.turn,
        snapshot: {
          gameState: storeGameState,
          meta: {
            savedAt: new Date().toISOString(),
            version: 'online-1',
          },
        },
      }).catch((e) => {
        console.warn('Failed to publish initial online league snapshot', e);
        initialOnlinePublishRef.current = false;
      });

      return;
    }

    if (!onlineHostSync) return;

    if (initialOnlineSyncRef.current) return;
    initialOnlineSyncRef.current = true;
    void syncFromHostTurn(onlineTickGate.leagueId, onlineTickGate.turn);
  }, [
    onlineLeagueCode,
    onlineTickGate.status,
    onlineTickGate.isHost,
    onlineTickGate.leagueId,
    onlineTickGate.turn,
    onlineHostSync,
    storeGameState,
  ]);

  const leagueCompetitorStudios = useMemo(() => {
    if (!isOnlineMode) return [] as Studio[];

    return onlineTickGate.remoteStudios.map((remote) => ({
      id: `league-${remote.userId}`,
      name: remote.studioName,
      reputation: remote.reputation,
      budget: 0,
      founded: 1965,
      specialties: ['drama'] as Genre[],
    }));
  }, [isOnlineMode, onlineTickGate.remoteStudios]);

  const leagueRoster = useMemo(() => {
    if (!isOnlineMode) return [] as Array<{ id: string; name: string; reputation: number; releasedTitles: number; week: number; year: number; updatedAt?: string; isYou: boolean }>;

    const you = {
      id: onlineTickGate.userId ?? gameState.studio.id,
      name: gameState.studio.name,
      reputation: gameState.studio.reputation,
      releasedTitles: gameState.projects.filter((p) => p.status === 'released').length,
      week: gameState.currentWeek,
      year: gameState.currentYear,
      updatedAt: new Date().toISOString(),
      isYou: true,
    };

    const others = (onlineTickGate.remoteStudios || []).map((s) => ({
      id: s.userId,
      name: s.studioName,
      reputation: s.reputation,
      releasedTitles: s.releasedTitles ?? 0,
      week: s.week ?? 0,
      year: s.year ?? 0,
      updatedAt: s.updatedAt,
      isYou: false,
    }));

    return [you, ...others].sort((a, b) => {
      if (b.reputation !== a.reputation) return b.reputation - a.reputation;
      if (b.releasedTitles !== a.releasedTitles) return b.releasedTitles - a.releasedTitles;
      return a.name.localeCompare(b.name);
    });
  }, [isOnlineMode, onlineTickGate.userId, onlineTickGate.remoteStudios, gameState.studio.id, gameState.studio.name, gameState.studio.reputation, gameState.projects, gameState.currentWeek, gameState.currentYear]);

  useEffect(() => {
    if (!isOnlineMode) return;
    if (onlineHostSync) return;
    if (onlineTickGate.status !== 'ready') return;
    if (!onlineTickGate.leagueId) return;

    const crownWeek =
      getAwardShowsForYear(gameState.currentYear).find((s) => s.id === 'crown' && s.medium === 'film')?.ceremonyWeek ?? 10;

    if (gameState.currentWeek !== crownWeek) return;

    const key = `${onlineTickGate.leagueId}|${gameState.currentYear}|${gameState.currentWeek}`;
    if (key === lastLeagueAwardsKeyRef.current) return;

    lastLeagueAwardsKeyRef.current = key;

    void (async () => {
      try {
        const snapshots = await fetchOnlineLeagueSnapshots({ leagueId: onlineTickGate.leagueId! });
        const ceremony = computeLeagueAwardsCeremony({
          year: gameState.currentYear,
          ceremonyName: 'League Crown',
          snapshots,
        });
        if (!ceremony) return;

        setLeagueAwardsCeremony(ceremony);
        setShowLeagueAwardsModal(true);
      } catch (e) {
        console.warn('Online League: failed to fetch league awards ceremony', e);
      }
    })();
  }, [
    isOnlineMode,
    onlineHostSync,
    onlineTickGate.status,
    onlineTickGate.leagueId,
    gameState.currentWeek,
    gameState.currentYear,
  ]);

  useEffect(() => {
    if (!isOnlineMode) return;

    // Online leagues should only contain player-controlled studios.
    AIStudioManager.resetAISystem();
    aiSlateGeneratorRef.current = null;

    const currentNames = (gameState.competitorStudios || []).map((s) => s.name).sort().join('|');
    const nextNames = leagueCompetitorStudios.map((s) => s.name).sort().join('|');

    const playerName = gameState.studio.name;
    const leagueNames = new Set<string>([playerName, ...leagueCompetitorStudios.map((s) => s.name)]);

    const existingReleases = gameState.allReleases || [];
    const filteredReleases = existingReleases.filter((r: any) => {
      const studioName = r?.studioName;
      if (!studioName) return true;
      return leagueNames.has(studioName);
    });

    const shouldUpdateCompetitors = currentNames !== nextNames;
    const shouldFilterReleases = filteredReleases.length !== existingReleases.length;
    const shouldClearAIProjects = (gameState.aiStudioProjects || []).length > 0;

    if (shouldUpdateCompetitors || shouldFilterReleases || shouldClearAIProjects) {
      mergeGameState({
        competitorStudios: leagueCompetitorStudios,
        allReleases: filteredReleases,
        aiStudioProjects: [],
      });
    }
  }, [
    isOnlineMode,
    leagueCompetitorStudios,
    gameState.studio.name,
    gameState.competitorStudios,
    gameState.allReleases,
    gameState.aiStudioProjects,
    mergeGameState,
  ]);

  // Online League (multi-studio): pull lightweight release details from all member submissions,
  // and merge them into the shared "world" release feed.
  useEffect(() => {
    if (!isOnlineMode) return;
    if (onlineHostSync) return;
    if (onlineTickGate.status !== 'ready') return;
    if (!onlineTickGate.leagueId) return;

    const leagueId = onlineTickGate.leagueId;
    const turn = onlineTickGate.turn;

    void (async () => {
      try {
        const submissionsByUserId = await fetchOnlineLeagueTurnSubmissions({ leagueId, turn });

        const selfUserId = onlineTickGate.userId;

        const incoming = Object.entries(submissionsByUserId || {})
          .filter(([userId]) => userId && userId !== selfUserId)
          .flatMap(([userId, sub]) => {
            const released = sub?.state?.releasedProjects || [];
            return released.map((snapshot) => ({ leagueUserId: userId, snapshot }));
          })
          .filter((entry): entry is { leagueUserId: string; snapshot: LeagueReleasedProjectSnapshot } => {
            if (!entry) return false;
            if (typeof entry.leagueUserId !== 'string' || !entry.leagueUserId) return false;
            const s = entry.snapshot as any;
            return !!s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.studioName === 'string';
          });

        if (incoming.length === 0) return;

        setGameState((prev) => {
          const existing = prev.allReleases || [];
          const merged = mergeLeagueReleaseSnapshotsIntoAllReleases({
            prevAllReleases: existing,
            incoming,
            localStudioName: prev.studio.name,
          });

          if (merged.length === existing.length && merged.every((v, i) => v === existing[i])) return prev;

          return { ...prev, allReleases: merged };
        });
      } catch (e) {
        console.warn('Online League: failed to merge shared releases', e);
      }
    })();
  }, [
    isOnlineMode,
    onlineHostSync,
    onlineTickGate.status,
    onlineTickGate.leagueId,
    onlineTickGate.turn,
    onlineTickGate.userId,
    setGameState,
  ]);

  const handleForceAdvanceWeek = () => {
    if (!onlineLeagueCode?.trim()) return;

    if (onlineTickGate.status !== 'ready') {
      toast({
        title: 'Online League',
        description: onlineTickGate.error || 'Connecting to the online league...',
        variant: 'destructive',
      });
      return;
    }

    if (onlineTickGate.seasonEnded) {
      toast({
        title: 'Online League',
        description: 'Season concluded. No further turns can be advanced.',
      });
      return;
    }

    if (!onlineTickGate.isHost) {
      toast({
        title: 'Online League',
        description: 'Only the host can force-advance the week.',
        variant: 'destructive',
      });
      return;
    }

    onlineTickGate.forceAdvance();

    toast({
      title: 'Online League',
      description: 'Force-advance requested (host).',
    });
  };

  const handleAdvanceWeek = async (options?: { suppressToast?: boolean; suppressLoading?: boolean; suppressDiagnostics?: boolean; suppressRecap?: boolean }) => {
    if (!onlineLeagueCode?.trim()) {
      advanceWeekCore(options);
      return;
    }

    if (onlineTickGate.status !== 'ready') {
      toast({
        title: 'Online League',
        description: onlineTickGate.error || 'Connecting to the online league...',
        variant: 'destructive',
      });
      return;
    }

    if (!onlineTickGate.leagueId) {
      toast({
        title: 'Online League',
        description: 'League is still initializing. Try again in a moment.',
        variant: 'destructive',
      });
      return;
    }

    if (onlineTickGate.seasonEnded) {
      toast({
        title: 'Online League',
        description: 'Season concluded. No further turns can be advanced.',
      });
      return;
    }

    const nextReady = !onlineTickGate.isReady;

    if (nextReady) {
      const submission = buildOnlineLeagueTurnSubmission({
        baseline: onlineTurnBaselineRef.current,
        current: gameState,
      });

      try {
        await upsertOnlineLeagueTurnSubmission({
          leagueId: onlineTickGate.leagueId,
          turn: onlineTickGate.turn + 1,
          submission,
        });
      } catch (e) {
        // If the player took no conflicting actions this turn, we can still mark them ready.
        // (The host conflict resolver treats missing submissions as "no actions".)
        if ((submission.commands || []).length === 0) {
          console.warn('Online League: failed to submit turn intents (empty submission)', e);
        } else {
          console.warn('Online League: failed to submit turn intents', e);
          toast({
            title: 'Online League',
            description: 'Failed to submit your turn actions. Try again.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    await onlineTickGate.setReady(nextReady);

    if (!options?.suppressToast) {
      toast({
        title: 'Online League',
        description: nextReady
          ? `Marked ready (${onlineTickGate.readyCount + 1}/${onlineTickGate.memberCount || '...'}). Waiting for others…`
          : 'Not ready.',
      });
    }
  };

  const handleAdvanceWeeks = (weeks: number) => {
    if (onlineLeagueCode?.trim()) {
      toast({
        title: 'Online League',
        description: 'Skipping multiple weeks at once is disabled in Online League mode.',
        variant: 'destructive',
      });
      return;
    }

    const totalWeeks = Math.floor(weeks);
    if (!Number.isFinite(totalWeeks) || totalWeeks <= 0) return;

    const startWeek = gameState.currentWeek;
    const startYear = gameState.currentYear;

    const startAbs = (startYear * 52) + (startWeek - 1);
    const targetAbs = startAbs + totalWeeks;
    const targetYear = Math.floor(targetAbs / 52);
    const targetWeek = (targetAbs % 52) + 1;

    if (weeklyProcessingRef.current) return;
    weeklyProcessingRef.current = true;
    startOperation(
      LOADING_OPERATIONS.WEEKLY_PROCESSING.id,
      `Advancing ${totalWeeks} weeks`,
      LOADING_OPERATIONS.WEEKLY_PROCESSING.estimatedTime
    );
    updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 0, 'Starting time skip...');

    // Use requestAnimationFrame for smoother batch processing
    // and prevent setTimeout stacking that can overwhelm the browser
    let remaining = totalWeeks;
    let isProcessing = false;

    const step = () => {
      if (remaining <= 0 || isProcessing) return;

      isProcessing = true;

      advanceWeekCore({ suppressToast: true, suppressLoading: true, suppressDiagnostics: true, suppressRecap: true });
      remaining -= 1;

      const completed = totalWeeks - remaining;
      updateOperation(
        LOADING_OPERATIONS.WEEKLY_PROCESSING.id,
        Math.round((completed / totalWeeks) * 100),
        `Advancing time... (${completed}/${totalWeeks})`
      );

      // Use requestAnimationFrame to yield to the browser between weeks
      // This prevents UI freezing and allows garbage collection
      if (remaining > 0) {
        requestAnimationFrame(() => {
          isProcessing = false;
          // Add small delay to let React state settle
          setTimeout(step, 25);
        });
      } else {
        isProcessing = false;
        requestAnimationFrame(() => {
          completeOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id);
          weeklyProcessingRef.current = false;
        });
        toast({
          title: 'Time Advanced',
          description: `Advanced ${totalWeeks} weeks → Week ${targetWeek}, ${targetYear}`,
        });
      }
    };

    requestAnimationFrame(step);
  };

  const handleAdvanceToDate = (targetWeek: number, targetYear: number) => {
    if (onlineLeagueCode?.trim()) {
      toast({
        title: 'Online League',
        description: 'Skipping ahead is disabled in Online League mode.',
        variant: 'destructive',
      });
      return;
    }
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

  const isBootstrappingNewGame = !storeGameState && !initialGameState;

  return isBootstrappingNewGame ? (
    <div className="min-h-screen bg-background font-studio flex items-center justify-center text-sm text-muted-foreground">
      Initializing game...
    </div>
  ) : (
    <>
      <WeekRecapModal
        open={showWeekRecap && !showAwardModal}
        onOpenChange={setShowWeekRecap}
        report={lastTickReport}
      />
      <InboxDialog
        open={inboxOpen}
        onOpenChange={setInboxOpen}
        gameState={gameState}
        isOnlineMode={isOnlineMode}
        leagueId={onlineTickGate.leagueId}
      />
      <SaveLoadDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        mode={isOnlineMode ? 'online' : 'single'}
        currentGameState={gameState}
        currentPhase={currentPhase}
        unlockedAchievementIds={achievements.getUnlockedAchievements().map((a) => a.id)}
        onLoaded={() => {
          if (typeof window !== 'undefined') {
            setAutoLoadTarget(getActiveSaveSlotId());
            window.location.reload();
          }
        }}
      />
      <GameSettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />
      <div className="min-h-screen bg-background font-studio relative">
      <PremiumBackground variant="game" />
      <div className="relative z-10">
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
      <EnhancedFinancialAccuracy />

      {/* Studio Header */}
      <div className="border-b border-border/50 card-premium backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg shadow-golden animate-glow">
                  {gameConfig?.studioIcon ? (
                    <StudioIconRendererLazy config={gameConfig.studioIcon} size={32} />
                  ) : (
                    <div className="p-0.5 bg-gradient-golden rounded-md">
                      <ClapperboardIcon className="text-primary-foreground" size={24} />
                    </div>
                  )}
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
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
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
              
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
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
                  Skip to Post-Theatrical Test
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
                variant="outline"
                className="mr-2"
                onClick={() => setSaveDialogOpen(true)}
              >
                Saves…
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="mr-2"
                onClick={() => setSettingsDialogOpen(true)}
              >
                <Settings2 className="mr-2" size={16} />
                Settings
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="mr-2"
                disabled={!lastTickReport}
                onClick={() => setShowWeekRecap(true)}
              >
                Week Recap
              </Button>
              
              <Button 
                size="sm" 
                onClick={() => handleAdvanceWeek({ suppressDiagnostics: true })}
                disabled={!!onlineLeagueCode?.trim() && onlineTickGate.seasonEnded}
                className="btn-studio shadow-golden hover:animate-glow transition-all duration-300"
              >
                <BudgetIcon className="mr-2" size={16} />
                {onlineLeagueCode?.trim()
                  ? onlineTickGate.seasonEnded
                    ? 'Season Complete'
                    : onlineTickGate.isReady
                      ? `Unready (${onlineTickGate.readyCount}/${onlineTickGate.memberCount || '?'})`
                      : `Ready (${onlineTickGate.readyCount}/${onlineTickGate.memberCount || '?'})`
                  : 'Advance Week'}
              </Button>

              {onlineLeagueCode?.trim() && onlineTickGate.isHost && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForceAdvanceWeek}
                  className="mr-2"
                >
                  Force Advance
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <NextActionsBar
        gameState={gameState}
        onNavigate={(phase, projectId) => {
          handlePhaseChange(phase);
          if (projectId) setSelectedProjectId(projectId);
        }}
        onOpenInbox={() => setInboxOpen(true)}
      />

      {/* Debug Tools (development only) */}
      {import.meta.env.DEV && (
        <div className="border-b border-border/30 bg-background/80">
          <div className="container mx-auto px-6 py-3">
            <DebugControlPanel
              onAdvanceWeeks={handleAdvanceWeeks}
              onAdvanceToDate={handleAdvanceToDate}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="border-b border-border/30 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {/* Core Navigation */}
            {[
              { id: 'dashboard', label: 'Dashboard', IconComponent: StudioIcon },
              { id: 'scripts', label: 'Scripts', IconComponent: ScriptIcon },
              { id: 'casting', label: 'Casting & Crew', IconComponent: CastingIcon },
              { id: 'production', label: 'Production', IconComponent: ProductionIcon },
              { id: 'marketing', label: 'Marketing', IconComponent: MarketingIcon },
              { id: 'distribution', label: 'Distribution', IconComponent: DistributionIcon },
              { id: 'finance', label: 'Finance', IconComponent: BudgetIcon },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={`rounded-none border-b-2 px-3 py-3 text-sm font-medium transition-all duration-300 ${
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
                  className={`rounded-none border-b-2 px-3 py-3 text-sm font-medium transition-all duration-300 border-transparent hover:border-primary/40 hover:bg-primary/5 btn-ghost-premium ${
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
                  {onlineLeagueCode ? 'League Standings' : 'AI Competition'}
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
                  className={`rounded-none border-b-2 px-3 py-3 text-sm font-medium transition-all duration-300 border-transparent hover:border-primary/40 hover:bg-primary/5 btn-ghost-premium ${
                     ['franchise', 'media', 'metaboxd', ...(onlineLeagueCode ? ['online'] : []), 'talent', 'database', 'awards', 'reputation', 'lore', 'circle'].includes(currentPhase)
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
                <DropdownMenuItem onClick={() => handlePhaseChange('metaboxd')}>
                  <ClapperboardIcon className="mr-2" size={16} />
                  Metaboxd Reviews
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePhaseChange('circle')}>
                  <ReputationIcon className="mr-2" size={16} />
                  Inner Circle
                </DropdownMenuItem>
                {onlineLeagueCode && (
                  <DropdownMenuItem onClick={() => handlePhaseChange('online')}>
                    <BarChartIcon className="mr-2" size={16} />
                    Online League (Beta)
                  </DropdownMenuItem>
                )}
                 <DropdownMenuItem onClick={() => handlePhaseChange('talent')}>
                   <CastingIcon className="mr-2" size={16} />
                   Talent Management
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => handlePhaseChange('database')}>
                   <BarChartIcon className="mr-2" size={16} />
                   Industry Databases
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => handlePhaseChange('television')}>
                   <BarChartIcon className="mr-2" size={16} />
                   Television & Streaming
                 </DropdownMenuItem>
                 {import.meta.env.DEV && (
                   <DropdownMenuItem onClick={() => handlePhaseChange('tv-tests')}>
                     <BarChartIcon className="mr-2" size={16} />
                     TV System Tests
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
                 <DropdownMenuItem onClick={() => handlePhaseChange('lore')}>
                   <ClapperboardIcon className="mr-2" size={16} />
                   Encyclopedia
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 animate-slide-up">
        {currentPhase === 'dashboard' && (
          <div className="space-y-6">
            {isOnlineMode && (
              <Card className="card-premium">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold">League roster</div>
                      <div className="text-xs text-muted-foreground">
                        {onlineTickGate.leagueCode} • Ready {onlineTickGate.readyCount}/{onlineTickGate.memberCount || '?'}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handlePhaseChange('competition')}>
                      Open leaderboard
                    </Button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {onlineTickGate.status !== 'ready' ? (
                      <div className="text-sm text-muted-foreground">
                        {onlineTickGate.error || 'Connecting to the league…'}
                      </div>
                    ) : (
                      <>
                        {leagueRoster.slice(0, 6).map((s, idx) => (
                          <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                            <div>
                              <div className="text-sm font-medium">{idx + 1}. {s.name}{s.isYou ? ' (You)' : ''}</div>
                              <div className="text-xs text-muted-foreground">
                                {s.year && s.week ? `Week ${s.week}, ${s.year}` : 'Progress unknown'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm">Rep {Math.round(s.reputation)}/100</div>
                              <div className="text-xs text-muted-foreground">
                                {s.releasedTitles} released
                              </div>
                            </div>
                          </div>
                        ))}

                        {leagueRoster.length === 0 && (
                          <div className="text-sm text-muted-foreground">
                            Waiting for league members…
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <StudioDashboard />
          </div>
        )}
        
        {currentPhase === 'franchise' && (
          <div className="space-y-6">
            <OwnedFranchiseManager
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

                upsertScript(finalized);

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
            <EnhancedFranchiseSystem />
            <FranchiseProjectCreator
              onProjectCreate={(script) => {
                const finalized = finalizeScriptForSave(script, gameState);

                setSelectedFranchise(finalized.franchiseId || null);
                setSelectedPublicDomain(finalized.publicDomainId || null);

                const isTVScript =
                  finalized.characteristics?.pacing === 'episodic' ||
                  (finalized.estimatedRuntime && finalized.estimatedRuntime <= 60);

                // Route to the appropriate development workspace
                handlePhaseChange(isTVScript ? 'television' : 'scripts');

                upsertScript(finalized);
                toast({
                  title: 'Script Draft Created',
                  description: isTVScript
                    ? `"${finalized.title}" is ready in TV Show Development to customize roles before greenlighting.`
                    : `"${finalized.title}" is ready in Script Development to customize roles before greenlighting.`,
                });
              }}
            />
            <FranchiseManager
              onCreateProject={(franchiseId, publicDomainId, cost) => {
                // Use existing handleCreateProject logic but adapted for the new interface
                if (cost && cost > gameState.studio.budget) {
                  toast({
                    title: "Insufficient Budget",
                    description: `Cannot afford this franchise - need ${(cost / 1000000).toFixed(1)}M`,
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
                  updateBudget(-cost);
                  
                  toast({
                    title: "Franchise Acquired!",
                    description: `Spent ${(cost / 1000000).toFixed(1)}M to license franchise`,
                  });
                }

                // Route to Script Development instead of directly greenlighting
                setSelectedFranchise(franchiseId || null);
                setSelectedPublicDomain(publicDomainId || null);
                handlePhaseChange('scripts');
                upsertScript(finalized);

                toast({
                  title: "Script Draft Created",
                  description: `"${finalized.title}" is ready in Script Development to customize roles before greenlighting.`,
                });
              }}
            />
            <SequelManagementComponent
              onProjectCreate={(script) => {
                // Route sequel scripts to Script Development for refinement instead of instant project creation
                setSelectedFranchise(script.franchiseId || null);
                setSelectedPublicDomain(null);
                handlePhaseChange('scripts');

                upsertScript(script);

                toast({
                  title: 'Sequel Script Created',
                  description: `"${script.title}" has been added to Script Development. Refine it to "final" stage before greenlighting.`,
                });
              }}
              onCreateFranchise={handleCreateFranchise}
            />
          </div>
        )}
        
        {currentPhase === 'scripts' && (
          <ScriptDevelopment
            selectedFranchise={selectedFranchise}
            selectedPublicDomain={selectedPublicDomain}
            onProjectCreate={handleProjectCreate}
          />
        )}
        
        {currentPhase === 'casting' && (
          <div className="space-y-6">
            <Tabs
              defaultValue={selectedProject ? "character-casting" : "casting-board"}
              className="space-y-4"
            >
              <TabsList>
                <TabsTrigger value="character-casting">Cast & Key Crew</TabsTrigger>
                <TabsTrigger value="role-based">Role-Based System</TabsTrigger>
                <TabsTrigger value="casting-board">Talent Marketplace</TabsTrigger>
              </TabsList>
              
              <TabsContent value="character-casting">
                {selectedProject ? (
                  <CharacterCastingSystem
                    project={selectedProject}
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
                  selectedProject={selectedProject}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {currentPhase === 'television' && (
          <ComprehensiveTelevisionSystem 
            selectedFranchise={selectedFranchise}
            selectedPublicDomain={selectedPublicDomain}
            onCreateTVProject={(script) => {
              // For now, assume a 13-episode season budget for TV series
              const episodes = 13;
              const seasonTotalBudget = script.budget * episodes;

              handleProjectCreate(script, {
                type: 'series',
                episodeCount: episodes,
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
          <TelevisionSystemTests />
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
                  <TabsTrigger value="test">Integration Test</TabsTrigger>
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
                  {React.createElement(React.lazy(() => import('./TopActorsPanel').then(m => ({ default: m.TopActorsPanel }))), {})}
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

        {currentPhase === 'database' && (
          <IndustryDatabasePanel slotId={getActiveSaveSlotId()} />
        )}
        
        {currentPhase === 'production' && (
          <ProductionManagement 
            selectedProject={selectedProject}
          />
        )}
        
        {currentPhase === 'marketing' && (
          selectedProject ? (
            <div className="space-y-6">
              <EnhancedMarketingSystem
                project={selectedProject}
              />

              {/* Film release planning entry point (reuses unified ReleaseStrategyModal) */}
              {selectedProject.type !== 'series' && selectedProject.type !== 'limited-series' && (
                <Card>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Release Planning</p>
                      <p className="text-xs text-muted-foreground">
                        Once marketing is in place, choose a release window (theatrical, festival, or direct-to-streaming).
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setFilmReleaseProject(selectedProject)}
                      disabled={
                        selectedProject.status !== 'completed' &&
                        selectedProject.status !== 'ready-for-release' &&
                        selectedProject.status !== 'ready-for-marketing' &&
                        selectedProject.status !== 'marketing' &&
                        selectedProject.currentPhase !== 'marketing' &&
                        selectedProject.currentPhase !== 'release'
                      }
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
                  .catch(() => import('./MediaNotifications').then(m => ({ default: m.MediaNotifications as any })))
                ), {})}
              </TabsContent>
              
              <TabsContent value="responses">
                {React.createElement(React.lazy(() => 
                  import('./MediaResponseDashboard').then(m => ({ default: m.MediaResponseDashboard }))
                  .catch(() => ({ default: () => <div className="text-center py-8 text-muted-foreground">Media Response Dashboard loading...</div> }))
                ), {})}
              </TabsContent>
              
              <TabsContent value="analytics">
                <MediaAnalyticsPanel />
              </TabsContent>
            </Tabs>
          </Suspense>
        )}

        {currentPhase === 'circle' && (
          <PlayerCirclePanel />
        )}
        
        {currentPhase === 'distribution' && (
          <StreamingHub />
        )}
        
        {currentPhase === 'finance' && (
          <FinancialDashboard />
        )}
        
        {currentPhase === 'competition' && (
          isOnlineMode ? <LeagueStandings tickGate={onlineTickGate} /> : <CompetitorMonitor />
        )}
        
        {currentPhase === 'awards' && (
          <Tabs defaultValue="core" className="space-y-4">
            <TabsList>
              <TabsTrigger value="core">Awards Campaigns</TabsTrigger>
              <TabsTrigger value="season">Awards Season Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="core">
              <AwardsSystem />
            </TabsContent>

            <TabsContent value="season">
              <AwardsSeasonAnalyticsPanel />
            </TabsContent>
          </Tabs>
        )}
        
        {currentPhase === 'market' && (
          <MarketCompetition />
        )}
        
        {currentPhase === 'topfilms' && (
          <TopFilmsChart />
        )}
        
        {currentPhase === 'stats' && (
          <div className="space-y-6">
            <PerformanceMetrics />
            <BackgroundSimulationComponent />
            {import.meta.env.DEV && (
              <IntegrationMonitor />
            )}
          </div>
        )}
        
        {currentPhase === 'reputation' && (
          <div className="space-y-6">
            <DeepReputationPanel />

            <AchievementsPanel
              achievements={achievements.achievements}
              unlockedCount={achievements.getUnlockedAchievements().length}
              totalCount={achievements.achievements.length}
            />
          </div>
        )}
        
{currentPhase === 'loans' && (
  <EnhancedLoanSystem />
)}

{currentPhase === 'lore' && (
          <LoreHub />
        )}

        {currentPhase === 'metaboxd' && (
          <div className="-mx-6 -my-8">
            <Metaboxd />
          </div>
        )}

        {currentPhase === 'online' && onlineLeagueCode && (
          <OnlineLeague initialLeagueCode={onlineLeagueCode} />
        )}
      </div>

      <GameEventModal />

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

      {/* Online League: shared League Awards ceremony */}
      {leagueAwardsCeremony && (
        <LeagueAwardsCeremonyModal
          isOpen={showLeagueAwardsModal}
          onClose={() => {
            setShowLeagueAwardsModal(false);
            setLeagueAwardsCeremony(null);
          }}
          onSkip={() => {
            setShowLeagueAwardsModal(false);
            setLeagueAwardsCeremony(null);
          }}
          ceremony={leagueAwardsCeremony}
        />
      )}

      <TalentProfileDialog />
      </div>
    </div>
    </>
  );
};
