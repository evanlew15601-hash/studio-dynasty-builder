import { GameLanding } from '@/components/game/GameLanding';
import { SaveLoadDialog } from '@/components/game/SaveLoadDialog';
import { GlobalLoadingOverlay } from '@/components/ui/global-loading-overlay';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AUTO_LOAD_SLOT_KEY, loadGameAsync, type SaveGameSnapshot } from '@/utils/saveLoad';
import { patchLoadedSnapshot } from '@/utils/snapshotPatches';
import { useToast } from '@/hooks/use-toast';
import { getModMismatchWarning } from '@/utils/modFingerprint';
import { Genre } from '@/types/game';
import type { StudioIconConfig } from '@/components/game/StudioIconCustomizer';

const StudioMagnatetype GameConfig =     studioName: string;
  specialties: Genre[];
  difficulty: 'easy' | 'normal' | 'hard' | 'magnate'ty  startingBudget:   studio  studioIcon?:  specialties: Genr};

const Index = () => {
  const { toast } = useToast();
  const modWarningShownRef = useRef(false);
  const [gameStartedconst Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [loadedSnapshot, setLoadedSnapshot] = useState<SaveGameSnapshot | null>(null);
  const [saveDialogOpe  const handleStartGame = (config: GameCo
  const ha    // Starting a fresh game clears any lo    // Startin    setLoadedSnapshot(null);
    setGameConfig(config);
    setGameStarted(true);
  };

  const handleLoadGame = () => {
    setSaveDialogOpen(true);
  };

  const handleLoadedSnapshot = (snapshot: SaveGameSnapshot) => {
    const warning = getModMismatchWarning(snapshot.meta);
    if (warning && !modWarningShownRef.current) {
      modWarningShownRef.current = true;
      toast({
        title: 'Mod mismatch',
        description: warning,
        variant: 'destructive',
      });
    }

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
      const warning = getModMismatchWarning(snapshot.meta);
      if (warning && !modWarningShownRef.current) {
        modWarningShownRef.current = true;
        toast({
          title: 'Mod mismatch',
          description: warning,
          variant: 'destructive',
        });
      }

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
gProvider>
  );
};

export default Index;
