// Update this page (the content is just a fallback if you fail to update the page)

import { GameLanding } from '@/components/game/GameLanding';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { Suspense, lazy, useState } from 'react';
import { loadGame, SaveGameSnapshot } from '@/utils/saveLoad';
import { Genre } from '@/types/game';
import { getModBundle } from '@/utils/moddingStore';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';

const StudioMagnateGame = lazy(() =>
  import('@/components/game/StudioMagnateGame').then((m) => ({ default: m.StudioMagnateGame }))
);

type GameConfig = {
  studioName: string;
  specialties: Genre[];
  difficulty: 'easy' | 'normal' | 'hard' | 'magnate';
  startingBudget: number;
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

  const handleLoadGame = () => {
    const snapshot = loadGame('slot1');

    if (!snapshot) {
      // Basic fallback messaging; main toasts live inside the game shell
      // so we keep this simple on the landing screen.
      if (typeof window !== 'undefined') {
        window.alert('No saved game found in this browser yet. Start a new game first, then use the in-game Save button.');
      }
      return;
    }

    const mods = getModBundle();

    const patchedGameState = {
      ...snapshot.gameState,
      talent: applyPatchesByKey(snapshot.gameState.talent || [], getPatchesForEntity(mods, 'talent'), (t) => t.id),
      franchises: applyPatchesByKey(snapshot.gameState.franchises || [], getPatchesForEntity(mods, 'franchise'), (f) => f.id),
      publicDomainIPs: applyPatchesByKey(
        snapshot.gameState.publicDomainIPs || [],
        getPatchesForEntity(mods, 'publicDomainIP'),
        (p) => p.id
      ),
    };

    setLoadedSnapshot({ ...snapshot, gameState: patchedGameState });
    setGameConfig(null);
    setGameStarted(true);
  };

  return (
    <LoadingProvider>
      {!gameStarted ? (
        <GameLanding 
          onStartGame={handleStartGame}
          onLoadGame={handleLoadGame}
        />
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
