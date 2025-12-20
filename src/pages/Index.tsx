// Update this page (the content is just a fallback if you fail to update the page)

import { StudioMagnateGame } from '@/components/game/StudioMagnateGame';
import { GameLanding } from '@/components/game/GameLanding';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { useState } from 'react';
import { loadGame, SaveGameSnapshot } from '@/utils/saveLoad';

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState<any>(null);
  const [loadedSnapshot, setLoadedSnapshot] = useState<SaveGameSnapshot | null>(null);

  const handleStartGame = (config: any) => {
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

    setLoadedSnapshot(snapshot);
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
        <StudioMagnateGame 
          gameConfig={gameConfig} 
          initialGameState={loadedSnapshot?.gameState}
        />
      )}
    </LoadingProvider>
  );
};

export default Index;
