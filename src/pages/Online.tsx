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

function generateLeagueCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 7; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

const Online = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [loadedSnapshot, setLoadedSnapshot] = useState<SaveGameSnapshot | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [onlineLeagueCode, setOnlineLeagueCode] = useState('');
  const [onlineHostSync, setOnlineHostSync] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const last = window.localStorage.getItem('studio-magnate-online-last-league');
    if (last) setOnlineLeagueCode(last);

    const hostSync = window.localStorage.getItem('studio-magnate-online-host-sync');
    if (hostSync) setOnlineHostSync(hostSync === '1');
  }, []);

  const handleStartGame = (config: GameConfig) => {
    setLoadedSnapshot(null);
    setGameConfig(config);
    setGameStarted(true);
  };

  const handleLeagueCodeChange = (code: string) => {
    setOnlineLeagueCode(code);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studio-magnate-online-last-league', code);
    }
  };

  const handleLoadGame = () => {
    setSaveDialogOpen(true);
  };

  const handleLoadedSnapshot = (snapshot: SaveGameSnapshot) => {
    const patched = patchLoadedSnapshot(snapshot, { mode: 'online' });
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
      const patched = patchLoadedSnapshot(snapshot, { mode: 'online' });
      setLoadedSnapshot(patched);
      setGameConfig(null);
      setGameStarted(true);
    })();
  }, [gameStarted]);

  const handleGenerateLeagueCode = () => {
    const next = generateLeagueCode();
    setOnlineLeagueCode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studio-magnate-online-last-league', next);
    }
  };

  const handleOnlineHostSyncChange = (enabled: boolean) => {
    setOnlineHostSync(enabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studio-magnate-online-host-sync', enabled ? '1' : '0');
    }
  };

  return (
    <LoadingProvider>
      <GlobalLoadingOverlay />
      {!gameStarted ? (
        <>
          <GameLanding
            mode="online"
            onlineLeagueCode={onlineLeagueCode}
            onOnlineLeagueCodeChange={handleLeagueCodeChange}
            onGenerateOnlineLeagueCode={handleGenerateLeagueCode}
            onlineHostSync={onlineHostSync}
            onOnlineHostSyncChange={handleOnlineHostSyncChange}
            onStartGame={handleStartGame}
            onLoadGame={handleLoadGame}
          />
          <SaveLoadDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            mode="online"
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
            onlineLeagueCode={onlineLeagueCode.trim()}
            onlineHostSync={onlineHostSync}
          />
        </Suspense>
      )}
    </LoadingProvider>
  );
};

export default Online;
