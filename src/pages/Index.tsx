import { GameLanding } from '@/components/game/GameLanding';
import { GlobalLoadingOverlay } from '@/components/ui/global-loading-overlay';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { Suspense, lazy, useState } from 'react';
import { loadGameAsync, SaveGameSnapshot } from '@/utils/saveLoad';
import { Genre } from '@/types/game';
import type { StudioIconConfig } from '@/components/game/StudioIconCustomizer';

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

const Index = () => {
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
    const snapshot = await loadGameAsync('slot1');

    if (!snapshot) {
      // Basic fallback messaging; main toasts live inside the game shell
      // so we keep this simple on the landing screen.
      if (typeof window !== 'undefined') {
        window.alert('No saved game found in this browser yet. Start a new game first, then use the in-game Save button.');
      }
      return;
    }

    setLoadedSnapshot(snapshot);
    setGameConfig(null);
    setGameStarted(true);
  };

  return (
    <LoadingProvider>
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
    </LoadingProvider>
  );
};

export default Index;
