import { GameLanding } from '@/components/game/GameLanding';
import { SaveLoadDialog } from '@/components/game/SaveLoadDialog';
import { GlobalLoadingOverlay } from '@/components/ui/global-loading-overlay';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { Suspense, lazy, useEffect, useState } from 'react';
import { AUTO_LOAD_SLOT_KEY, loadGameAsync, type SaveGameSnapshot } from '@/utils/saveLoad';
import { patchLoadedSnapshot } from '@/utils/snapshotPatches';
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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const handleStartGame = (config: GameConfig) => {
    // Starting a fresh game clears any loaded snapshot
    setLoadedSnapshot(null);
    setGameConfig(config);
    setGameStarted(true);
  };

  const handleLoadGame = () => {
    setSaveDialogOpen(true);
  };

  const handleLoadedSnapshot = (snapshot: SaveGameSnapshot) => {
    const patched = patchLoadedSnapshot(snapshot, { mode: 'single' });
    setLoadedSnapshot(patched);
    setGameConfig(null);
    setGameStarted(true);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (gameStarted) return;

    const slot = window.localStorage.getItem(AUTO_LOAD_SLOT_KEY);
    if (!slot) return;

    window.localStorage.removeItem(AUTO_LOAD_SLOT_KEY);

    void (async () => {
      const snapshot = await loadGameAsync(slot);
      if (!snapshot) return;
      const patched = patchLoadedSnapshot(snapshot, { mode: 'single' });
      setLoadedSnapshot(patched);
      setGameConfig(null);
      setGameStarted(true);
    })();
  }, [gameStarted]);

  return (
    <LoadingProvider>
      <GlobalLoadingOverlay />
      {!gameStarted ? (
        <>
          <GameLanding onStartGame={handleStartGame} onLoadGame={handleLoadGame} />
          <SaveLoadDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            mode="single"
            onLoaded={handleLoadedSnapshot}
          />
        </>
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
