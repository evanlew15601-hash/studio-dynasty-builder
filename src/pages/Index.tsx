import { GameLanding } from '@/components/game/GameLanding';
import { GlobalLoadingOverlay } from '@/components/ui/global-loading-overlay';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { Suspense, lazy, useState } from 'react';
import { loadGameAsync, SaveGameSnapshot } from '@/utils/saveLoad';
import { Genre } from '@/types/game';
import type { StudioIconConfig } from '@/components/game/StudioIconCustomizer';
import { useLoadingActions } from '@/contexts/LoadingContext';
import { LOADING_OPERATIONS, delay } from '@/utils/loadingUtils';

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
    // Starting a fresh game clears any loaded snapshot
    setLoadedSnapshot(null);
    setGameConfig(config);
    setGameStarted(true);
  };

  const handleLoadGame = async () => {
    startOperation(LOADING_OPERATIONS.SNAPSHOT_LOAD.id, LOADING_OPERATIONS.SNAPSHOT_LOAD.name, LOADING_OPERATIONS.SNAPSHOT_LOAD.estimatedTime);

    try {
      updateOperation(LOADING_OPERATIONS.SNAPSHOT_LOAD.id, 10, 'Reading save...');
      await delay(0);

      const snapshot = await loadGameAsync('slot1');

      if (!snapshot) {
        // Basic fallback messaging; main toasts live inside the game shell
        // so we keep this simple on the landing screen.
        if (typeof window !== 'undefined') {
          window.alert('No saved game found in this browser yet. Start a new game first, then use the in-game Save button.');
        }
        return;
      }

      updateOperation(LOADING_OPERATIONS.SNAPSHOT_LOAD.id, 100, 'Loaded');
      setLoadedSnapshot(snapshot);
      setGameConfig(null);
      setGameStarted(true);
    } finally {
      // Always clear the read overlay; StudioMagnateGame will show a second phase while it hydrates.
      completeOperation(LOADING_OPERATIONS.SNAPSHOT_LOAD.id);
    }
  };

  return (
    <>
      <GlobalLoadingOverlay />
      {!gameStarted ? (
        <GameLanding onStartGame={handleStartGame} onLoadGame={handleLoadGame} />
      ) : (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading game...</div>}>
          <StudioMagnateGame
            gameConfig={gameConfig ?? undefined}
            initialGameState={loadedSnapshot?.gameState}
            initialPhase={loadedSnapshot?.meta.currentPhase}
            initialUnlockedAchievements={loadedSnapshot?.unlockedAchievements}
          />
        </Suspense>
      )}
    </>
  );
};

const Index = () => (
  <LoadingProvider>
    <IndexInner />
  </LoadingProvider>
);

export default Index;
