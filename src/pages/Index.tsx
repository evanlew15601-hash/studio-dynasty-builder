import { GameLanding } from '@/components/game/GameLanding';
import { GlobalLoadingOverlay } from '@/components/ui/global-loading-overlay';
import { LoadingProvider, useLoadingActions } from '@/contexts/LoadingContext';
import { Suspense, lazy, useState } from 'react';
import { loadGameAsync, SaveGameSnapshot } from '@/utils/saveLoad';
import { ensureGameStateRoleGenders, ensureTalentDemographics } from '@/utils/demographics';
import { ensureGameStateFictionalAwardNames } from '@/utils/awardsNaming';
import { ensureCompetitorStudiosLore } from '@/utils/competitorStudiosPatches';
import { ensureTalentLore } from '@/utils/talentLorePatches';
import { primeCompetitorTelevision } from '@/utils/televisionPatches';
import { Genre } from '@/types/game';
import type { StudioIconConfig } from '@/components/game/StudioIconCustomizer';
import { getModBundle } from '@/utils/moddingStore';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';
import { LOADING_OPERATIONS } from '@/utils/loadingUtils';

const StudioMagnateGame = lazy(() =>
  import('@/components/game/StudioMagnateGame').then((m) => ({ default: m.StudioMagnateGame }))
);

type GameConfig = {
  studioName: string;
  specialties: Genre[];
  difficulty: 'easy' | 'normal' | 'hard' | 'magnate';
  startingBudget: number;
  studioIcon?: StudioIconConfig;
};

const IndexInner = () => {
  const { startOperation, updateOperation, completeOperation } = useLoadingActions();

  const [gameStarted, setGameStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [loadedSnapshot, setLoadedSnapshot] = useState<SaveGameSnapshot | null>(null);

  const handleStartGame = (config: GameConfig) => {
    startOperation(
      LOADING_OPERATIONS.GAME_SHELL_LOAD.id,
      LOADING_OPERATIONS.GAME_SHELL_LOAD.name,
      LOADING_OPERATIONS.GAME_SHELL_LOAD.estimatedTime
    );
    updateOperation(LOADING_OPERATIONS.GAME_SHELL_LOAD.id, 5, 'Loading game files...');

    void (async () => {
      try {
        await import('@/components/game/StudioMagnateGame');

        // Starting a fresh game clears any loaded snapshot
        setLoadedSnapshot(null);
        setGameConfig(config);
        setGameStarted(true);
      } catch (e) {
        console.error('[Game Start] Failed to load game shell', e);
        completeOperation(LOADING_OPERATIONS.GAME_SHELL_LOAD.id);

        if (typeof window !== 'undefined') {
          window.alert('Failed to start the game. Please refresh and try again.');
        }
      }
    })();
  };

  const handleLoadGame = async () => {
    startOperation(
      LOADING_OPERATIONS.GAME_SHELL_LOAD.id,
      LOADING_OPERATIONS.GAME_SHELL_LOAD.name,
      LOADING_OPERATIONS.GAME_SHELL_LOAD.estimatedTime
    );
    updateOperation(LOADING_OPERATIONS.GAME_SHELL_LOAD.id, 10, 'Loading game files...');

    const gameModulePromise = import('@/components/game/StudioMagnateGame');

    try {
      updateOperation(LOADING_OPERATIONS.GAME_SHELL_LOAD.id, 20, 'Loading save...');
      const snapshot = await loadGameAsync('slot1');

      if (!snapshot) {
        completeOperation(LOADING_OPERATIONS.GAME_SHELL_LOAD.id);

        // Basic fallback messaging; main toasts live inside the game shell
        // so we keep this simple on the landing screen.
        if (typeof window !== 'undefined') {
          window.alert('No saved game found in this browser yet. Start a new game first, then use the in-game Save button.');
        }
        return;
      }

      updateOperation(LOADING_OPERATIONS.GAME_SHELL_LOAD.id, 50, 'Applying patches...');

      const mods = getModBundle();

      const patchedTalent = applyPatchesByKey(snapshot.gameState.talent || [], getPatchesForEntity(mods, 'talent'), (t) => t.id);

      const patchedGameState = primeCompetitorTelevision(
        ensureCompetitorStudiosLore(
          ensureTalentLore(
            ensureGameStateFictionalAwardNames(
              ensureGameStateRoleGenders({
                ...snapshot.gameState,
                talent: ensureTalentDemographics(patchedTalent),
                franchises: applyPatchesByKey(snapshot.gameState.franchises || [], getPatchesForEntity(mods, 'franchise'), (f) => f.id),
                publicDomainIPs: applyPatchesByKey(
                  snapshot.gameState.publicDomainIPs || [],
                  getPatchesForEntity(mods, 'publicDomainIP'),
                  (p) => p.id
                ),
              })
            )
          )
        )
      );

      updateOperation(LOADING_OPERATIONS.GAME_SHELL_LOAD.id, 85, 'Starting game...');
      await gameModulePromise;

      setLoadedSnapshot({ ...snapshot, gameState: patchedGameState });
      setGameConfig(null);
      setGameStarted(true);
    } catch (e) {
      console.error('[Load Game] Failed to load saved game', e);
      completeOperation(LOADING_OPERATIONS.GAME_SHELL_LOAD.id);

      if (typeof window !== 'undefined') {
        window.alert('Failed to load the saved game. Please try again.');
      }
    }
  };

  return !gameStarted ? (
    <GameLanding onStartGame={handleStartGame} onLoadGame={handleLoadGame} />
  ) : (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background font-studio flex items-center justify-center text-sm text-muted-foreground">
          Loading game...
        </div>
      }
    >
      <StudioMagnateGame
        gameConfig={gameConfig ?? undefined}
        initialGameState={loadedSnapshot?.gameState}
        initialPhase={loadedSnapshot?.meta.currentPhase}
        initialUnlockedAchievements={loadedSnapshot?.unlockedAchievements}
      />
    </Suspense>
  );
};

const Index = () => {
  return (
    <LoadingProvider>
      <GlobalLoadingOverlay />
      <IndexInner />
    </LoadingProvider>
  );
};

export default Index;
