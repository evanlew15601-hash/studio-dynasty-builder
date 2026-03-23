import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import type { GameState, Studio, Project, Script, TalentPerson, Genre, MarketingStrategy, ReleaseStrategy, ProductionPhase, PostTheatricalRelease } from '@/types/game';
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

import { StudioDashboard } from './StudioDashboard';
import { FinancialDashboard } from './FinancialDashboard';
import { IntegrationMonitor } from './IntegrationMonitor';
import { AIStudioManager } from './AIStudioManager';
import { CompetitorMonitor } from './CompetitorMonitor';
import { LeagueStandings } from './LeagueStandings';
import { TimeSystem, TimeState } from './TimeSystem';
import { FinancialEngine } from './FinancialEngine';
import { updateProjectFinancials } from './FinancialCalculations';
import { TalentFilmographyManager } from '@/utils/talentFilmographyManager';
import { primeCompetitorTelevision } from '@/utils/televisionPatches';
import { attachBasicCastForAI } from '@/utils/attachBasicCastForAI';
import { stableInt } from '@/utils/stableRandom';
import { nextNumericId } from '@/utils/idAllocator';
import { triggerDateFromWeekYear } from '@/utils/gameTime';
import { isTvScript } from '@/utils/scriptMedium';
import { isPrimaryStreamingFilm } from '@/utils/projectMedium';
import { createRng, generateGameSeed, seedFromString } from '@/game/core/rng';
import { advanceWeek as engineAdvanceWeek } from '@/game/core/tick';
import { useUiStore } from '@/game/uiStore';
import { AwardsSystem } from './AwardsSystem';
import { AwardsSeasonAnalyticsPanel } from './AwardsSeasonAnalyticsPanel';
import { RoleBasedCasting } from './RoleBasedCasting';
import { CharacterCastingSystem } from './CharacterCastingSystem';

import { useOnlineLeagueTickGate } from '@/hooks/useOnlineLeagueTickGate';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import { fetchOnlineLeagueSnapshots } from '@/integrations/supabase/onlineLeagueSnapshots';
import { computeLeagueAwardsCeremony, type LeagueAwardsCeremony } from '@/utils/leagueAwards';
import { buildAwardShowCeremonyForModal } from '@/utils/awardsCeremony';
import { LeagueAwardsCeremonyModal } from './LeagueAwardsCeremonyModal';
import type { AwardShowCeremony } from '@/types/awardsShow';
import { IndividualAwardShowModal } from './IndividualAwardShowModal';
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

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { ChevronDown, Home, Settings2 } from 'lucide-react';
import { RoleDatabase } from '../../data/RoleDatabase';
import { importRolesForScript } from '@/utils/roleImport';
import { finalizeScriptForSave } from '@/utils/scriptFinalization';
import { MediaEngine } from './MediaEngine';

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

  /**
   * Return to the main menu (parent page decides how to unwind the running game).
   */
  onReturnToMainMenu?: () => void;
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
  onReturnToMainMenu,
}) => {
  const { toast } = useToast();
  const isOnlineMode = !!onlineLeagueCode?.trim();
  const ONLINE_LEAGUE_START_YEAR = 2026;
  const { startOperation, updateOperation, completeOperation } = useLoadingActions();
  const weeklyProcessingRef = useRef(false);
  
  
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

    const currentYear = isOnlineMode ? ONLINE_LEAGUE_START_YEAR : new Date().getUTCFullYear();
    const streamingWarsEnabled = gameConfig?.enableStreamingWars ?? true;

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

      const worldStartYear = isOnlineMode ? ONLINE_LEAGUE_START_YEAR : new Date().getUTCFullYear();

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
        const currentYear = worldStartYear;
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
          streamingWars: gameConfig?.enableStreamingWars ?? true,
        },
        platformMarket: (gameConfig?.enableStreamingWars ?? true)
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
  }, [
    completeOperation,
    gameConfig,
    initGame,
    initialGameState,
    isOnlineMode,
    newGameInitAttempt,
    startOperation,
    storeGameState,
    toast,
    updateOperation,
  ]);

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
  const [exitToMenuOpen, setExitToMenuOpen] = useState(false);

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

  const lastManualSaveAbsWeekRef = useRef<number | null>(null);
  const lastSaveReminderAbsWeekRef = useRef<number | null>(null);
  const [lastSavedAtIso, setLastSavedAtIso] = useState<string | null>(null);

  const handleSaveGame = useCallback(async (): Promise<boolean> => {
    try {
      const unlockedIds = achievements.getUnlockedAchievements().map(a => a.id);
      const slotId = getActiveSaveSlotId();

      await saveGameAsync(slotId, gameState, {
        currentPhase,
        unlockedAchievementIds: unlockedIds
      });

      lastManualSaveAbsWeekRef.current = (gameState.currentYear * 52) + gameState.currentWeek;
      lastSaveReminderAbsWeekRef.current = null;
      setLastSavedAtIso(new Date().toISOString());

      toast({
        title: 'Game Saved',
        description: `Saved to ${slotId}.`,
      });

      return true;
    } catch (error) {
      console.error('Failed to save game', error);
      toast({
        title: 'Save Failed',
        description: 'Unable to save your game. Check browser storage settings.',
        variant: 'destructive',
      });
      return false;
    }
  }, [achievements, currentPhase, gameState, toast]);

  // Post-tick: consume any tick report computed during the Advance Week reducer.
  // The week/year change is our "tick committed" signal.
  useEffect(() => {
    // Explicit post-tick persistence (industry DB, etc.)
    if (pendingPostTickPersistRef.current) {
      pendingPostTickPersistRef.current = false;

      // Persist a long-lived, cross-session industry catalog (films/TV/talent/awards/studios).
      // This is separate from the save-game snapshot and continues to accrue even if the in-memory
      // simulation prunes older releases for performance.
      //
      // Important: this can be CPU-heavy (large catalogs + JSON), so we push it off the critical path
      // of the week-advance UI by scheduling it in an idle callback.
      const persistIndustryDb = () => {
        try {
          syncAndPersistIndustryDatabase(getActiveSaveSlotId(), gameState);
        } catch (e) {
          console.warn('Failed to persist industry database', e);
        }
      };

      const ric = (globalThis as any).requestIdleCallback as ((cb: () => void, opts?: { timeout: number }) => number) | undefined;
      if (typeof ric === 'function') {
        ric(persistIndustryDb, { timeout: 2000 });
      } else {
        setTimeout(persistIndustryDb, 0);
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
    if (report) {
      pendingTickReportRef.current = null;
      setLastTickReport(report);

      if (pendingTickReportOpenRef.current) {
        setShowWeekRecap(true);
      }
      pendingTickReportOpenRef.current = false;
    }

    const currentAbsWeek = (gameState.currentYear * 52) + gameState.currentWeek;
    if (lastManualSaveAbsWeekRef.current === null) {
      lastManualSaveAbsWeekRef.current = currentAbsWeek;
    }

    const lastSaveAbsWeek = lastManualSaveAbsWeekRef.current ?? currentAbsWeek;
    const weeksSinceSave = currentAbsWeek - lastSaveAbsWeek;

    if (weeksSinceSave >= 4 && lastSaveReminderAbsWeekRef.current !== currentAbsWeek) {
      lastSaveReminderAbsWeekRef.current = currentAbsWeek;
      toast({
        title: 'Remember to save',
        description: `It’s been ${weeksSinceSave} weeks since your last save.`,
        action: (
          <ToastAction altText="Save Game" onClick={() => { void handleSaveGame(); }}>
            Save Game
          </ToastAction>
        ),
      });
    }
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

  const handlePhaseChange = (phase: string) => {
    setPhase(phase);
    onPhaseChange?.(phase);
  };

  // Central helper: build a base project from a script, then apply any overrides
  const createProjectFromScript = (script: Script, overrides?: Partial<Project>): Project => {
    const existingIds = [
      ...(gameState.projects || []).map((p) => p.id),
      ...((gameState.allReleases as any[]) || [])
        .map((r) => (r && typeof r === 'object' && typeof (r as any).id === 'string' ? (r as any).id : ''))
        .filter(Boolean),
    ];

    const projectId = nextNumericId('project', existingIds);
    const timelineStart = triggerDateFromWeekYear(gameState.currentYear, gameState.currentWeek);
    const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

    const baseProject: Project = {
      id: projectId,
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
          start: timelineStart,
          end: addDays(timelineStart, 90)
        },
        principalPhotography: {
          start: addDays(timelineStart, 90),
          end: addDays(timelineStart, 150)
        },
        postProduction: {
          start: addDays(timelineStart, 150),
          end: addDays(timelineStart, 240)
        },
        release: addDays(timelineStart, 365),
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
        id: nextNumericId(
          'campaign',
          gameState.projects.flatMap((p) => (p.marketingCampaign?.id ? [p.marketingCampaign.id] : []))
        ),
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
      
      const updatedProject = { ...project };

      // If the deterministic engine tick advanced a scheduled theatrical release, treat it as a release
      // for UI-side recap/media/filmography processing.
      const prevProject = baseState.projects.find((p) => p.id === project.id);
      const engineReleasedThisWeek =
        prevProject?.status !== 'released' &&
        project.status === 'released' &&
        project.releaseWeek === timeState.currentWeek &&
        project.releaseYear === timeState.currentYear;

      if (engineReleasedThisWeek) {
        releasedProjects.push(project);
      }

      // Development progress + phase timers are processed by the deterministic engine tick.
      
      // Scheduled releases are handled by the deterministic engine tick (ScheduledReleaseSystem).
      
      // Process box office for released films
       if (updatedProject.status === 'released') {
         if (project.type === 'series' || project.type === 'limited-series') {
           // TV episode scheduling + ratings are handled by the deterministic engine tick.
         } else if (isPrimaryStreamingFilm(updatedProject)) {
           // Streaming view metrics are handled by the deterministic engine tick.
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
               currentWeeksSinceRelease === expectedWeeksSinceRelease && updatedProject.metrics?.theatricalRunLocked !== true
                 ? (updatedProject.metrics?.lastWeeklyRevenue || 0)
                 : 0;

             if (diagnosticsEnabled) {
               console.log(`    WEEKLY BOX OFFICE (ENGINE): ${weeklyBoxOfficeRevenue.toLocaleString()}`);
             }

             if (weeklyBoxOfficeRevenue > 0) {
               const alreadyRecorded = FinancialEngine.hasFilmTransaction(
                 updatedProject.id,
                 'revenue',
                 'boxoffice',
                 timeState.currentWeek,
                 timeState.currentYear
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

      // Marketing campaign countdown + completion are processed by the deterministic engine tick.

      // Post-theatrical revenue is processed by the deterministic engine tick.
      // Here we only compute the delta for the studio budget + ledger.
      if (updatedProject.postTheatricalReleases && updatedProject.postTheatricalReleases.length > 0) {
        const prevProjectState = baseState.projects.find((p) => p.id === updatedProject.id);
        const prevById = new Map<string, number>();
        for (const r of prevProjectState?.postTheatricalReleases || []) {
          prevById.set(r.id, Math.round((r as any)?.revenue || 0));
        }

        const earnedByPlatform: Partial<Record<PostTheatricalRelease['platform'], number>> = {};

        for (const r of updatedProject.postTheatricalReleases) {
          if (!r) continue;
          if (r.lastProcessedWeek !== timeState.currentWeek || r.lastProcessedYear !== timeState.currentYear) continue;

          const prevRevenue = prevById.get(r.id) || 0;
          const nextRevenue = Math.round((r as any)?.revenue || 0);
          const delta = nextRevenue - prevRevenue;
          if (delta <= 0) continue;

          earnedByPlatform[r.platform] = (earnedByPlatform[r.platform] || 0) + delta;
        }

        const revenueDelta = Object.values(earnedByPlatform).reduce((sum, v) => sum + (v || 0), 0);

        if (revenueDelta > 0) {
          if (diagnosticsEnabled) {
            console.log(`      TOTAL WEEKLY POST-THEATRICAL (ENGINE): +${revenueDelta.toLocaleString()}`);
          }

          studioRevenueDelta += revenueDelta;

          (Object.entries(earnedByPlatform) as Array<[PostTheatricalRelease['platform'], number]>).forEach(([platform, amount]) => {
              if (!amount || amount <= 0) return;

              const category = platform === 'streaming' ? 'streaming' : 'licensing';
              const description = `Post-theatrical - ${platform}`;

              const alreadyRecorded = FinancialEngine.hasFilmTransaction(
                updatedProject.id,
                'revenue',
                category,
                timeState.currentWeek,
                timeState.currentYear,
                description
              );

              if (!alreadyRecorded) {
                FinancialEngine.recordTransaction(
                  'revenue',
                  category,
                  amount,
                  timeState.currentWeek,
                  timeState.currentYear,
                  description,
                  updatedProject.id
                );
              }
            }
          );
        }
      }

      // Phase timers + auto phase transitions are processed by the deterministic engine tick.

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

  

  // DEBUG: Quick test function to skip to post-theatrical phase
  const skipToPostTheatrical = () => {
    console.log('SKIPPING TO POST-THEATRICAL TESTING MODE');

    const now = new Date(Date.UTC(gameState.currentYear, 0, 1 + (Math.max(1, gameState.currentWeek) - 1) * 7));
    
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
          preProduction: { start: now, end: now },
          principalPhotography: { start: now, end: now },
          postProduction: { start: now, end: now },
          release: now,
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
      theatricalEndDate: now,
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

  

  const advanceWeekCore = (options?: { suppressToast?: boolean; suppressLoading?: boolean; suppressDiagnostics?: boolean; suppressRecap?: boolean }) => {
    const diagnosticsEnabled = import.meta.env.DEV && !options?.suppressDiagnostics;

    const pendingDecisions = (gameState.eventQueue || []).length;
    if (pendingDecisions > 0) {
      toast({
        title: 'Decisions pending',
        description: `Resolve ${pendingDecisions === 1 ? 'the open event' : `${pendingDecisions} open events`} before advancing the week.`,
        variant: 'destructive',
      });
      setInboxOpen(true);
      return;
    }

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

    const completeLoadingOverlay = () => {
      if (!loadingEnabled) {
        weeklyProcessingRef.current = false;
        return;
      }

      let completed = false;
      const complete = () => {
        if (completed) return;
        completed = true;
        completeOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id);
        weeklyProcessingRef.current = false;
      };

      // Some environments throttle/disable requestAnimationFrame; provide a timeout fallback.
      const raf = (globalThis as any).requestAnimationFrame as ((cb: () => void) => number) | undefined;
      if (typeof raf === 'function') raf(complete);
      setTimeout(complete, 0);
    };

    const failAdvanceWeek = (err: unknown) => {
      console.warn('Advance week failed', err);

      toast({
        title: 'Advance Week failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred during weekly processing.',
        variant: 'destructive',
      });

      if (loadingEnabled) {
        updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 100, 'Failed. See console for details.');
        completeLoadingOverlay();
      } else {
        weeklyProcessingRef.current = false;
      }
    };

    const runTick = () => {
      try {
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
      
      // AI studio film simulation is now handled by the deterministic engine tick.
      
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

      

      if (loadingEnabled) {
        updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 90, 'Finalizing updates...');
      }

      // Competitor theatrical releases are now generated inside the deterministic engine tick.

      const competitorStudiosForWeek = isOnlineMode ? leagueCompetitorStudios : baseAfterEngine.competitorStudios;

      // Studio reputation and talent availability are now handled by the deterministic engine tick.
      const enhancedStudio = baseAfterEngine.studio;
      const updatedTalent = baseAfterEngine.talent || [];

      

      // Memory management: prune old releases to prevent unbounded growth
      // Keep only releases from the last 3 in-game years (156 weeks) 
      const MAX_RELEASE_AGE_WEEKS = 156; // ~3 years
      const currentAbsoluteWeek = (newTimeState.currentYear * 52) + newTimeState.currentWeek;
      
      const playerReleases = updatedProjects.filter(
        (p) => p.status === 'released' && !!p.releaseWeek && !!p.releaseYear
      );

      const releasePool = [...baseAfterEngine.allReleases, ...playerReleases];

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
        completeLoadingOverlay();
      }

      return newState;
        });
      } catch (err) {
        failAdvanceWeek(err);
        if (!loadingEnabled) throw err;
      }
    };

    // Defer the heavy tick work by one frame when showing the loading UI.
    // This allows the popup to render before the main-thread work begins.
    //
    // Note: requestAnimationFrame can be throttled/paused in some embed contexts; add a timeout fallback.
    if (loadingEnabled) {
      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        runTick();
      };

      const raf = (globalThis as any).requestAnimationFrame as ((cb: () => void) => number) | undefined;
      if (typeof raf === 'function') raf(start);
      setTimeout(start, 0);
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
    const pendingDecisions = (gameState.eventQueue || []).length;
    if (pendingDecisions > 0) {
      toast({
        title: 'Decisions pending',
        description: `Resolve ${pendingDecisions === 1 ? 'the open event' : `${pendingDecisions} open events`} before advancing.`,
        variant: 'destructive',
      });
      setInboxOpen(true);
      return;
    }

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

      try {
        advanceWeekCore({ suppressToast: true, suppressLoading: true, suppressDiagnostics: true, suppressRecap: true });
        remaining -= 1;
      } catch (err) {
        console.warn('Time skip: weekly processing failed', err);
        remaining = 0;
        isProcessing = false;

        updateOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id, 100, 'Failed. See console for details.');
        const complete = () => {
          completeOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id);
          weeklyProcessingRef.current = false;
        };
        const raf = (globalThis as any).requestAnimationFrame as ((cb: () => void) => number) | undefined;
        if (typeof raf === 'function') raf(complete);
        setTimeout(complete, 0);

        toast({
          title: 'Time skip failed',
          description: err instanceof Error ? err.message : 'An unexpected error occurred during weekly processing.',
          variant: 'destructive',
        });
        return;
      }

      const completed = totalWeeks - remaining;
      updateOperation(
        LOADING_OPERATIONS.WEEKLY_PROCESSING.id,
        Math.round((completed / totalWeeks) * 100),
        `Advancing time... (${completed}/${totalWeeks})`
      );

      // Use requestAnimationFrame to yield to the browser between weeks
      // This prevents UI freezing and allows garbage collection
      if (remaining > 0) {
        const raf = (globalThis as any).requestAnimationFrame as ((cb: () => void) => number) | undefined;
        const schedule = () => {
          isProcessing = false;
          // Add small delay to let React state settle
          setTimeout(step, 25);
        };

        if (typeof raf === 'function') raf(schedule);
        else setTimeout(schedule, 0);
      } else {
        isProcessing = false;
        const complete = () => {
          completeOperation(LOADING_OPERATIONS.WEEKLY_PROCESSING.id);
          weeklyProcessingRef.current = false;
        };
        const raf = (globalThis as any).requestAnimationFrame as ((cb: () => void) => number) | undefined;
        if (typeof raf === 'function') raf(complete);
        setTimeout(complete, 0);
        toast({
          title: 'Time Advanced',
          description: `Advanced ${totalWeeks} weeks → Week ${targetWeek}, ${targetYear}`,
        });
      }
    };

    const raf = (globalThis as any).requestAnimationFrame as ((cb: () => void) => number) | undefined;
    if (typeof raf === 'function') raf(step);
    else setTimeout(step, 0);
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

  const currentAbsWeekUi = (gameState.currentYear * 52) + gameState.currentWeek;
  const lastSaveAbsWeekUi = lastManualSaveAbsWeekRef.current ?? currentAbsWeekUi;
  const weeksSinceLastSaveUi = Math.max(0, currentAbsWeekUi - lastSaveAbsWeekUi);

  const returnToMainMenu = useCallback(() => {
    useGameStore.setState({
      game: null,
      rng: null,
      seed: 0,
      initialized: false,
      lastTickReport: null,
      tickHistory: [],
    });

    if (onReturnToMainMenu) {
      onReturnToMainMenu();
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = isOnlineMode ? '/online' : '/';
    }
  }, [isOnlineMode, onReturnToMainMenu]);

  const handleExitWithoutSaving = () => {
    setExitToMenuOpen(false);
    returnToMainMenu();
  };

  const handleSaveAndExit = async () => {
    const ok = await handleSaveGame();
    if (!ok) {
      setExitToMenuOpen(true);
      return;
    }

    setExitToMenuOpen(false);
    returnToMainMenu();
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
      <AlertDialog open={exitToMenuOpen} onOpenChange={setExitToMenuOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return to main menu?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved progress will be lost.
              {weeksSinceLastSaveUi > 0 ? ` It’s been ${weeksSinceLastSaveUi} week${weeksSinceLastSaveUi === 1 ? '' : 's'} since your last save.` : ''}
              {lastSavedAtIso ? ` Last save: ${new Date(lastSavedAtIso).toLocaleString()}` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleExitWithoutSaving}
            >
              Exit without saving
            </AlertDialogAction>
            <AlertDialogAction onClick={() => { void handleSaveAndExit(); }}>
              Save & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                onClick={() => { void handleSaveGame(); }}
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
                onClick={() => setExitToMenuOpen(true)}
              >
                <Home className="mr-2" size={16} />
                Main Menu
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
                  id: nextNumericId('script', gameState.scripts.map((s) => s.id)),
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
                  id: nextNumericId('script', gameState.scripts.map((s) => s.id)),
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
                // Route sequel scripts to the appropriate development screen for refinement.
                const toTv = isTvScript(script);

                setSelectedFranchise(script.franchiseId || null);
                setSelectedPublicDomain(null);
                handlePhaseChange(toTv ? 'television' : 'scripts');

                upsertScript(script);

                toast({
                  title: 'Sequel Script Created',
                  description: toTv
                    ? `"${script.title}" has been added to TV Show Development. Refine it to "final" stage before greenlighting.`
                    : `"${script.title}" has been added to Script Development. Refine it to "final" stage before greenlighting.`,
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

      <GameEventModal
        onChoice={(event, choiceId) => {
          const kind = (event as any)?.data?.kind;
          if (kind !== 'awards:ceremony') return;
          if (choiceId !== 'watch') return;

          const showId = (event as any)?.data?.showId as string | undefined;
          const year = (event as any)?.data?.year as number | undefined;
          if (!showId || !year) return;

          const ceremony = buildAwardShowCeremonyForModal(gameState, showId, year);
          if (!ceremony) return;
          handleAwardShow(ceremony);
        }}
      />

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
