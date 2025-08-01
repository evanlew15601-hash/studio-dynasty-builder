// Update this page (the content is just a fallback if you fail to update the page)

import { StudioMagnateGame } from '@/components/game/StudioMagnateGame';
import { GameLanding } from '@/components/game/GameLanding';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { useState } from 'react';

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState<any>(null);

  const handleStartGame = (config: any) => {
    setGameConfig(config);
    setGameStarted(true);
  };

  const handleLoadGame = () => {
    // TODO: Implement save/load functionality
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
        <StudioMagnateGame gameConfig={gameConfig} />
      )}
    </LoadingProvider>
  );
};

export default Index;
